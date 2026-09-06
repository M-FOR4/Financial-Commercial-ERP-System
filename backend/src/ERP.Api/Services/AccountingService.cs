using ERP.Api.Common;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class AccountingService : IAccountingService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AccountingService> _logger;

    public AccountingService(AppDbContext context, ILogger<AccountingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedDefaultChartOfAccountsAsync()
    {
        if (await _context.Accounts.AnyAsync())
        {
            return;
        }

        _logger.LogInformation("Seeding standard Chart of Accounts hierarchy...");

        // 1000 Assets
        var assetsRoot = new Account { Code = "1000", Name = "Assets (الأصول)", Type = AccountType.Asset, IsHeader = true, IsActive = true };
        var currentAssets = new Account { Code = "1100", Name = "Current Assets (الأصول المتداولة)", Type = AccountType.Asset, IsHeader = true, Parent = assetsRoot, IsActive = true };
        var cash = new Account { Code = "1110", Name = "Cash on Hand (الخزينة النقدية)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };
        var bank = new Account { Code = "1120", Name = "Bank Accounts (الحسابات المصرفية)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };
        var ar = new Account { Code = "1130", Name = "Accounts Receivable - Customers (العملاء / المدينون)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };
        var inventory = new Account { Code = "1140", Name = "Inventory (المخزون السلعي)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };

        var nonCurrentAssets = new Account { Code = "1200", Name = "Non-Current Assets (الأصول الثابتة)", Type = AccountType.Asset, IsHeader = true, Parent = assetsRoot, IsActive = true };
        var ppe = new Account { Code = "1210", Name = "Property, Plant & Equipment (الممتلكات والآلات والمعدات)", Type = AccountType.Asset, IsHeader = false, Parent = nonCurrentAssets, IsActive = true };
        var accumDepr = new Account { Code = "1220", Name = "Accumulated Depreciation (مجمع الإهلاك)", Type = AccountType.Asset, IsHeader = false, Parent = nonCurrentAssets, IsActive = true };

        // 2000 Liabilities
        var liabilitiesRoot = new Account { Code = "2000", Name = "Liabilities (الالتزامات / الخصوم)", Type = AccountType.Liability, IsHeader = true, IsActive = true };
        var currentLiabilities = new Account { Code = "2100", Name = "Current Liabilities (الالتزامات المتداولة)", Type = AccountType.Liability, IsHeader = true, Parent = liabilitiesRoot, IsActive = true };
        var ap = new Account { Code = "2110", Name = "Accounts Payable - Suppliers (الموردون / الدائنون)", Type = AccountType.Liability, IsHeader = false, Parent = currentLiabilities, IsActive = true };
        var accruedExp = new Account { Code = "2120", Name = "Accrued Expenses (المصروفات المستحقة)", Type = AccountType.Liability, IsHeader = false, Parent = currentLiabilities, IsActive = true };
        var shortTermLoan = new Account { Code = "2130", Name = "Short-Term Loans (قروض قصيرة الأجل)", Type = AccountType.Liability, IsHeader = false, Parent = currentLiabilities, IsActive = true };

        // 3000 Equity
        var equityRoot = new Account { Code = "3000", Name = "Equity (حقوق الملكية)", Type = AccountType.Equity, IsHeader = true, IsActive = true };
        var capital = new Account { Code = "3100", Name = "Owner's Capital (رأس المال)", Type = AccountType.Equity, IsHeader = false, Parent = equityRoot, IsActive = true };
        var retainedEarnings = new Account { Code = "3200", Name = "Retained Earnings (الأرباح المحتجزة / المدورة)", Type = AccountType.Equity, IsHeader = false, Parent = equityRoot, IsActive = true };

        // 4000 Revenue
        var revenueRoot = new Account { Code = "4000", Name = "Revenue (الإيرادات)", Type = AccountType.Revenue, IsHeader = true, IsActive = true };
        var salesRevenue = new Account { Code = "4100", Name = "Sales Revenue (إيرادات المبيعات)", Type = AccountType.Revenue, IsHeader = false, Parent = revenueRoot, IsActive = true };
        var otherIncome = new Account { Code = "4200", Name = "Other Income (إيرادات أخرى)", Type = AccountType.Revenue, IsHeader = false, Parent = revenueRoot, IsActive = true };

        // 5000 Expenses
        var expensesRoot = new Account { Code = "5000", Name = "Expenses (المصروفات والتكاليف)", Type = AccountType.Expense, IsHeader = true, IsActive = true };
        var cogs = new Account { Code = "5100", Name = "Cost of Goods Sold - COGS (تكلفة البضاعة المباعة)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var salaries = new Account { Code = "5200", Name = "Salaries & Wages (المرتبات والأجور)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var rentUtilities = new Account { Code = "5300", Name = "Rent & Utilities (الإيجارات والمرافق)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var deprExpense = new Account { Code = "5400", Name = "Depreciation Expense (مصروف الإهلاك)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var adminExpense = new Account { Code = "5500", Name = "General & Administrative (المصروفات العمومية والإدارية)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };

        _context.Accounts.AddRange(
            assetsRoot, currentAssets, cash, bank, ar, inventory, nonCurrentAssets, ppe, accumDepr,
            liabilitiesRoot, currentLiabilities, ap, accruedExp, shortTermLoan,
            equityRoot, capital, retainedEarnings,
            revenueRoot, salesRevenue, otherIncome,
            expensesRoot, cogs, salaries, rentUtilities, deprExpense, adminExpense
        );

        await _context.SaveChangesAsync();
        _logger.LogInformation("Chart of Accounts seeded successfully.");
    }

    public async Task<List<AccountDto>> GetAccountsTreeAsync()
    {
        var allAccounts = await _context.Accounts
            .Include(a => a.Parent)
            .OrderBy(a => a.Code)
            .AsNoTracking()
            .ToListAsync();

        var rootAccounts = allAccounts.Where(a => a.ParentId == null).ToList();
        return rootAccounts.Select(a => MapToTreeDto(a, allAccounts)).ToList();
    }

    private static AccountDto MapToTreeDto(Account account, List<Account> allAccounts)
    {
        var children = allAccounts
            .Where(c => c.ParentId == account.Id)
            .OrderBy(c => c.Code)
            .Select(c => MapToTreeDto(c, allAccounts))
            .ToList();

        return new AccountDto(
            account.Id,
            account.Code,
            account.Name,
            account.Type,
            account.Type.ToString(),
            account.ParentId,
            account.Parent?.Name,
            account.IsActive,
            account.IsHeader,
            account.Balance,
            children.Count > 0 ? children : null,
            account.CreatedAt
        );
    }

    public async Task<List<AccountDto>> GetAccountsFlatAsync(AccountType? type = null, bool? activeOnly = null)
    {
        var query = _context.Accounts
            .Include(a => a.Parent)
            .AsNoTracking()
            .AsQueryable();

        if (type.HasValue)
        {
            query = query.Where(a => a.Type == type.Value);
        }

        if (activeOnly.HasValue)
        {
            query = query.Where(a => a.IsActive == activeOnly.Value);
        }

        var accounts = await query.OrderBy(a => a.Code).ToListAsync();

        return accounts.Select(a => new AccountDto(
            a.Id,
            a.Code,
            a.Name,
            a.Type,
            a.Type.ToString(),
            a.ParentId,
            a.Parent?.Name,
            a.IsActive,
            a.IsHeader,
            a.Balance,
            null,
            a.CreatedAt
        )).ToList();
    }

    public async Task<AccountDto?> GetAccountByIdAsync(Guid id)
    {
        var account = await _context.Accounts
            .Include(a => a.Parent)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (account == null) return null;

        return new AccountDto(
            account.Id,
            account.Code,
            account.Name,
            account.Type,
            account.Type.ToString(),
            account.ParentId,
            account.Parent?.Name,
            account.IsActive,
            account.IsHeader,
            account.Balance,
            null,
            account.CreatedAt
        );
    }

    public async Task<AccountDto> CreateAccountAsync(CreateAccountRequest request)
    {
        if (await _context.Accounts.AnyAsync(a => a.Code == request.Code.Trim()))
        {
            throw new InvalidOperationException($"An account with code '{request.Code}' already exists.");
        }

        Account? parent = null;
        if (request.ParentId.HasValue)
        {
            parent = await _context.Accounts.FindAsync(request.ParentId.Value);
            if (parent == null)
            {
                throw new InvalidOperationException("Specified parent account does not exist.");
            }
        }

        var account = new Account
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Type = request.Type,
            ParentId = request.ParentId,
            IsHeader = request.IsHeader,
            IsActive = request.IsActive,
            Balance = 0m,
            CreatedAt = DateTime.UtcNow
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        return new AccountDto(
            account.Id,
            account.Code,
            account.Name,
            account.Type,
            account.Type.ToString(),
            account.ParentId,
            parent?.Name,
            account.IsActive,
            account.IsHeader,
            account.Balance,
            null,
            account.CreatedAt
        );
    }

    public async Task<AccountDto?> UpdateAccountAsync(Guid id, UpdateAccountRequest request)
    {
        var account = await _context.Accounts
            .Include(a => a.Parent)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (account == null) return null;

        account.Name = request.Name.Trim();
        account.IsHeader = request.IsHeader;
        account.IsActive = request.IsActive;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new AccountDto(
            account.Id,
            account.Code,
            account.Name,
            account.Type,
            account.Type.ToString(),
            account.ParentId,
            account.Parent?.Name,
            account.IsActive,
            account.IsHeader,
            account.Balance,
            null,
            account.CreatedAt
        );
    }

    public async Task<AccountBalanceDto?> GetAccountBalanceAsync(Guid id)
    {
        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (account == null) return null;

        return new AccountBalanceDto(account.Id, account.Code, account.Name, account.Type, account.Balance);
    }

    public async Task<List<JournalEntryDto>> GetJournalEntriesAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        JournalEntryStatus? status = null,
        string? search = null)
    {
        // Npgsql requires UTC Kind for timestamptz comparisons; query-string dates arrive as Unspecified.
        // (Treating them as UTC via SpecifyKind is correct — ToUniversalTime would shift naive dates by the server offset.)
        fromDate = fromDate.ToUtc();
        toDate = toDate.ToUtc();

        var query = _context.JournalEntries
            .Include(je => je.PostedByUser)
            .Include(je => je.Lines)
                .ThenInclude(l => l.Account)
            .AsNoTracking()
            .AsQueryable();

        if (fromDate.HasValue)
        {
            query = query.Where(je => je.EntryDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(je => je.EntryDate <= toDate.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(je => je.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(je => je.EntryNumber.ToLower().Contains(s) || je.Description.ToLower().Contains(s));
        }

        var entries = await query.OrderByDescending(je => je.EntryDate).ThenByDescending(je => je.CreatedAt).ToListAsync();

        return entries.Select(MapToJournalEntryDto).ToList();
    }

    public async Task<JournalEntryDto?> GetJournalEntryByIdAsync(Guid id)
    {
        var entry = await _context.JournalEntries
            .Include(je => je.PostedByUser)
            .Include(je => je.Lines)
                .ThenInclude(l => l.Account)
            .AsNoTracking()
            .FirstOrDefaultAsync(je => je.Id == id);

        return entry == null ? null : MapToJournalEntryDto(entry);
    }

    public async Task<JournalEntryDto> CreateJournalEntryDraftAsync(CreateJournalEntryRequest request)
    {
        ValidateJournalLines(request.Lines);

        // Auto-generate Entry Number (e.g. JE-202608-0001)
        var countToday = await _context.JournalEntries.CountAsync();
        var entryNumber = $"JE-{DateTime.UtcNow:yyyyMM}-{countToday + 1:D4}";

        var entryDate = request.EntryDate.ToUtc() ?? DateTime.UtcNow;

        var firstAccountId = request.Lines.FirstOrDefault()?.AccountId;
        Guid companyId = Guid.Empty;
        if (firstAccountId.HasValue)
        {
            var firstAcc = await _context.Accounts.FindAsync(firstAccountId.Value);
            if (firstAcc != null) companyId = firstAcc.CompanyId;
        }

        var fiscalYear = await _context.FiscalYears
            .FirstOrDefaultAsync(fy => fy.CompanyId == companyId && fy.IsActive
                                       && fy.StartDate <= entryDate && entryDate <= fy.EndDate)
            ?? await _context.FiscalYears.FirstOrDefaultAsync(fy => fy.CompanyId == companyId && fy.IsActive);

        var entry = new JournalEntry
        {
            CompanyId = companyId,
            FiscalYearId = fiscalYear?.Id ?? Guid.Empty,
            EntryNumber = entryNumber,
            EntryDate = entryDate,
            Description = request.Description.Trim(),
            Status = JournalEntryStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var lineReq in request.Lines)
        {
            var account = await _context.Accounts.FindAsync(lineReq.AccountId);
            if (account == null)
            {
                throw new InvalidOperationException($"Account ID '{lineReq.AccountId}' does not exist.");
            }
            if (account.IsHeader)
            {
                throw new InvalidOperationException($"Account '{account.Code} - {account.Name}' is a Header account and cannot receive direct postings.");
            }

            entry.Lines.Add(new JournalEntryLine
            {
                AccountId = lineReq.AccountId,
                Debit = lineReq.Debit,
                Credit = lineReq.Credit,
                Description = lineReq.Description?.Trim()
            });
        }

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        return await GetJournalEntryByIdAsync(entry.Id) ?? throw new InvalidOperationException("Failed to load created entry.");
    }

    public async Task<JournalEntryDto?> UpdateJournalEntryDraftAsync(Guid id, UpdateJournalEntryRequest request)
    {
        var entry = await _context.JournalEntries
            .Include(je => je.Lines)
            .FirstOrDefaultAsync(je => je.Id == id);

        if (entry == null) return null;

        if (entry.Status != JournalEntryStatus.Draft)
        {
            throw new InvalidOperationException($"Cannot modify a journal entry with status '{entry.Status}'. Only Draft entries can be edited.");
        }

        ValidateJournalLines(request.Lines);

        entry.EntryDate = request.EntryDate.ToUtc() ?? entry.EntryDate;
        entry.Description = request.Description.Trim();
        entry.UpdatedAt = DateTime.UtcNow;

        // Replace lines
        _context.JournalEntryLines.RemoveRange(entry.Lines);
        entry.Lines.Clear();

        foreach (var lineReq in request.Lines)
        {
            var account = await _context.Accounts.FindAsync(lineReq.AccountId);
            if (account == null || account.IsHeader)
            {
                throw new InvalidOperationException($"Account ID '{lineReq.AccountId}' is invalid or is a Header account.");
            }

            entry.Lines.Add(new JournalEntryLine
            {
                AccountId = lineReq.AccountId,
                Debit = lineReq.Debit,
                Credit = lineReq.Credit,
                Description = lineReq.Description?.Trim()
            });
        }

        await _context.SaveChangesAsync();
        return await GetJournalEntryByIdAsync(entry.Id);
    }

    public async Task<JournalEntryDto> PostJournalEntryAsync(Guid id, Guid? postedByUserId)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var entry = await _context.JournalEntries
                .Include(je => je.Lines)
                .FirstOrDefaultAsync(je => je.Id == id);

            if (entry == null)
            {
                throw new KeyNotFoundException($"Journal Entry with ID '{id}' not found.");
            }

            if (entry.Status != JournalEntryStatus.Draft)
            {
                throw new InvalidOperationException($"Only Draft entries can be posted. Current status: '{entry.Status}'.");
            }

            // Invariant: Total Debit must equal Total Credit > 0
            var totalDebit = entry.Lines.Sum(l => l.Debit);
            var totalCredit = entry.Lines.Sum(l => l.Credit);

            if (totalDebit <= 0 || totalDebit != totalCredit)
            {
                throw new InvalidOperationException($"Double-entry invariant violated: Total Debits ({totalDebit:F4}) must equal Total Credits ({totalCredit:F4}) and be greater than zero.");
            }

            // Update Account Balances
            foreach (var line in entry.Lines)
            {
                var account = await _context.Accounts.FindAsync(line.AccountId);
                if (account == null)
                {
                    throw new InvalidOperationException($"Account ID '{line.AccountId}' not found.");
                }

                if (account.IsHeader)
                {
                    throw new InvalidOperationException($"Account '{account.Code}' is a Header account and cannot be posted to.");
                }

                // Balance impact by account type:
                // Normal Debit balance: Asset, Expense
                // Normal Credit balance: Liability, Equity, Revenue
                if (account.Type is AccountType.Asset or AccountType.Expense)
                {
                    account.Balance += (line.Debit - line.Credit);
                }
                else
                {
                    account.Balance += (line.Credit - line.Debit);
                }

                account.UpdatedAt = DateTime.UtcNow;
            }

            entry.Status = JournalEntryStatus.Posted;
            entry.PostedAt = DateTime.UtcNow;
            entry.PostedByUserId = postedByUserId;
            entry.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            _logger.LogInformation("Journal Entry '{EntryNumber}' posted successfully. Transaction total: {Total:F4}", entry.EntryNumber, totalDebit);

            return await GetJournalEntryByIdAsync(entry.Id) ?? throw new InvalidOperationException("Failed to reload posted entry.");
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }
            throw;
        }
    }

    public async Task<JournalEntryDto> CancelJournalEntryAsync(Guid id, Guid? cancelledByUserId)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var entry = await _context.JournalEntries
                .Include(je => je.Lines)
                .FirstOrDefaultAsync(je => je.Id == id);

            if (entry == null)
            {
                throw new KeyNotFoundException($"Journal Entry with ID '{id}' not found.");
            }

            if (entry.Status != JournalEntryStatus.Posted)
            {
                throw new InvalidOperationException($"Only Posted entries can be cancelled to reverse ledger impact. Current status: '{entry.Status}'.");
            }

            // Revert Account Balances
            foreach (var line in entry.Lines)
            {
                var account = await _context.Accounts.FindAsync(line.AccountId);
                if (account != null)
                {
                    if (account.Type is AccountType.Asset or AccountType.Expense)
                    {
                        account.Balance -= (line.Debit - line.Credit);
                    }
                    else
                    {
                        account.Balance -= (line.Credit - line.Debit);
                    }

                    account.UpdatedAt = DateTime.UtcNow;
                }
            }

            entry.Status = JournalEntryStatus.Cancelled;
            entry.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            _logger.LogInformation("Journal Entry '{EntryNumber}' cancelled. Ledger balances reversed.", entry.EntryNumber);

            return await GetJournalEntryByIdAsync(entry.Id) ?? throw new InvalidOperationException("Failed to reload cancelled entry.");
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }
            throw;
        }
    }

    private static void ValidateJournalLines(List<JournalEntryLineRequest> lines)
    {
        if (lines == null || lines.Count < 2)
        {
            throw new InvalidOperationException("A journal entry must contain at least 2 line items.");
        }

        var totalDebit = lines.Sum(l => l.Debit);
        var totalCredit = lines.Sum(l => l.Credit);

        if (totalDebit <= 0)
        {
            throw new InvalidOperationException("Total debit amount must be greater than zero.");
        }

        if (totalDebit != totalCredit)
        {
            throw new InvalidOperationException($"Unbalanced Journal Entry: Total Debit ({totalDebit:F4}) does not equal Total Credit ({totalCredit:F4}). Difference: {Math.Abs(totalDebit - totalCredit):F4}.");
        }
    }

    private static JournalEntryDto MapToJournalEntryDto(JournalEntry je)
    {
        var linesDto = je.Lines.Select(l => new JournalEntryLineDto(
            l.Id,
            l.AccountId,
            l.Account?.Code ?? string.Empty,
            l.Account?.Name ?? string.Empty,
            l.Debit,
            l.Credit,
            l.Description
        )).ToList();

        var totalDebit = linesDto.Sum(l => l.Debit);
        var totalCredit = linesDto.Sum(l => l.Credit);

        return new JournalEntryDto(
            je.Id,
            je.EntryNumber,
            je.EntryDate,
            je.Description,
            je.Status,
            je.Status.ToString(),
            je.PostedAt,
            je.PostedByUserId,
            je.PostedByUser?.FullName,
            totalDebit,
            totalCredit,
            linesDto,
            je.CreatedAt
        );
    }
}
