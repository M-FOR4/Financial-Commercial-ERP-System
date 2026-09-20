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

        cashAcc.Balance = 3000m; // 5000 - 2000
        salesAcc.Balance = 5000m;
        cogsAcc.Balance = 2000m;

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

    [Fact]
    public async Task GeneralLedger_ShouldComputeOpeningMovementAndClosingBalances()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var accountingService = new AccountingService(db, NullLogger<AccountingService>.Instance);
        await accountingService.SeedDefaultChartOfAccountsAsync();

        var cash = await db.Accounts.FirstAsync(a => a.Code == "1110");   // Asset → debit nature
        var sales = await db.Accounts.FirstAsync(a => a.Code == "4100");  // Revenue → credit nature

        var today = DateTime.UtcNow.Date;
        var fromDate = today.AddDays(-5);
        var toDate = today;

        // Before the period: Dr Cash 1000 / Cr Sales 1000
        var openingEntry = new JournalEntry
        {
            Id = Guid.NewGuid(), EntryNumber = "JE-OPEN", EntryDate = today.AddDays(-10),
            Description = "Opening cash sale", Status = JournalEntryStatus.Posted,
            SourceDocumentType = "SalesInvoice", PostedAt = today.AddDays(-10)
        };
        openingEntry.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = cash.Id, Debit = 1000m, Credit = 0m });
        openingEntry.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = sales.Id, Debit = 0m, Credit = 1000m });

        // Inside the period: Dr Cash 400 / Cr Sales 400
        var periodEntry = new JournalEntry
        {
            Id = Guid.NewGuid(), EntryNumber = "JE-001", EntryDate = today.AddDays(-2),
            Description = "Period cash sale", Status = JournalEntryStatus.Posted,
            SourceDocumentType = "SalesInvoice", PostedAt = today.AddDays(-2)
        };
        periodEntry.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = cash.Id, Debit = 400m, Credit = 0m });
        periodEntry.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = sales.Id, Debit = 0m, Credit = 400m });

        // Draft entry inside the period — must NOT appear in the ledger
        var draftEntry = new JournalEntry
        {
            Id = Guid.NewGuid(), EntryNumber = "JE-DRAFT", EntryDate = today.AddDays(-1),
            Description = "Unposted draft", Status = JournalEntryStatus.Draft
        };
        draftEntry.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = cash.Id, Debit = 9999m, Credit = 0m });
        draftEntry.Lines.Add(new JournalEntryLine { Id = Guid.NewGuid(), AccountId = sales.Id, Debit = 0m, Credit = 9999m });

        db.JournalEntries.AddRange(openingEntry, periodEntry, draftEntry);
        await db.SaveChangesAsync();

        var reportService = new ReportService(db);

        // Act — cash (Asset, debit nature)
        var cashLedger = await reportService.GetGeneralLedgerAsync(new GeneralLedgerRequest(cash.Id, fromDate, toDate));

        // Assert
        Assert.Equal("1110", cashLedger.AccountCode);
        Assert.Equal("Debit", cashLedger.BalanceNature);
        Assert.Equal(1000m, cashLedger.OpeningBalance); // carried from before the period
        Assert.Equal(400m, cashLedger.TotalDebit);
        Assert.Equal(0m, cashLedger.TotalCredit);
        Assert.Equal(1400m, cashLedger.ClosingBalance);
        Assert.Single(cashLedger.Lines); // the draft entry is excluded
        Assert.Equal(1400m, cashLedger.Lines[0].RunningBalance);
        Assert.Equal("JE-001", cashLedger.Lines[0].EntryNumber);
        Assert.Equal("SalesInvoice", cashLedger.Lines[0].SourceDocumentType);
        Assert.Contains("4100", cashLedger.Lines[0].CounterpartAccount);

        // Act — sales (Revenue, credit nature): a credit balance reads positive
        var salesLedger = await reportService.GetGeneralLedgerAsync(new GeneralLedgerRequest(sales.Id, fromDate, toDate));

        // Assert
        Assert.Equal("Credit", salesLedger.BalanceNature);
        Assert.Equal(1000m, salesLedger.OpeningBalance);
        Assert.Equal(0m, salesLedger.TotalDebit);
        Assert.Equal(400m, salesLedger.TotalCredit);
        Assert.Equal(1400m, salesLedger.ClosingBalance);
    }

    [Fact]
    public async Task GeneralLedger_ShouldRejectUnknownAccount()
    {
        using var db = CreateInMemoryDbContext();
        var reportService = new ReportService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            reportService.GetGeneralLedgerAsync(new GeneralLedgerRequest(Guid.NewGuid(), DateTime.UtcNow.AddDays(-1), DateTime.UtcNow)));
    }
}
