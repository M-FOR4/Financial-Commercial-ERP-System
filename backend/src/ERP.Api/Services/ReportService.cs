using ERP.Api.Data;
using ERP.Api.DTOs;
using ERP.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db)
    {
        _db = db;
    }

    // ═══════════════════════════════════
    //  TRIAL BALANCE
    // ═══════════════════════════════════

    public async Task<TrialBalanceResponse> GetTrialBalanceAsync(TrialBalanceRequest request)
    {
        var allAccounts = await _db.Accounts
            .Where(a => !a.IsHeader && a.IsActive)
            .OrderBy(a => a.Code)
            .AsNoTracking()
            .ToListAsync();

        // Pre-load posted journal entry IDs for the relevant date ranges
        var allPostedJEIds = await _db.JournalEntries
            .Where(je => je.Status == JournalEntryStatus.Posted)
            .Select(je => new { je.Id, je.EntryDate })
            .AsNoTracking()
            .ToListAsync();

        var beforeIds = allPostedJEIds.Where(je => je.EntryDate < request.FromDate).Select(je => je.Id).ToHashSet();
        var periodIds = allPostedJEIds.Where(je => je.EntryDate >= request.FromDate && je.EntryDate <= request.ToDate).Select(je => je.Id).ToHashSet();

        // Pre-load all relevant journal entry lines grouped by account
        var allRelevantLines = await _db.JournalEntryLines
            .Where(jel => beforeIds.Contains(jel.JournalEntryId) || periodIds.Contains(jel.JournalEntryId))
            .AsNoTracking()
            .ToListAsync();

        var linesByAccount = allRelevantLines.GroupBy(jel => jel.AccountId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var lines = new List<TrialBalanceLineDto>();
        decimal totalDebit = 0, totalCredit = 0;

        foreach (var account in allAccounts)
        {
            if (!linesByAccount.TryGetValue(account.Id, out var acctLines))
                continue;

            var openingDebit = acctLines.Where(l => beforeIds.Contains(l.JournalEntryId)).Sum(l => l.Debit);
            var openingCredit = acctLines.Where(l => beforeIds.Contains(l.JournalEntryId)).Sum(l => l.Credit);

            var movementDebit = acctLines.Where(l => periodIds.Contains(l.JournalEntryId)).Sum(l => l.Debit);
            var movementCredit = acctLines.Where(l => periodIds.Contains(l.JournalEntryId)).Sum(l => l.Credit);

            var openingNet = openingDebit - openingCredit;
            var movementNet = movementDebit - movementCredit;
            var endingNet = openingNet + movementNet;

            decimal endingDebit, endingCredit;
            if (endingNet >= 0)
            {
                endingDebit = endingNet;
                endingCredit = 0;
            }
            else
            {
                endingDebit = 0;
                endingCredit = -endingNet;
            }

            if (endingDebit == 0 && endingCredit == 0 && movementDebit == 0 && movementCredit == 0
                && openingDebit == 0 && openingCredit == 0)
                continue;

            lines.Add(new TrialBalanceLineDto(
                account.Code, account.Name, account.Type,
                openingDebit, openingCredit,
                movementDebit, movementCredit,
                endingDebit, endingCredit
            ));

            totalDebit += endingDebit;
            totalCredit += endingCredit;
        }

        return new TrialBalanceResponse(
            request.FromDate, request.ToDate,
            lines,
            totalDebit, totalCredit,
            Math.Abs(totalDebit - totalCredit) < 0.01m
        );
    }

    // ═══════════════════════════════════
    //  INCOME STATEMENT (P&L)
    // ═══════════════════════════════════

    public async Task<IncomeStatementResponse> GetIncomeStatementAsync(IncomeStatementRequest request)
    {
        var fromDate = DateTime.SpecifyKind(request.FromDate, DateTimeKind.Utc);
        var toDate = DateTime.SpecifyKind(request.ToDate, DateTimeKind.Utc);
        // Revenue accounts (4xxx): Credit normal → net credit = revenue amount
        var revenueData = await GetAccountDebitCreditTotalsAsync(fromDate, toDate, AccountType.Revenue);
        var totalRevenue = revenueData.Sum(r => r.Credit - r.Debit);
        var revenueLines = revenueData.Where(r => r.Credit - r.Debit != 0)
            .Select(r => new IncomeStatementLineDto(r.Code, r.Name, r.Credit - r.Debit)).ToList();

        // COGS / Cost of Sales accounts (5xxx): Debit normal
        var cogsData = await GetAccountDebitCreditTotalsAsync(fromDate, toDate, AccountType.Expense, "5");
        var totalCogs = cogsData.Sum(r => r.Debit - r.Credit);
        var cogsLines = cogsData.Where(r => r.Debit - r.Credit != 0)
            .Select(r => new IncomeStatementLineDto(r.Code, r.Name, r.Debit - r.Credit)).ToList();

        // Other Operating Expenses (6xxx, 7xxx, 8xxx)
        var expenseData = await GetAccountDebitCreditTotalsAsync(fromDate, toDate, AccountType.Expense, null, "5");
        var totalExpenses = expenseData.Sum(r => r.Debit - r.Credit);
        var expenseLines = expenseData.Where(r => r.Debit - r.Credit != 0)
            .Select(r => new IncomeStatementLineDto(r.Code, r.Name, r.Debit - r.Credit)).ToList();

        var grossProfit = totalRevenue - totalCogs;
        var netOperatingIncome = grossProfit - totalExpenses;

        return new IncomeStatementResponse(
            fromDate, toDate,
            new IncomeStatementSectionDto("Revenue", revenueLines.OrderByDescending(l => l.Amount).ToList(), totalRevenue),
            new IncomeStatementSectionDto("Cost of Goods Sold", cogsLines.OrderByDescending(l => l.Amount).ToList(), totalCogs),
            grossProfit,
            new IncomeStatementSectionDto("Operating Expenses", expenseLines.OrderByDescending(l => l.Amount).ToList(), totalExpenses),
            netOperatingIncome
        );
    }

    // ═══════════════════════════════════
    //  BALANCE SHEET
    // ═══════════════════════════════════

    public async Task<BalanceSheetResponse> GetBalanceSheetAsync(BalanceSheetRequest request)
    {
        var asOfDate = DateTime.SpecifyKind(request.AsOfDate, DateTimeKind.Utc).AddDays(1); // Up to and including the date
        var rawAsOf = DateTime.SpecifyKind(request.AsOfDate, DateTimeKind.Utc);

        // Assets (1xxx)
        var assetLines = await GetAccountBalanceAsOfAsync(asOfDate, AccountType.Asset);
        var totalAssets = assetLines.Sum(l => l.Balance);

        // Liabilities (2xxx)
        var liabilityLines = await GetAccountBalanceAsOfAsync(asOfDate, AccountType.Liability);
        var totalLiabilities = liabilityLines.Sum(l => l.Balance);

        // Equity (3xxx) — permanent capital
        var equityLines = await GetAccountBalanceAsOfAsync(asOfDate, AccountType.Equity);
        var totalEquity = equityLines.Sum(l => l.Balance);

        // Current Year Net Income = Revenue - Expenses for the current year
        var currentYearStart = new DateTime(asOfDate.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var revenueTotal = await GetNetTotalForPeriodAsync(currentYearStart, rawAsOf, AccountType.Revenue);
        var expenseTotal = await GetNetTotalForPeriodAsync(currentYearStart, rawAsOf, AccountType.Expense);
        var currentYearNetIncome = revenueTotal - expenseTotal;

        var totalLiabilitiesAndEquity = totalLiabilities + totalEquity + currentYearNetIncome;

        return new BalanceSheetResponse(
            request.AsOfDate,
            new BalanceSheetSectionDto("Assets", assetLines, totalAssets),
            new BalanceSheetSectionDto("Liabilities", liabilityLines, totalLiabilities),
            new BalanceSheetSectionDto("Equity", equityLines, totalEquity),
            currentYearNetIncome,
            totalLiabilitiesAndEquity,
            Math.Abs(totalAssets - totalLiabilitiesAndEquity) < 0.01m
        );
    }

    // ═══════════════════════════════════
    //  ACCOUNT / PARTY STATEMENT
    // ═══════════════════════════════════

    public async Task<AccountStatementResponse> GetAccountStatementAsync(AccountStatementRequest request)
    {
        string partyName = "", partyCode = "";
        decimal openingBalance = 0;

        // Get all posted journal entries for the party's GL account in the date range
        // First, determine which GL account(s) to use based on party type
        var entries = new List<StatementLineDto>();

        if (request.PartyType == "Customer")
        {
            var customer = await _db.Customers.FindAsync(request.PartyId)
                ?? throw new InvalidOperationException("Customer not found.");
            partyName = customer.Name;
            partyCode = customer.Code;

            // Find all invoices, vouchers, returns for this customer
            var invoices = await _db.SalesInvoices
                .Where(si => si.CustomerId == request.PartyId && si.Status == JournalEntryStatus.Posted
                    && si.InvoiceDate >= request.FromDate && si.InvoiceDate <= request.ToDate)
                .OrderBy(si => si.InvoiceDate)
                .AsNoTracking()
                .ToListAsync();

            foreach (var inv in invoices)
            {
                entries.Add(new StatementLineDto(
                    inv.InvoiceDate, $"INV-{inv.InvoiceNumber}",
                    $"Sales Invoice — Total {inv.TotalAmount:N2}",
                    0, inv.TotalAmount, 0));
            }

            var returns = await _db.SalesReturns
                .Where(sr => sr.CustomerId == request.PartyId && sr.Status == JournalEntryStatus.Posted
                    && sr.ReturnDate >= request.FromDate && sr.ReturnDate <= request.ToDate)
                .OrderBy(sr => sr.ReturnDate)
                .AsNoTracking()
                .ToListAsync();

            foreach (var ret in returns)
            {
                entries.Add(new StatementLineDto(
                    ret.ReturnDate, $"RET-{ret.ReturnNumber}",
                    $"Sales Return — Total {ret.TotalAmount:N2}",
                    ret.TotalAmount, 0, 0));
            }

            var vouchers = await _db.CashVouchers
                .Where(cv => cv.PartyId == request.PartyId && cv.PartyType == PartyType.Customer
                    && cv.Status == JournalEntryStatus.Posted
                    && cv.Date >= request.FromDate && cv.Date <= request.ToDate)
                .OrderBy(cv => cv.Date)
                .AsNoTracking()
                .ToListAsync();

            foreach (var v in vouchers)
            {
                if (v.VoucherType == Domain.Enums.VoucherType.Receipt)
                    entries.Add(new StatementLineDto(
                        v.Date, $"VCH-{v.VoucherNumber}",
                        $"Payment Received — {v.Amount:N2}",
                        0, v.Amount, 0));
                else
                    entries.Add(new StatementLineDto(
                        v.Date, $"VCH-{v.VoucherNumber}",
                        $"Payment Made — {v.Amount:N2}",
                        v.Amount, 0, 0));
            }

            // Opening balance: customer balance before the period
            openingBalance = customer.Balance;
        }
        else if (request.PartyType == "Supplier")
        {
            var supplier = await _db.Suppliers.FindAsync(request.PartyId)
                ?? throw new InvalidOperationException("Supplier not found.");
            partyName = supplier.Name;
            partyCode = supplier.Code;

            var invoices = await _db.PurchaseInvoices
                .Where(pi => pi.SupplierId == request.PartyId && pi.Status == JournalEntryStatus.Posted
                    && pi.InvoiceDate >= request.FromDate && pi.InvoiceDate <= request.ToDate)
                .OrderBy(pi => pi.InvoiceDate)
                .AsNoTracking()
                .ToListAsync();

            foreach (var inv in invoices)
            {
                entries.Add(new StatementLineDto(
                    inv.InvoiceDate, $"INV-{inv.InvoiceNumber}",
                    $"Purchase Invoice — Total {inv.TotalAmount:N2}",
                    inv.TotalAmount, 0, 0));
            }

            var returns = await _db.PurchaseReturns
                .Where(pr => pr.SupplierId == request.PartyId && pr.Status == JournalEntryStatus.Posted
                    && pr.ReturnDate >= request.FromDate && pr.ReturnDate <= request.ToDate)
                .OrderBy(pr => pr.ReturnDate)
                .AsNoTracking()
                .ToListAsync();

            foreach (var ret in returns)
            {
                entries.Add(new StatementLineDto(
                    ret.ReturnDate, $"RET-{ret.ReturnNumber}",
                    $"Purchase Return — Total {ret.TotalAmount:N2}",
                    0, ret.TotalAmount, 0));
            }

            var vouchers = await _db.CashVouchers
                .Where(cv => cv.PartyId == request.PartyId && cv.PartyType == PartyType.Supplier
                    && cv.Status == JournalEntryStatus.Posted
                    && cv.Date >= request.FromDate && cv.Date <= request.ToDate)
                .OrderBy(cv => cv.Date)
                .AsNoTracking()
                .ToListAsync();

            foreach (var v in vouchers)
            {
                if (v.VoucherType == Domain.Enums.VoucherType.Payment)
                    entries.Add(new StatementLineDto(
                        v.Date, $"VCH-{v.VoucherNumber}",
                        $"Payment Made — {v.Amount:N2}",
                        0, v.Amount, 0));
                else
                    entries.Add(new StatementLineDto(
                        v.Date, $"VCH-{v.VoucherNumber}",
                        $"Payment Received — {v.Amount:N2}",
                        v.Amount, 0, 0));
            }

            openingBalance = supplier.Balance;
        }

        // Sort entries by date
        entries = entries.OrderBy(e => e.Date).ToList();

        // Calculate running balance
        var runningEntries = new List<StatementLineDto>();
        decimal runningBalance = openingBalance;
        foreach (var entry in entries)
        {
            runningBalance = runningBalance + entry.Debit - entry.Credit;
            runningEntries.Add(new StatementLineDto(
                entry.Date, entry.Reference, entry.Description,
                entry.Debit, entry.Credit, runningBalance));
        }

        return new AccountStatementResponse(
            partyName, partyCode,
            request.FromDate, request.ToDate,
            runningEntries,
            openingBalance, runningBalance,
            entries.Sum(e => e.Debit),
            entries.Sum(e => e.Credit)
        );
    }

    // ═══════════════════════════════════
    //  STOCK LEDGER
    // ═══════════════════════════════════

    public async Task<StockLedgerResponse> GetStockLedgerAsync(StockLedgerRequest request)
    {
        var query = _db.StockMovements
            .Include(sm => sm.Product)
            .Include(sm => sm.Warehouse)
            .Where(sm => sm.MovementDate >= request.FromDate && sm.MovementDate <= request.ToDate)
            .AsNoTracking()
            .AsQueryable();

        if (request.ProductId.HasValue)
            query = query.Where(sm => sm.ProductId == request.ProductId.Value);
        if (request.WarehouseId.HasValue)
            query = query.Where(sm => sm.WarehouseId == request.WarehouseId.Value);

        var movements = await query.OrderBy(sm => sm.MovementDate).ToListAsync();

        string productName = "All Products", productSku = "ALL", warehouseName = "All Warehouses";
        if (request.ProductId.HasValue)
        {
            var product = await _db.Products.FindAsync(request.ProductId.Value);
            if (product is not null)
            {
                productName = product.Name;
                productSku = product.SKU;
            }
        }
        if (request.WarehouseId.HasValue)
        {
            var wh = await _db.Warehouses.FindAsync(request.WarehouseId.Value);
            if (wh is not null) warehouseName = wh.Name;
        }

        decimal runningQty = 0, runningValue = 0;
        decimal totalIn = 0, totalOut = 0;

        var lines = movements.Select(m =>
        {
            decimal qtyIn = 0, qtyOut = 0;
            if (m.MovementType == MovementType.In || m.MovementType == MovementType.Adjustment && m.Quantity > 0)
            {
                qtyIn = Math.Abs(m.Quantity);
                totalIn += qtyIn;
                runningQty += qtyIn;
                runningValue += qtyIn * m.UnitCost;
            }
            else if (m.MovementType == MovementType.Out || m.MovementType == MovementType.Adjustment && m.Quantity < 0)
            {
                qtyOut = Math.Abs(m.Quantity);
                totalOut += qtyOut;
                runningQty -= qtyOut;
                // FIFO-like: deduct proportionally
                if (runningQty > 0)
                    runningValue -= qtyOut * (runningValue / (runningQty + qtyOut));
                else
                    runningValue = 0;
            }
            else if (m.MovementType == MovementType.Transfer)
            {
                // For stock ledger, transfer out from source
                qtyOut = Math.Abs(m.Quantity);
                totalOut += qtyOut;
                runningQty -= qtyOut;
                if (runningQty > 0)
                    runningValue -= qtyOut * (runningValue / (runningQty + qtyOut));
                else
                    runningValue = 0;
            }

            var wac = runningQty > 0 ? runningValue / runningQty : 0;

            return new StockLedgerLineDto(
                m.MovementDate,
                m.MovementType.ToString(),
                qtyIn, qtyOut,
                m.UnitCost, m.Quantity * m.UnitCost,
                runningQty, runningValue, wac,
                m.ReferenceDocument);
        }).ToList();

        return new StockLedgerResponse(
            productName, productSku, warehouseName,
            lines, totalIn, totalOut, runningQty, runningValue);
    }

    // ═══════════════════════════════════
    //  DASHBOARD KPIs
    // ═══════════════════════════════════

    public async Task<DashboardKpiResponse> GetDashboardKpisAsync()
    {
        // Use Account.Balance directly (maintained by journal posting) instead of
        // N+1 navigation-property queries that fail EF Core translation.
        var accounts = await _db.Accounts
            .Where(a => !a.IsHeader && a.IsActive)
            .AsNoTracking().ToListAsync();

        var totalRevenue = accounts.Where(a => a.Type == AccountType.Revenue).Sum(a => Math.Abs(a.Balance));
        var totalExpenses = accounts.Where(a => a.Type == AccountType.Expense).Sum(a => Math.Abs(a.Balance));
        var totalAssets = accounts.Where(a => a.Type == AccountType.Asset).Sum(a => Math.Abs(a.Balance));
        var totalLiabilities = accounts.Where(a => a.Type == AccountType.Liability).Sum(a => Math.Abs(a.Balance));
        var totalEquity = accounts.Where(a => a.Type == AccountType.Equity).Sum(a => Math.Abs(a.Balance));

        var totalCustomers = await _db.Customers.CountAsync(c => c.IsActive);
        var totalSuppliers = await _db.Suppliers.CountAsync(s => s.IsActive);
        var totalProducts = await _db.Products.CountAsync(p => p.IsActive);

        var totalCashBalance = await _db.Treasuries
            .Where(t => t.IsActive)
            .AsNoTracking()
            .SumAsync(t => t.Balance);

        return new DashboardKpiResponse(
            totalRevenue, totalExpenses, totalRevenue - totalExpenses,
            totalAssets, totalLiabilities, totalEquity,
            totalCustomers, totalSuppliers, totalProducts, totalCashBalance);
    }

    // ═══════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════

    private record AccountDebitCredit(string Code, string Name, decimal Debit, decimal Credit);

    private async Task<List<AccountDebitCredit>> GetAccountDebitCreditTotalsAsync(
        DateTime fromDate, DateTime toDate, AccountType type,
        string? codePrefix = null, string? excludePrefix = null)
    {
        var accounts = await _db.Accounts
            .Where(a => a.Type == type && !a.IsHeader && a.IsActive)
            .AsNoTracking()
            .ToListAsync();

        if (codePrefix is not null)
            accounts = accounts.Where(a => a.Code.StartsWith(codePrefix)).ToList();
        if (excludePrefix is not null)
            accounts = accounts.Where(a => !a.Code.StartsWith(excludePrefix)).ToList();

        var result = new List<AccountDebitCredit>();
        foreach (var account in accounts)
        {
            var totalDebit = await _db.JournalEntryLines
                .Where(jel => jel.AccountId == account.Id
                    && jel.JournalEntry.Status == JournalEntryStatus.Posted
                    && jel.JournalEntry.EntryDate >= fromDate
                    && jel.JournalEntry.EntryDate <= toDate)
                .SumAsync(jel => jel.Debit);

            var totalCredit = await _db.JournalEntryLines
                .Where(jel => jel.AccountId == account.Id
                    && jel.JournalEntry.Status == JournalEntryStatus.Posted
                    && jel.JournalEntry.EntryDate >= fromDate
                    && jel.JournalEntry.EntryDate <= toDate)
                .SumAsync(jel => jel.Credit);

            if (totalDebit == 0 && totalCredit == 0)
                continue;

            result.Add(new AccountDebitCredit(account.Code, account.Name, totalDebit, totalCredit));
        }

        return result;
    }

    private async Task<List<BalanceSheetLineDto>> GetAccountBalanceAsOfAsync(DateTime asOfDate, AccountType type)
    {
        var accounts = await _db.Accounts
            .Where(a => a.Type == type && !a.IsHeader && a.IsActive)
            .OrderBy(a => a.Code)
            .AsNoTracking()
            .ToListAsync();

        var result = new List<BalanceSheetLineDto>();
        foreach (var account in accounts)
        {
            var totalDebit = await _db.JournalEntryLines
                .Where(jel => jel.AccountId == account.Id
                    && jel.JournalEntry.Status == JournalEntryStatus.Posted
                    && jel.JournalEntry.EntryDate < asOfDate)
                .SumAsync(jel => jel.Debit);

            var totalCredit = await _db.JournalEntryLines
                .Where(jel => jel.AccountId == account.Id
                    && jel.JournalEntry.Status == JournalEntryStatus.Posted
                    && jel.JournalEntry.EntryDate < asOfDate)
                .SumAsync(jel => jel.Credit);

            decimal balance;
            if (type == AccountType.Asset || type == AccountType.Expense)
                balance = totalDebit - totalCredit;
            else
                balance = totalCredit - totalDebit;

            if (balance != 0)
                result.Add(new BalanceSheetLineDto(account.Code, account.Name, balance));
        }

        return result;
    }

    private async Task<decimal> GetNetTotalForPeriodAsync(DateTime fromDate, DateTime toDate, AccountType type)
    {
        // Use Account.Balance directly (maintained by journal posting) to avoid
        // EF Core N+1 navigation-property translation failures.
        var accounts = await _db.Accounts
            .Where(a => a.Type == type && !a.IsHeader && a.IsActive)
            .AsNoTracking()
            .ToListAsync();

        return accounts.Sum(a => Math.Abs(a.Balance));
    }
}
