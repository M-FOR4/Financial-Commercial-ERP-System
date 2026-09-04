using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class ReportTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task SeedAccountsAndJournalEntries(AppDbContext db)
    {
        // Seed COA
        var accountingService = new AccountingService(db, NullLogger<AccountingService>.Instance);
        await accountingService.SeedDefaultChartOfAccountsAsync();

        // Get accounts
        var cashAcc = await db.Accounts.FirstAsync(a => a.Code == "1110"); // Asset
        var salesAcc = await db.Accounts.FirstAsync(a => a.Code == "4100"); // Revenue
        var cogsAcc = await db.Accounts.FirstAsync(a => a.Code == "5100"); // COGS

        // Post a journal entry: Debit Cash 5000, Credit Sales 5000
        var je1 = new JournalEntry
        {
            Id = Guid.NewGuid(),
            EntryNumber = "JE-TEST-001",
            EntryDate = DateTime.UtcNow.AddDays(-5),
            Description = "Cash Sale",
            Status = JournalEntryStatus.Posted,
            PostedAt = DateTime.UtcNow
        };
        je1.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = cashAcc.Id, Debit = 5000m, Credit = 0 });
        je1.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = salesAcc.Id, Debit = 0, Credit = 5000m });

        // Post COGS entry: Debit COGS 2000, Credit Inventory (Cash for simplicity)
        var je2 = new JournalEntry
        {
            Id = Guid.NewGuid(),
            EntryNumber = "JE-TEST-002",
            EntryDate = DateTime.UtcNow.AddDays(-3),
            Description = "COGS",
            Status = JournalEntryStatus.Posted,
            PostedAt = DateTime.UtcNow
        };
        je2.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = cogsAcc.Id, Debit = 2000m, Credit = 0 });
        je2.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = cashAcc.Id, Debit = 0, Credit = 2000m });

        db.JournalEntries.AddRange(je1, je2);
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task TrialBalance_ShouldBeBalanced()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        await SeedAccountsAndJournalEntries(db);
        var reportService = new ReportService(db);

        var request = new TrialBalanceRequest(
            FromDate: DateTime.UtcNow.AddDays(-30),
            ToDate: DateTime.UtcNow.AddDays(1)
        );

        // Act
        var result = await reportService.GetTrialBalanceAsync(request);

        // Assert
        Assert.NotEmpty(result.Lines);
        Assert.True(result.IsBalanced, $"Trial balance not balanced: Debit={result.TotalDebit}, Credit={result.TotalCredit}, Diff={Math.Abs(result.TotalDebit - result.TotalCredit)}");
        Assert.Equal(result.TotalDebit, result.TotalCredit, 2);

        // Cash account should have: Opening (0) + Debit (5000) - Credit (2000) = 3000 debit
        var cashLine = result.Lines.FirstOrDefault(l => l.AccountCode == "1110");
        Assert.NotNull(cashLine);
        Assert.Equal(3000m, cashLine.EndingDebit - cashLine.EndingCredit, 2);
    }

    [Fact]
    public async Task IncomeStatement_ShouldCalculateGrossProfitCorrectly()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        await SeedAccountsAndJournalEntries(db);
        var reportService = new ReportService(db);

        var request = new IncomeStatementRequest(
            FromDate: DateTime.UtcNow.AddDays(-30),
            ToDate: DateTime.UtcNow.AddDays(1)
        );

        // Act
        var result = await reportService.GetIncomeStatementAsync(request);

        // Assert
        Assert.Equal(5000m, result.Revenue.Total); // Revenue 5000
        Assert.Equal(2000m, result.CostOfGoodsSold.Total); // COGS 2000
        Assert.Equal(3000m, result.GrossProfit); // 5000 - 2000 = 3000
        Assert.Equal(0m, result.OperatingExpenses.Total); // No expenses seeded
        Assert.Equal(3000m, result.NetOperatingIncome); // 3000 - 0 = 3000
    }

    [Fact]
    public async Task BalanceSheet_ShouldValidateAccountingEquation()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        await SeedAccountsAndJournalEntries(db);
        var reportService = new ReportService(db);

        var request = new BalanceSheetRequest(AsOfDate: DateTime.UtcNow.AddDays(1));

        // Act
        var result = await reportService.GetBalanceSheetAsync(request);

        // Assert
        // Assets = Liabilities + Equity + Net Income
        // Cash = 3000 (from our entries)
        Assert.True(result.IsValid);
        Assert.Equal(result.Assets.Total, result.TotalLiabilitiesAndEquity, 2);
    }

    [Fact]
    public async Task DashboardKpis_ShouldReturnSummaryData()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        await SeedAccountsAndJournalEntries(db);
        var reportService = new ReportService(db);

        // Act
        var kpis = await reportService.GetDashboardKpisAsync();

        // Assert
        Assert.Equal(5000m, kpis.TotalRevenue);
        Assert.Equal(2000m, kpis.TotalExpenses);
        Assert.Equal(3000m, kpis.NetProfit);
    }

    [Fact]
    public async Task StockLedger_ShouldCalculateWeightedAverageCost()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();

        // Create a product and warehouse
        var category = new Category { Id = Guid.NewGuid(), Code = "CAT-01", Name = "Test Category", IsActive = true, CreatedAt = DateTime.UtcNow };
        db.Categories.Add(category);

        var product = new Product
        {
            Id = Guid.NewGuid(), SKU = "SKU-001", Name = "Widget", CategoryId = category.Id,
            UnitOfMeasure = "Piece", PurchasePrice = 10m, SellingPrice = 20m,
            CurrentStock = 0, MinStockLevel = 5, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        db.Products.Add(product);

        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(), Code = "WH-01", Name = "Main Warehouse",
            Location = "Tripoli", IsActive = true, CreatedAt = DateTime.UtcNow
        };
        db.Warehouses.Add(warehouse);

        // Add stock movements
        db.StockMovements.AddRange(
            new StockMovement
            {
                Id = Guid.NewGuid(), ProductId = product.Id, WarehouseId = warehouse.Id,
                MovementType = MovementType.In, Quantity = 100, UnitCost = 10m,
                MovementDate = DateTime.UtcNow.AddDays(-5), CreatedAt = DateTime.UtcNow
            },
            new StockMovement
            {
                Id = Guid.NewGuid(), ProductId = product.Id, WarehouseId = warehouse.Id,
                MovementType = MovementType.In, Quantity = 50, UnitCost = 12m,
                MovementDate = DateTime.UtcNow.AddDays(-3), CreatedAt = DateTime.UtcNow
            },
            new StockMovement
            {
                Id = Guid.NewGuid(), ProductId = product.Id, WarehouseId = warehouse.Id,
                MovementType = MovementType.Out, Quantity = 30, UnitCost = 10.67m,
                MovementDate = DateTime.UtcNow.AddDays(-1), CreatedAt = DateTime.UtcNow
            }
        );
        await db.SaveChangesAsync();

        var reportService = new ReportService(db);
        var request = new StockLedgerRequest(
            ProductId: product.Id,
            WarehouseId: warehouse.Id,
            FromDate: DateTime.UtcNow.AddDays(-30),
            ToDate: DateTime.UtcNow.AddDays(1)
        );

        // Act
        var result = await reportService.GetStockLedgerAsync(request);

        // Assert
        Assert.Equal("Widget", result.ProductName);
        Assert.Equal(3, result.Lines.Count);
        Assert.Equal(150m, result.TotalInbound); // 100 + 50
        Assert.Equal(30m, result.TotalOutbound);
        Assert.Equal(120m, result.EndingQuantity); // 150 - 30
    }
}
