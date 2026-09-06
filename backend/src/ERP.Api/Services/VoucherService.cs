using ERP.Api.Common;
using ERP.Api.Data;
using ERP.Api.DTOs;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace ERP.Api.Services;

public class VoucherService : IVoucherService
{
    private readonly AppDbContext _db;

    public VoucherService(AppDbContext db)
    {
        _db = db;
    }

    // ═══════════════════════════════════
    //  CASH VOUCHERS
    // ═══════════════════════════════════

    public async Task<List<CashVoucherResponse>> GetAllCashVouchersAsync()
    {
        return await _db.CashVouchers
            .Include(cv => cv.Treasury)
            .Include(cv => cv.TargetAccount)
            .Include(cv => cv.JournalEntry)
            .AsNoTracking()
            .OrderByDescending(cv => cv.Date)
            .ThenByDescending(cv => cv.CreatedAt)
            .Select(cv => MapCashVoucherToResponse(cv))
            .ToListAsync();
    }

    public async Task<CashVoucherResponse?> GetCashVoucherByIdAsync(Guid id)
    {
        var cv = await _db.CashVouchers
            .Include(cv => cv.Treasury)
            .Include(cv => cv.TargetAccount)
            .Include(cv => cv.JournalEntry)
            .AsNoTracking()
            .FirstOrDefaultAsync(cv => cv.Id == id);

        return cv is null ? null : MapCashVoucherToResponse(cv);
    }

    public async Task<CashVoucherResponse> CreateCashVoucherAsync(CashVoucherRequest request, Guid? userId, Guid companyId)
    {
        // Validate treasury
        var treasury = await _db.Treasuries.FindAsync(request.TreasuryId)
            ?? throw new InvalidOperationException("Treasury not found.");

        // Validate target account
        var targetAccount = await _db.Accounts.FindAsync(request.TargetAccountId)
            ?? throw new InvalidOperationException("Target account not found.");

        // Validate amount
        if (request.Amount <= 0)
            throw new InvalidOperationException("Amount must be greater than zero.");

        // For payments, check treasury has sufficient balance
        if (request.VoucherType == VoucherType.Payment && treasury.Balance < request.Amount)
            throw new InvalidOperationException($"Insufficient treasury balance. Available: {treasury.Balance}.");

        var voucher = new CashVoucher
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            VoucherNumber = await GenerateVoucherNumberAsync(request.VoucherType),
            VoucherType = request.VoucherType,
            Date = request.Date.ToUtc(),
            TreasuryId = request.TreasuryId,
            PartyType = request.PartyType,
            PartyId = request.PartyId,
            TargetAccountId = request.TargetAccountId,
            Amount = request.Amount,
            Description = request.Description,
            Status = JournalEntryStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = userId
        };

        _db.CashVouchers.Add(voucher);
        await _db.SaveChangesAsync();

        return await GetCashVoucherByIdAsync(voucher.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created voucher.");
    }

    public async Task<CashVoucherResponse?> PostCashVoucherAsync(Guid id)
    {
        var voucher = await _db.CashVouchers
            .Include(cv => cv.Treasury)
            .Include(cv => cv.TargetAccount)
            .FirstOrDefaultAsync(cv => cv.Id == id);

        if (voucher is null) return null;
        if (voucher.Status != JournalEntryStatus.Draft)
            throw new InvalidOperationException($"Cannot post voucher in {voucher.Status} status.");

        var useTransactions = _db.Database.IsRelational();
        IDbContextTransaction? transaction = useTransactions ? await _db.Database.BeginTransactionAsync() : null;

        try
        {
            var treasury = voucher.Treasury;

            // Validate payment has sufficient balance
            if (voucher.VoucherType == VoucherType.Payment && treasury.Balance < voucher.Amount)
                throw new InvalidOperationException($"Insufficient treasury balance. Available: {treasury.Balance}.");

            // Create Journal Entry — resolve and validate the company's active fiscal year
            // so FiscalYearId is always a valid FK (a missing fiscal year is a clear
            // business error, never a raw 23503 constraint violation).
            var fiscalYear = await GetActiveFiscalYearAsync(voucher.CompanyId, voucher.Date);

            var journalEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                CompanyId = voucher.CompanyId,
                BranchId = voucher.BranchId,
                FiscalYearId = fiscalYear.Id,
                EntryNumber = await GenerateJournalEntryNumberAsync(),
                Description = $"Cash {voucher.VoucherType}: {voucher.Description}",
                EntryDate = voucher.Date,
                Status = JournalEntryStatus.Posted,
                PostedByUserId = voucher.CreatedByUserId,
                SourceDocumentType = "CashVoucher",
                SourceDocumentId = voucher.Id.ToString(),
                PostedAt = DateTime.UtcNow
            };

            if (voucher.VoucherType == VoucherType.Receipt)
            {
                // Receipt: Debit Treasury Account, Credit Target Account
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = treasury.AccountId,
                    Debit = voucher.Amount,
                    Credit = 0,
                    Description = $"Receipt into {treasury.Name}"
                });
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = voucher.TargetAccountId,
                    Debit = 0,
                    Credit = voucher.Amount,
                    Description = voucher.Description
                });

                // Update treasury balance
                treasury.Balance += voucher.Amount;
            }
            else // Payment
            {
                // Payment: Debit Target Account, Credit Treasury Account
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = voucher.TargetAccountId,
                    Debit = voucher.Amount,
                    Credit = 0,
                    Description = voucher.Description
                });
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = treasury.AccountId,
                    Debit = 0,
                    Credit = voucher.Amount,
                    Description = $"Payment from {treasury.Name}"
                });

                // Update treasury balance
                treasury.Balance -= voucher.Amount;
            }

            _db.JournalEntries.Add(journalEntry);

            // Update party balance
            if (voucher.PartyType == PartyType.Customer && voucher.PartyId.HasValue)
            {
                var customer = await _db.Customers.FindAsync(voucher.PartyId.Value);
                if (customer is not null)
                {
                    customer.Balance += voucher.VoucherType == VoucherType.Receipt
                        ? -voucher.Amount  // Customer pays us → reduce AR
                        : voucher.Amount;   // We pay customer → increase AR
                }
            }
            else if (voucher.PartyType == PartyType.Supplier && voucher.PartyId.HasValue)
            {
                var supplier = await _db.Suppliers.FindAsync(voucher.PartyId.Value);
                if (supplier is not null)
                {
                    supplier.Balance += voucher.VoucherType == VoucherType.Receipt
                        ? voucher.Amount   // Supplier pays us → reduce AP
                        : -voucher.Amount; // We pay supplier → increase AP (or decrease)
                }
            }

            // Link journal entry to voucher
            voucher.JournalEntryId = journalEntry.Id;
            voucher.Status = JournalEntryStatus.Posted;

            await _db.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

            return await GetCashVoucherByIdAsync(id);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<CashVoucherResponse?> CancelCashVoucherAsync(Guid id)
    {
        var voucher = await _db.CashVouchers
            .Include(cv => cv.Treasury)
            .Include(cv => cv.TargetAccount)
            .FirstOrDefaultAsync(cv => cv.Id == id);

        if (voucher is null) return null;
        if (voucher.Status != JournalEntryStatus.Posted)
            throw new InvalidOperationException($"Cannot cancel voucher in {voucher.Status} status.");

        var useTransactions = _db.Database.IsRelational();
        IDbContextTransaction? transaction = useTransactions ? await _db.Database.BeginTransactionAsync() : null;

        try
        {
            var treasury = voucher.Treasury;

            // Create reversing Journal Entry — active fiscal year must be valid so the
            // required FiscalYearId FK is never left empty.
            var fiscalYear = await GetActiveFiscalYearAsync(voucher.CompanyId, DateTime.UtcNow);
            var journalEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                CompanyId = voucher.CompanyId,
                BranchId = voucher.BranchId,
                FiscalYearId = fiscalYear.Id,
                EntryNumber = await GenerateJournalEntryNumberAsync(),
                Description = $"Cancel Cash {voucher.VoucherType}: {voucher.Description}",
                EntryDate = DateTime.UtcNow,
                Status = JournalEntryStatus.Posted,
                PostedByUserId = voucher.CreatedByUserId,
                SourceDocumentType = "CashVoucher",
                SourceDocumentId = voucher.Id.ToString(),
                PostedAt = DateTime.UtcNow
            };

            if (voucher.VoucherType == VoucherType.Receipt)
            {
                // Reverse receipt: Credit Treasury, Debit Target
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = treasury.AccountId,
                    Debit = 0,
                    Credit = voucher.Amount,
                    Description = $"Cancel receipt into {treasury.Name}"
                });
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = voucher.TargetAccountId,
                    Debit = voucher.Amount,
                    Credit = 0,
                    Description = $"Cancel: {voucher.Description}"
                });

                treasury.Balance -= voucher.Amount;
            }
            else // Payment
            {
                // Reverse payment: Debit Treasury, Credit Target
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = treasury.AccountId,
                    Debit = voucher.Amount,
                    Credit = 0,
                    Description = $"Cancel payment from {treasury.Name}"
                });
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = voucher.TargetAccountId,
                    Debit = 0,
                    Credit = voucher.Amount,
                    Description = $"Cancel: {voucher.Description}"
                });

                treasury.Balance += voucher.Amount;
            }

            _db.JournalEntries.Add(journalEntry);

            // Reverse party balance
            if (voucher.PartyType == PartyType.Customer && voucher.PartyId.HasValue)
            {
                var customer = await _db.Customers.FindAsync(voucher.PartyId.Value);
                if (customer is not null)
                {
                    customer.Balance += voucher.VoucherType == VoucherType.Receipt
                        ? voucher.Amount    // Reverse: increase AR
                        : -voucher.Amount;  // Reverse: decrease AR
                }
            }
            else if (voucher.PartyType == PartyType.Supplier && voucher.PartyId.HasValue)
            {
                var supplier = await _db.Suppliers.FindAsync(voucher.PartyId.Value);
                if (supplier is not null)
                {
                    supplier.Balance += voucher.VoucherType == VoucherType.Receipt
                        ? -voucher.Amount   // Reverse: increase AP
                        : voucher.Amount;   // Reverse: decrease AP
                }
            }

            voucher.Status = JournalEntryStatus.Cancelled;

            await _db.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

            return await GetCashVoucherByIdAsync(id);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    // ═══════════════════════════════════
    //  TRANSFER VOUCHERS
    // ═══════════════════════════════════

    public async Task<List<TransferVoucherResponse>> GetAllTransferVouchersAsync()
    {
        return await _db.TransferVouchers
            .Include(tv => tv.FromTreasury)
            .Include(tv => tv.ToTreasury)
            .Include(tv => tv.JournalEntry)
            .AsNoTracking()
            .OrderByDescending(tv => tv.Date)
            .ThenByDescending(tv => tv.CreatedAt)
            .Select(tv => MapTransferToResponse(tv))
            .ToListAsync();
    }

    public async Task<TransferVoucherResponse?> GetTransferVoucherByIdAsync(Guid id)
    {
        var tv = await _db.TransferVouchers
            .Include(tv => tv.FromTreasury)
            .Include(tv => tv.ToTreasury)
            .Include(tv => tv.JournalEntry)
            .AsNoTracking()
            .FirstOrDefaultAsync(tv => tv.Id == id);

        return tv is null ? null : MapTransferToResponse(tv);
    }

    public async Task<TransferVoucherResponse> CreateTransferVoucherAsync(TransferVoucherRequest request, Guid? userId = null)
    {
        // Validate treasuries
        var fromTreasury = await _db.Treasuries.FindAsync(request.FromTreasuryId)
            ?? throw new InvalidOperationException("Source treasury not found.");
        var toTreasury = await _db.Treasuries.FindAsync(request.ToTreasuryId)
            ?? throw new InvalidOperationException("Destination treasury not found.");

        if (request.FromTreasuryId == request.ToTreasuryId)
            throw new InvalidOperationException("Source and destination treasuries must be different.");

        if (request.Amount <= 0)
            throw new InvalidOperationException("Transfer amount must be greater than zero.");

        if (fromTreasury.Balance < request.Amount)
            throw new InvalidOperationException($"Insufficient balance in source treasury. Available: {fromTreasury.Balance}.");

        // Treasuries are company-scoped: carry the company/branch onto the voucher so
        // the required CompanyId FK is never left as Guid.Empty.
        var voucher = new TransferVoucher
        {
            Id = Guid.NewGuid(),
            CompanyId = fromTreasury.CompanyId,
            BranchId = fromTreasury.BranchId,
            TransferNumber = await GenerateTransferNumberAsync(),
            FromTreasuryId = request.FromTreasuryId,
            ToTreasuryId = request.ToTreasuryId,
            Date = request.Date.ToUtc(),
            Amount = request.Amount,
            Reference = request.Reference,
            Status = JournalEntryStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = userId
        };

        _db.TransferVouchers.Add(voucher);
        await _db.SaveChangesAsync();

        return await GetTransferVoucherByIdAsync(voucher.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created transfer voucher.");
    }

    public async Task<TransferVoucherResponse?> PostTransferVoucherAsync(Guid id)
    {
        var voucher = await _db.TransferVouchers
            .Include(tv => tv.FromTreasury)
            .Include(tv => tv.ToTreasury)
            .FirstOrDefaultAsync(tv => tv.Id == id);

        if (voucher is null) return null;
        if (voucher.Status != JournalEntryStatus.Draft)
            throw new InvalidOperationException($"Cannot post transfer in {voucher.Status} status.");

        var useTransactions = _db.Database.IsRelational();
        IDbContextTransaction? transaction = useTransactions ? await _db.Database.BeginTransactionAsync() : null;

        try
        {
            var fromTreasury = voucher.FromTreasury;
            var toTreasury = voucher.ToTreasury;

            // Validate sufficient balance
            if (fromTreasury.Balance < voucher.Amount)
                throw new InvalidOperationException($"Insufficient balance in source treasury. Available: {fromTreasury.Balance}.");

            // Resolve the company/branch (self-heal legacy rows whose CompanyId was never
            // set) and validate the active fiscal year up front. Leaving FiscalYearId as
            // Guid.Empty would surface as a raw 23503 FK violation / HTTP 500 instead of
            // a clear business error.
            var companyId = voucher.CompanyId != Guid.Empty ? voucher.CompanyId : fromTreasury.CompanyId;
            var branchId = voucher.BranchId ?? fromTreasury.BranchId;
            var fiscalYear = await GetActiveFiscalYearAsync(companyId, voucher.Date);

            // Create Journal Entry: Credit source treasury account, Debit destination treasury account
            var journalEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                BranchId = branchId,
                FiscalYearId = fiscalYear.Id,
                EntryNumber = await GenerateJournalEntryNumberAsync(),
                Description = $"Transfer: {fromTreasury.Name} → {toTreasury.Name}",
                EntryDate = voucher.Date,
                Status = JournalEntryStatus.Posted,
                PostedByUserId = voucher.CreatedByUserId,
                SourceDocumentType = "TransferVoucher",
                SourceDocumentId = voucher.Id.ToString(),
                PostedAt = DateTime.UtcNow
            };

            journalEntry.Lines.Add(new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                AccountId = toTreasury.AccountId,
                Debit = voucher.Amount,
                Credit = 0,
                Description = $"Transfer in to {toTreasury.Name}"
            });
            journalEntry.Lines.Add(new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                AccountId = fromTreasury.AccountId,
                Debit = 0,
                Credit = voucher.Amount,
                Description = $"Transfer out from {fromTreasury.Name}"
            });

            _db.JournalEntries.Add(journalEntry);

            // Update treasury balances
            fromTreasury.Balance -= voucher.Amount;
            toTreasury.Balance += voucher.Amount;

            // Link and update status (repair legacy rows missing company/branch)
            voucher.JournalEntryId = journalEntry.Id;
            voucher.Status = JournalEntryStatus.Posted;
            if (voucher.CompanyId == Guid.Empty)
            {
                voucher.CompanyId = companyId;
                voucher.BranchId = branchId;
                voucher.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

            return await GetTransferVoucherByIdAsync(id);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<TransferVoucherResponse?> CancelTransferVoucherAsync(Guid id)
    {
        var voucher = await _db.TransferVouchers
            .Include(tv => tv.FromTreasury)
            .Include(tv => tv.ToTreasury)
            .FirstOrDefaultAsync(tv => tv.Id == id);

        if (voucher is null) return null;
        if (voucher.Status != JournalEntryStatus.Posted)
            throw new InvalidOperationException($"Cannot cancel transfer in {voucher.Status} status.");

        var useTransactions = _db.Database.IsRelational();
        IDbContextTransaction? transaction = useTransactions ? await _db.Database.BeginTransactionAsync() : null;

        try
        {
            var fromTreasury = voucher.FromTreasury;
            var toTreasury = voucher.ToTreasury;

            // Resolve company/branch and active fiscal year so the reversing entry never
            // carries an empty FiscalYearId (FK violation / raw 500).
            var companyId = voucher.CompanyId != Guid.Empty ? voucher.CompanyId : fromTreasury.CompanyId;
            var branchId = voucher.BranchId ?? fromTreasury.BranchId;
            var fiscalYear = await GetActiveFiscalYearAsync(companyId, DateTime.UtcNow);

            // Create reversing Journal Entry: Debit source treasury, Credit destination treasury
            var journalEntry = new JournalEntry
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                BranchId = branchId,
                FiscalYearId = fiscalYear.Id,
                EntryNumber = await GenerateJournalEntryNumberAsync(),
                Description = $"Cancel Transfer: {fromTreasury.Name} → {toTreasury.Name}",
                EntryDate = DateTime.UtcNow,
                Status = JournalEntryStatus.Posted,
                PostedByUserId = voucher.CreatedByUserId,
                SourceDocumentType = "TransferVoucher",
                SourceDocumentId = voucher.Id.ToString(),
                PostedAt = DateTime.UtcNow
            };

            journalEntry.Lines.Add(new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                AccountId = fromTreasury.AccountId,
                Debit = voucher.Amount,
                Credit = 0,
                Description = $"Cancel transfer - restore {fromTreasury.Name}"
            });
            journalEntry.Lines.Add(new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                AccountId = toTreasury.AccountId,
                Debit = 0,
                Credit = voucher.Amount,
                Description = $"Cancel transfer - reverse {toTreasury.Name}"
            });

            _db.JournalEntries.Add(journalEntry);

            // Reverse treasury balances
            fromTreasury.Balance += voucher.Amount;
            toTreasury.Balance -= voucher.Amount;

            voucher.Status = JournalEntryStatus.Cancelled;

            await _db.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

            return await GetTransferVoucherByIdAsync(id);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    // ═══════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════

    /// <summary>
    /// Resolves the active fiscal year for a company for the given transaction date.
    /// Prefers an active fiscal year whose [StartDate, EndDate] contains the date, then
    /// falls back to any active fiscal year, and finally throws a clear business error —
    /// so callers never insert a JournalEntry with an empty/invalid FiscalYearId (which
    /// would surface as a raw Npgsql 23503 FK violation / HTTP 500).
    /// </summary>
    private async Task<FiscalYear> GetActiveFiscalYearAsync(Guid companyId, DateTime transactionDate)
    {
        var fiscalYear = await _db.FiscalYears
            .FirstOrDefaultAsync(fy => fy.CompanyId == companyId && fy.IsActive
                                       && fy.StartDate <= transactionDate && transactionDate <= fy.EndDate)
            ?? await _db.FiscalYears.FirstOrDefaultAsync(fy => fy.CompanyId == companyId && fy.IsActive);

        return fiscalYear
            ?? throw new InvalidOperationException("No active fiscal year found for this transaction date.");
    }

    private async Task<string> GenerateVoucherNumberAsync(VoucherType type)
    {
        var prefix = type == VoucherType.Receipt ? "RV" : "PV";
        var count = await _db.CashVouchers.CountAsync(cv => cv.VoucherType == type) + 1;
        return $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{count:D4}";
    }

    private async Task<string> GenerateTransferNumberAsync()
    {
        var count = await _db.TransferVouchers.CountAsync() + 1;
        return $"TRF-{DateTime.UtcNow:yyyyMMdd}-{count:D4}";
    }

    private async Task<string> GenerateJournalEntryNumberAsync()
    {
        var count = await _db.JournalEntries.CountAsync() + 1;
        return $"JE-{DateTime.UtcNow:yyyyMMdd}-{count:D4}";
    }

    private static CashVoucherResponse MapCashVoucherToResponse(CashVoucher cv) => new(
        cv.Id,
        cv.VoucherNumber,
        cv.VoucherType,
        cv.Date,
        cv.TreasuryId,
        cv.Treasury.Name,
        cv.PartyType,
        cv.PartyId,
        null, // PartyName resolved at controller level if needed
        cv.TargetAccountId,
        cv.TargetAccount.Name,
        cv.Amount,
        cv.Description,
        cv.Status,
        cv.JournalEntryId,
        cv.JournalEntry?.EntryNumber,
        cv.CreatedAt
    );

    private static TransferVoucherResponse MapTransferToResponse(TransferVoucher tv) => new(
        tv.Id,
        tv.TransferNumber,
        tv.Date,
        tv.FromTreasuryId,
        tv.FromTreasury.Name,
        tv.ToTreasuryId,
        tv.ToTreasury.Name,
        tv.Amount,
        tv.Reference,
        tv.Status,
        tv.JournalEntryId,
        tv.JournalEntry?.EntryNumber,
        tv.CreatedAt
    );
}
