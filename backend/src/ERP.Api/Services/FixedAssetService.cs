using ERP.Api.Common;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace ERP.Api.Services;

public class FixedAssetService : IFixedAssetService
{
    private readonly AppDbContext _db;

    public FixedAssetService(AppDbContext db)
    {
        _db = db;
    }

    // ═══════════════════════════════════
    //  ASSET CATEGORIES
    // ═══════════════════════════════════

    public async Task<List<AssetCategoryResponse>> GetAllAssetCategoriesAsync()
    {
        return await _db.AssetCategories
            .Include(ac => ac.AssetAccount)
            .Include(ac => ac.AccumulatedDepreciationAccount)
            .Include(ac => ac.DepreciationExpenseAccount)
            .AsNoTracking()
            .OrderBy(ac => ac.Code)
            .Select(ac => MapCategoryToResponse(ac))
            .ToListAsync();
    }

    public async Task<AssetCategoryResponse?> GetAssetCategoryByIdAsync(Guid id)
    {
        var ac = await _db.AssetCategories
            .Include(ac => ac.AssetAccount)
            .Include(ac => ac.AccumulatedDepreciationAccount)
            .Include(ac => ac.DepreciationExpenseAccount)
            .AsNoTracking()
            .FirstOrDefaultAsync(ac => ac.Id == id);
        return ac is null ? null : MapCategoryToResponse(ac);
    }

    public async Task<AssetCategoryResponse> CreateAssetCategoryAsync(AssetCategoryRequest request)
    {
        if (await _db.AssetCategories.AnyAsync(ac => ac.Code == request.Code))
            throw new InvalidOperationException($"Asset category code '{request.Code}' already exists.");

        // Validate GL accounts exist and are not headers
        var assetAcc = await _db.Accounts.FindAsync(request.AssetAccountId)
            ?? throw new InvalidOperationException("Asset account not found.");
        if (assetAcc.IsHeader) throw new InvalidOperationException("Cannot use a header account for assets.");

        var accumAcc = await _db.Accounts.FindAsync(request.AccumulatedDepreciationAccountId)
            ?? throw new InvalidOperationException("Accumulated Depreciation account not found.");
        if (accumAcc.IsHeader) throw new InvalidOperationException("Cannot use a header account for accumulated depreciation.");

        var deprExpAcc = await _db.Accounts.FindAsync(request.DepreciationExpenseAccountId)
            ?? throw new InvalidOperationException("Depreciation Expense account not found.");
        if (deprExpAcc.IsHeader) throw new InvalidOperationException("Cannot use a header account for depreciation expense.");

        var category = new AssetCategory
        {
            Id = Guid.NewGuid(),
            Code = request.Code,
            Name = request.Name,
            AssetAccountId = request.AssetAccountId,
            AccumulatedDepreciationAccountId = request.AccumulatedDepreciationAccountId,
            DepreciationExpenseAccountId = request.DepreciationExpenseAccountId,
            DefaultUsefulLifeYears = request.DefaultUsefulLifeYears,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.AssetCategories.Add(category);
        await _db.SaveChangesAsync();

        return await GetAssetCategoryByIdAsync(category.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created category.");
    }

    public async Task<AssetCategoryResponse?> UpdateAssetCategoryAsync(Guid id, AssetCategoryRequest request)
    {
        var category = await _db.AssetCategories.FindAsync(id);
        if (category is null) return null;

        if (await _db.AssetCategories.AnyAsync(ac => ac.Code == request.Code && ac.Id != id))
            throw new InvalidOperationException($"Asset category code '{request.Code}' already exists.");

        category.Code = request.Code;
        category.Name = request.Name;
        category.AssetAccountId = request.AssetAccountId;
        category.AccumulatedDepreciationAccountId = request.AccumulatedDepreciationAccountId;
        category.DepreciationExpenseAccountId = request.DepreciationExpenseAccountId;
        category.DefaultUsefulLifeYears = request.DefaultUsefulLifeYears;

        await _db.SaveChangesAsync();
        return await GetAssetCategoryByIdAsync(id);
    }

    public async Task<bool> DeleteAssetCategoryAsync(Guid id)
    {
        var category = await _db.AssetCategories.FindAsync(id);
        if (category is null) return false;
        category.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    // ═══════════════════════════════════
    //  FIXED ASSETS
    // ═══════════════════════════════════

    public async Task<List<FixedAssetResponse>> GetAllFixedAssetsAsync()
    {
        return await _db.FixedAssets
            .Include(fa => fa.Category)
            .Include(fa => fa.JournalEntry)
            .AsNoTracking()
            .OrderBy(fa => fa.AssetCode)
            .Select(fa => MapAssetToResponse(fa))
            .ToListAsync();
    }

    public async Task<FixedAssetResponse?> GetFixedAssetByIdAsync(Guid id)
    {
        var fa = await _db.FixedAssets
            .Include(fa => fa.Category)
            .Include(fa => fa.JournalEntry)
            .AsNoTracking()
            .FirstOrDefaultAsync(fa => fa.Id == id);
        return fa is null ? null : MapAssetToResponse(fa);
    }

    public async Task<FixedAssetResponse> CreateFixedAssetAsync(FixedAssetRequest request)
    {
        // Validate unique asset code
        if (await _db.FixedAssets.AnyAsync(fa => fa.AssetCode == request.AssetCode))
            throw new InvalidOperationException($"Asset code '{request.AssetCode}' already exists.");

        // Validate category
        var category = await _db.AssetCategories
            .Include(ac => ac.AssetAccount)
            .FirstOrDefaultAsync(ac => ac.Id == request.CategoryId)
            ?? throw new InvalidOperationException("Asset category not found.");

        // Validate basic economics
        if (request.PurchaseCost <= 0)
            throw new InvalidOperationException("Purchase cost must be greater than zero.");
        if (request.SalvageValue >= request.PurchaseCost)
            throw new InvalidOperationException("Salvage value must be less than purchase cost.");
        if (request.UsefulLifeYears <= 0)
            throw new InvalidOperationException("Useful life must be greater than zero.");

        var isRelational = _db.Database.IsRelational();
        IDbContextTransaction? transaction = isRelational ? await _db.Database.BeginTransactionAsync() : null;

        try
        {
            // Create the asset
            var asset = new FixedAsset
            {
                Id = Guid.NewGuid(),
                AssetCode = request.AssetCode,
                Name = request.Name,
                CategoryId = request.CategoryId,
                PurchaseDate = request.PurchaseDate.ToUtc(),
                PurchaseCost = request.PurchaseCost,
                SalvageValue = request.SalvageValue,
                UsefulLifeYears = request.UsefulLifeYears,
                CurrentBookValue = request.PurchaseCost,
                AccumulatedDepreciation = 0,
                Status = AssetStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            // Post registration Journal Entry: Debit Fixed Asset Account, Credit Cash (default to 1110)
            // Resolve cash account from AccountingDefaults (ACCOUNTING_RULES §30)
            var cashAccount = await AccountResolutionHelper.ResolveAsync(_db, category.CompanyId, null, "1110", "Cash/Bank");
            var je = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = await GenerateJournalEntryNumberAsync(),
                EntryDate = request.PurchaseDate.ToUtc(),
                Description = $"Register Fixed Asset: {request.Name} ({request.AssetCode})",
                Status = JournalEntryStatus.Posted,
                PostedAt = DateTime.UtcNow
            };
            je.Lines.Add(new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                AccountId = category.AssetAccountId,
                Debit = request.PurchaseCost,
                Credit = 0,
                Description = $"Asset: {request.Name}"
            });
            je.Lines.Add(new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                AccountId = cashAccount.Id,
                Debit = 0,
                Credit = request.PurchaseCost,
                Description = $"Payment for: {request.Name}"
            });

            // Update account balances
            var assetAccount = await _db.Accounts.FindAsync(category.AssetAccountId)!;
            assetAccount.Balance += request.PurchaseCost;
            assetAccount.UpdatedAt = DateTime.UtcNow;
            cashAccount.Balance -= request.PurchaseCost;
            cashAccount.UpdatedAt = DateTime.UtcNow;

            asset.JournalEntryId = je.Id;

            _db.JournalEntries.Add(je);
            _db.FixedAssets.Add(asset);
            await _db.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

            return await GetFixedAssetByIdAsync(asset.Id)
                ?? throw new InvalidOperationException("Failed to retrieve created asset.");
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<FixedAssetResponse?> UpdateFixedAssetAsync(Guid id, FixedAssetRequest request)
    {
        var asset = await _db.FixedAssets.FindAsync(id);
        if (asset is null) return null;

        if (asset.Status != AssetStatus.Active)
            throw new InvalidOperationException("Only active assets can be updated.");

        if (await _db.FixedAssets.AnyAsync(fa => fa.AssetCode == request.AssetCode && fa.Id != id))
            throw new InvalidOperationException($"Asset code '{request.AssetCode}' already exists.");

        asset.AssetCode = request.AssetCode;
        asset.Name = request.Name;
        asset.CategoryId = request.CategoryId;
        asset.PurchaseDate = request.PurchaseDate.ToUtc();
        asset.PurchaseCost = request.PurchaseCost;
        asset.SalvageValue = request.SalvageValue;
        asset.UsefulLifeYears = request.UsefulLifeYears;
        asset.CurrentBookValue = request.PurchaseCost - asset.AccumulatedDepreciation;
        asset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await GetFixedAssetByIdAsync(id);
    }

    // ═══════════════════════════════════
    //  DEPRECIATION (SLM - D-031)
    // ═══════════════════════════════════

    public async Task<DepreciationRunResponse> RunDepreciationAsync(DepreciationRunRequest request)
    {
        // Npgsql requires UTC Kind for timestamptz columns; body dates arrive as Unspecified.
        request = request with
        {
            PeriodStartDate = request.PeriodStartDate.ToUtc(),
            PeriodEndDate = request.PeriodEndDate.ToUtc()
        };

        if (request.PeriodStartDate >= request.PeriodEndDate)
            throw new InvalidOperationException("Period start date must be before end date.");

        var activeAssets = await _db.FixedAssets
            .Include(fa => fa.Category)
            .Where(fa => fa.Status == AssetStatus.Active && fa.CurrentBookValue > fa.SalvageValue)
            .ToListAsync();

        var isRelational = _db.Database.IsRelational();
        IDbContextTransaction? transaction = isRelational ? await _db.Database.BeginTransactionAsync() : null;

        var results = new List<DepreciationResultItem>();
        decimal totalDepreciation = 0;

        try
        {
            // Calculate number of months in the period
            var months = (request.PeriodEndDate.Year - request.PeriodStartDate.Year) * 12
                        + request.PeriodEndDate.Month - request.PeriodStartDate.Month;
            if (months <= 0) months = 1;

            // Create one consolidated Journal Entry for all depreciation
            var je = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = await GenerateJournalEntryNumberAsync(),
                EntryDate = request.PeriodEndDate,
                Description = $"Depreciation Period: {request.PeriodStartDate:yyyy-MM-dd} to {request.PeriodEndDate:yyyy-MM-dd}",
                Status = JournalEntryStatus.Posted,
                PostedAt = DateTime.UtcNow
            };

            // Group depreciation by expense account
            var deprByAccount = new Dictionary<Guid, decimal>();

            foreach (var asset in activeAssets)
            {
                // SLM: MonthlyDepreciation = (PurchaseCost - SalvageValue) / (UsefulLifeYears * 12)
                var monthlyDepr = asset.MonthlyDepreciation;
                var periodDepreciation = monthlyDepr * months;

                // Cap depreciation at remaining depreciable amount
                var maxDepreciable = asset.CurrentBookValue - asset.SalvageValue;
                if (periodDepreciation > maxDepreciable)
                    periodDepreciation = maxDepreciable;

                if (periodDepreciation <= 0)
                    continue;

                // Update asset
                asset.AccumulatedDepreciation += periodDepreciation;
                asset.CurrentBookValue -= periodDepreciation;
                asset.UpdatedAt = DateTime.UtcNow;

                // Check if fully depreciated
                if (asset.CurrentBookValue <= asset.SalvageValue + 0.01m)
                {
                    asset.CurrentBookValue = asset.SalvageValue;
                    asset.Status = AssetStatus.FullyDepreciated;
                }

                // Track depreciation by expense account for consolidated JE
                var expenseAccountId = asset.Category.DepreciationExpenseAccountId;
                if (!deprByAccount.ContainsKey(expenseAccountId))
                    deprByAccount[expenseAccountId] = 0;
                deprByAccount[expenseAccountId] += periodDepreciation;

                // Track depreciation by accumulated depreciation account
                var accumAccId = asset.Category.AccumulatedDepreciationAccountId;
                if (!deprByAccount.ContainsKey(accumAccId))
                    deprByAccount[accumAccId] = 0;
                // Accumulated depreciation will be credited (tracked separately)

                // Create DepreciationEntry audit trail
                var depEntry = new DepreciationEntry
                {
                    Id = Guid.NewGuid(),
                    AssetId = asset.Id,
                    ProcessDate = DateTime.UtcNow,
                    PeriodStartDate = request.PeriodStartDate,
                    PeriodEndDate = request.PeriodEndDate,
                    DepreciationAmount = periodDepreciation,
                    BookValueAfter = asset.CurrentBookValue,
                    CreatedAt = DateTime.UtcNow
                };

                depEntry.JournalEntryId = je.Id;
                _db.DepreciationEntries.Add(depEntry);

                totalDepreciation += periodDepreciation;
                results.Add(new DepreciationResultItem(
                    asset.Id, asset.AssetCode, asset.Name,
                    periodDepreciation, asset.CurrentBookValue, je.Id));
            }

            // Build consolidated journal entry lines
            // Debit: Depreciation Expense accounts, Credit: Accumulated Depreciation accounts
            var accumCredits = new Dictionary<Guid, decimal>();

            // Re-iterate to pair debits with credits by category
            foreach (var asset in activeAssets.Where(a => a.Status == AssetStatus.Active || a.Status == AssetStatus.FullyDepreciated))
            {
                var deprEntry = results.FirstOrDefault(r => r.AssetId == asset.Id);
                if (deprEntry is null) continue;

                var accumAccId = asset.Category.AccumulatedDepreciationAccountId;
                if (!accumCredits.ContainsKey(accumAccId))
                    accumCredits[accumAccId] = 0;
                accumCredits[accumAccId] += deprEntry.DepreciationAmount;
            }

            // Add expense lines (debits)
            foreach (var (accountId, amount) in deprByAccount.Where(kvp => activeAssets.Any(a => a.Category.DepreciationExpenseAccountId == kvp.Key)))
            {
                if (amount <= 0) continue;
                je.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = accountId,
                    Debit = amount,
                    Credit = 0,
                    Description = "Depreciation Expense"
                });
                var expenseAcc = await _db.Accounts.FindAsync(accountId);
                if (expenseAcc is not null)
                {
                    expenseAcc.Balance += amount;
                    expenseAcc.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Add accumulated depreciation lines (credits)
            foreach (var (accountId, amount) in accumCredits)
            {
                if (amount <= 0) continue;
                je.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = accountId,
                    Debit = 0,
                    Credit = amount,
                    Description = "Accumulated Depreciation"
                });
                var accumAcc = await _db.Accounts.FindAsync(accountId);
                if (accumAcc is not null)
                {
                    // Asset contra account: Credit increases the contra (reduces net asset)
                    accumAcc.Balance += amount;
                    accumAcc.UpdatedAt = DateTime.UtcNow;
                }
            }

            if (je.Lines.Count > 0)
                _db.JournalEntries.Add(je);

            await _db.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

            return new DepreciationRunResponse(results.Count, totalDepreciation, results);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<DepreciationEntryResponse>> GetDepreciationEntriesAsync(Guid? assetId = null)
    {
        var query = _db.DepreciationEntries
            .Include(de => de.Asset)
            .Include(de => de.JournalEntry)
            .AsNoTracking()
            .AsQueryable();

        if (assetId.HasValue)
            query = query.Where(de => de.AssetId == assetId.Value);

        return await query
            .OrderByDescending(de => de.ProcessDate)
            .Select(de => new DepreciationEntryResponse(
                de.Id, de.AssetId, de.Asset.AssetCode, de.Asset.Name,
                de.ProcessDate, de.PeriodStartDate, de.PeriodEndDate,
                de.DepreciationAmount, de.BookValueAfter,
                de.JournalEntryId, de.JournalEntry!.EntryNumber,
                de.CreatedAt))
            .ToListAsync();
    }

    // ═══════════════════════════════════
    //  DISPOSAL
    // ═══════════════════════════════════

    public async Task<AssetDisposalResponse> DisposeAssetAsync(Guid assetId, AssetDisposalRequest request)
    {
        var asset = await _db.FixedAssets
            .Include(fa => fa.Category)
            .FirstOrDefaultAsync(fa => fa.Id == assetId)
            ?? throw new InvalidOperationException("Asset not found.");

        if (asset.Status == AssetStatus.Disposed)
            throw new InvalidOperationException("Asset has already been disposed.");

        if (request.DisposalValue < 0)
            throw new InvalidOperationException("Disposal value cannot be negative.");

        var isRelational = _db.Database.IsRelational();
        IDbContextTransaction? transaction = isRelational ? await _db.Database.BeginTransactionAsync() : null;

        try
        {
            // Calculate gain/loss
            var gainOrLoss = request.DisposalValue - asset.CurrentBookValue;

            // Post disposal Journal Entry
            var je = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = await GenerateJournalEntryNumberAsync(),
                EntryDate = DateTime.UtcNow,
                Description = $"Dispose Asset: {asset.Name} ({asset.AssetCode}) — {request.Description}",
                Status = JournalEntryStatus.Posted,
                PostedAt = DateTime.UtcNow
            };

            // 1. Debit Cash (if disposal value > 0)
            if (request.DisposalValue > 0)
            {
                // Resolve cash account from AccountingDefaults (ACCOUNTING_RULES §30)
                var cashAccount = await AccountResolutionHelper.ResolveAsync(_db, asset.CompanyId, null, "1110", "Cash/Bank");
                je.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = cashAccount.Id,
                    Debit = request.DisposalValue,
                    Credit = 0,
                    Description = "Disposal proceeds"
                });
                cashAccount.Balance += request.DisposalValue;
                cashAccount.UpdatedAt = DateTime.UtcNow;
            }

            // 2. Debit Accumulated Depreciation (to remove it)
            var accumAcc = await _db.Accounts.FindAsync(asset.Category.AccumulatedDepreciationAccountId)!;
            if (asset.AccumulatedDepreciation > 0)
            {
                je.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = asset.Category.AccumulatedDepreciationAccountId,
                    Debit = asset.AccumulatedDepreciation,
                    Credit = 0,
                    Description = "Remove accumulated depreciation"
                });
                accumAcc.Balance -= asset.AccumulatedDepreciation;
                accumAcc.UpdatedAt = DateTime.UtcNow;
            }

            // 3. Debit Loss OR Credit Gain on disposal
            // Resolve gain/loss accounts from AccountingDefaults (ACCOUNTING_RULES §30)
            if (gainOrLoss < 0)
            {
                // Loss: debit expense
                var lossAcc = await AccountResolutionHelper.ResolveAsync(_db, asset.CompanyId, null, "5500", "Loss on Disposal");
                je.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = lossAcc.Id,
                    Debit = Math.Abs(gainOrLoss),
                    Credit = 0,
                    Description = "Loss on disposal"
                });
                lossAcc.Balance += Math.Abs(gainOrLoss);
                lossAcc.UpdatedAt = DateTime.UtcNow;
            }
            else if (gainOrLoss > 0)
            {
                // Gain: credit revenue/other income
                var gainAcc = await AccountResolutionHelper.ResolveAsync(_db, asset.CompanyId, null, "4200", "Gain on Disposal");
                je.Lines.Add(new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    AccountId = gainAcc.Id,
                    Debit = 0,
                    Credit = gainOrLoss,
                    Description = "Gain on disposal"
                });
                gainAcc.Balance += gainOrLoss;
                gainAcc.UpdatedAt = DateTime.UtcNow;
            }

            // 4. Credit Fixed Asset account (to remove it)
            var assetAcc = await _db.Accounts.FindAsync(asset.Category.AssetAccountId)!;
            je.Lines.Add(new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                AccountId = asset.Category.AssetAccountId,
                Debit = 0,
                Credit = asset.PurchaseCost,
                Description = "Remove asset from books"
            });
            assetAcc.Balance -= asset.PurchaseCost;
            assetAcc.UpdatedAt = DateTime.UtcNow;

            // Update asset status
            asset.Status = AssetStatus.Disposed;
            asset.JournalEntryId = je.Id;
            asset.UpdatedAt = DateTime.UtcNow;

            _db.JournalEntries.Add(je);
            await _db.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

            return new AssetDisposalResponse(
                asset.Id, asset.AssetCode, asset.Name,
                asset.PurchaseCost, asset.AccumulatedDepreciation,
                request.DisposalValue, gainOrLoss,
                je.Id, je.EntryNumber);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    // ═══════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════

    private async Task<string> GenerateJournalEntryNumberAsync()
    {
        var count = await _db.JournalEntries.CountAsync() + 1;
        return $"JE-{DateTime.UtcNow:yyyyMMdd}-{count:D4}";
    }

    private static AssetCategoryResponse MapCategoryToResponse(AssetCategory ac) => new(
        ac.Id, ac.Code, ac.Name,
        ac.AssetAccountId, ac.AssetAccount.Name,
        ac.AccumulatedDepreciationAccountId, ac.AccumulatedDepreciationAccount.Name,
        ac.DepreciationExpenseAccountId, ac.DepreciationExpenseAccount.Name,
        ac.DefaultUsefulLifeYears, ac.IsActive, ac.CreatedAt
    );

    private static FixedAssetResponse MapAssetToResponse(FixedAsset fa) => new(
        fa.Id, fa.AssetCode, fa.Name,
        fa.CategoryId, fa.Category.Name,
        fa.PurchaseDate, fa.PurchaseCost, fa.SalvageValue,
        fa.UsefulLifeYears, fa.CurrentBookValue, fa.AccumulatedDepreciation,
        fa.MonthlyDepreciation, fa.Status,
        fa.JournalEntryId, fa.JournalEntry?.EntryNumber,
        fa.CreatedAt
    );
}
