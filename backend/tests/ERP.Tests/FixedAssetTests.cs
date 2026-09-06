using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class FixedAssetTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(AssetCategory category, Account assetAcc, Account accumAcc, Account deprExpAcc)> SeedCategoryAndAccounts(AppDbContext db)
    {
        var assetAcc = new Account
        {
            Id = Guid.NewGuid(), Code = "1210", Name = "Property, Plant & Equipment",
            Type = AccountType.Asset, IsHeader = false, Balance = 0, IsActive = true
        };
        var accumAcc = new Account
        {
            Id = Guid.NewGuid(), Code = "1220", Name = "Accumulated Depreciation",
            Type = AccountType.Asset, IsHeader = false, Balance = 0, IsActive = true
        };
        var deprExpAcc = new Account
        {
            Id = Guid.NewGuid(), Code = "5400", Name = "Depreciation Expense",
            Type = AccountType.Expense, IsHeader = false, Balance = 0, IsActive = true
        };
        var cashAcc = new Account
        {
            Id = Guid.NewGuid(), Code = "1110", Name = "Cash on Hand",
            Type = AccountType.Asset, IsHeader = false, Balance = 100000m, IsActive = true
        };
        // Additional accounts needed for disposal logic
        var otherIncomeAcc = new Account
        {
            Id = Guid.NewGuid(), Code = "4200", Name = "Other Income",
            Type = AccountType.Revenue, IsHeader = false, Balance = 0, IsActive = true
        };
        var adminExpAcc = new Account
        {
            Id = Guid.NewGuid(), Code = "5500", Name = "General & Administrative",
            Type = AccountType.Expense, IsHeader = false, Balance = 0, IsActive = true
        };

        db.Accounts.AddRange(assetAcc, accumAcc, deprExpAcc, cashAcc, otherIncomeAcc, adminExpAcc);
        await db.SaveChangesAsync();

        var category = new AssetCategory
        {
            Id = Guid.NewGuid(),
            Code = "CAT-01",
            Name = "Office Equipment",
            AssetAccountId = assetAcc.Id,
            AccumulatedDepreciationAccountId = accumAcc.Id,
            DepreciationExpenseAccountId = deprExpAcc.Id,
            DefaultUsefulLifeYears = 5,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.AssetCategories.Add(category);
        await db.SaveChangesAsync();

        var fiscalYear = new FiscalYear
        {
            Id = Guid.NewGuid(),
            CompanyId = category.CompanyId,
            Name = "FY 2026",
            StartDate = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2030, 12, 31, 23, 59, 59, DateTimeKind.Utc),
            IsActive = true
        };
        db.FiscalYears.Add(fiscalYear);
        await db.SaveChangesAsync();

        return (category, assetAcc, accumAcc, deprExpAcc);
    }

    [Fact]
    public async Task SLMDepreciation_ShouldCalculateCorrectAmounts()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (category, assetAcc, accumAcc, deprExpAcc) = await SeedCategoryAndAccounts(db);

        var assetService = new FixedAssetService(db);
        var registerRequest = new FixedAssetRequest(
            AssetCode: "FA-001",
            Name: "Office Computer",
            CategoryId: category.Id,
            PurchaseDate: DateTime.UtcNow.AddMonths(-12),
            PurchaseCost: 12000m,
            SalvageValue: 2000m,
            UsefulLifeYears: 5
        );

        var asset = await assetService.CreateFixedAssetAsync(registerRequest);

        // Act: Run 1 month of depreciation
        var deprResult = await assetService.RunDepreciationAsync(new DepreciationRunRequest(
            PeriodStartDate: DateTime.UtcNow.AddDays(-30),
            PeriodEndDate: DateTime.UtcNow
        ));

        // Assert
        // SLM: Annual = (12000 - 2000) / 5 = 2000, Monthly = 2000 / 12 = 166.67
        Assert.Equal(1, deprResult.AssetsProcessed);
        Assert.Equal(1, deprResult.Items.Count);

        var item = deprResult.Items[0];
        Assert.Equal("FA-001", item.AssetCode);
        Assert.True(item.DepreciationAmount > 160m && item.DepreciationAmount < 170m,
            $"Expected ~166.67 but got {item.DepreciationAmount}");

        // Book value should decrease
        var updatedAsset = await db.FixedAssets.FindAsync(asset.Id);
        Assert.NotNull(updatedAsset);
        Assert.True(updatedAsset.CurrentBookValue < 12000m);
        Assert.Equal(AssetStatus.Active, updatedAsset.Status);
    }

    [Fact]
    public async Task Depreciation_ShouldPostJournalEntry()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (category, assetAcc, accumAcc, deprExpAcc) = await SeedCategoryAndAccounts(db);

        var assetService = new FixedAssetService(db);
        await assetService.CreateFixedAssetAsync(new FixedAssetRequest(
            AssetCode: "FA-002", Name: "Printer",
            CategoryId: category.Id, PurchaseDate: DateTime.UtcNow.AddDays(-60),
            PurchaseCost: 5000m, SalvageValue: 500m, UsefulLifeYears: 5
        ));

        // Act
        var deprResult = await assetService.RunDepreciationAsync(new DepreciationRunRequest(
            PeriodStartDate: DateTime.UtcNow.AddDays(-30),
            PeriodEndDate: DateTime.UtcNow
        ));

        // Assert: Journal entry should have been created
        Assert.True(deprResult.Items.Count > 0);
        var jeId = deprResult.Items[0].JournalEntryId;
        var je = await db.JournalEntries.FindAsync(jeId);
        Assert.NotNull(je);
        Assert.Equal(JournalEntryStatus.Posted, je.Status);
        Assert.True(je.Lines.Count >= 2, "Journal entry should have at least 2 lines (debit expense, credit accum depr)");
    }

    [Fact]
    public async Task FullDepreciation_ShouldMarkAssetAsFullyDepreciated()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (category, _, _, _) = await SeedCategoryAndAccounts(db);

        var assetService = new FixedAssetService(db);
        await assetService.CreateFixedAssetAsync(new FixedAssetRequest(
            AssetCode: "FA-003", Name: "Short Life Asset",
            CategoryId: category.Id, PurchaseDate: DateTime.UtcNow.AddMonths(-5),
            PurchaseCost: 1200m, SalvageValue: 0m, UsefulLifeYears: 1
        ));

        // Act: Run 12 months of depreciation (should fully depreciate)
        var deprResult = await assetService.RunDepreciationAsync(new DepreciationRunRequest(
            PeriodStartDate: DateTime.UtcNow.AddMonths(-12),
            PeriodEndDate: DateTime.UtcNow
        ));

        // Assert
        var asset = await db.FixedAssets.FirstAsync(a => a.AssetCode == "FA-003");
        Assert.Equal(AssetStatus.FullyDepreciated, asset.Status);
        Assert.True(asset.CurrentBookValue <= asset.SalvageValue + 0.01m);
    }

    [Fact]
    public async Task AssetDisposal_ShouldCalculateGainOrLoss()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (category, assetAcc, accumAcc, deprExpAcc) = await SeedCategoryAndAccounts(db);

        var assetService = new FixedAssetService(db);
        await assetService.CreateFixedAssetAsync(new FixedAssetRequest(
            AssetCode: "FA-004", Name: "Disposal Test Asset",
            CategoryId: category.Id, PurchaseDate: DateTime.UtcNow.AddMonths(-24),
            PurchaseCost: 10000m, SalvageValue: 1000m, UsefulLifeYears: 5
        ));

        // Run 12 months depreciation
        await assetService.RunDepreciationAsync(new DepreciationRunRequest(
            PeriodStartDate: DateTime.UtcNow.AddMonths(-12),
            PeriodEndDate: DateTime.UtcNow
        ));

        var asset = await db.FixedAssets.FirstAsync(a => a.AssetCode == "FA-004");
        var bookValueBeforeDisposal = asset.CurrentBookValue;

        // Act: Dispose for 3000 (gain expected since book value should be ~8000)
        var disposal = await assetService.DisposeAssetAsync(asset.Id, new AssetDisposalRequest(
            DisposalValue: 3000m,
            Description: "Sold to recycler"
        ));

        // Assert
        Assert.True(disposal.GainOrLoss != 0, "Disposal should have a gain or loss");
        Assert.NotEqual(Guid.Empty, disposal.JournalEntryId);
        Assert.False(string.IsNullOrEmpty(disposal.JournalEntryNumber));

        // Verify the asset is marked disposed
        var disposedAsset = await db.FixedAssets.FindAsync(asset.Id);
        Assert.Equal(AssetStatus.Disposed, disposedAsset!.Status);
    }
}
