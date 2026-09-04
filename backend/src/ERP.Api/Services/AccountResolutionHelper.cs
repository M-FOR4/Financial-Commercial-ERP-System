using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

/// <summary>
/// Resolves ledger accounts from the AccountingDefaults configuration table per company.
/// Falls back to hard-coded account codes during migration for backward compatibility.
/// Per ACCOUNTING_RULES.md §30, all account references must go through this helper.
/// </summary>
public static class AccountResolutionHelper
{
    /// <summary>
    /// Load the AccountingDefaults for a given company. Returns null if not configured.
    /// </summary>
    public static async Task<AccountingDefaults?> GetDefaultsAsync(AppDbContext context, Guid companyId)
    {
        return await context.AccountingDefaults
            .AsNoTracking()
            .FirstOrDefaultAsync(ad => ad.CompanyId == companyId);
    }

    /// <summary>
    /// Resolve a specific account by its AccountingDefaults navigation property.
    /// Falls back to a hard-coded code if the defaults row is missing or the FK is null.
    /// </summary>
    public static async Task<Account> ResolveAsync(
        AppDbContext context,
        Guid companyId,
        Guid? configuredAccountId,
        string fallbackCode,
        string accountLabel)
    {
        // Try configured account first
        if (configuredAccountId.HasValue)
        {
            var account = await context.Accounts.FindAsync(configuredAccountId.Value);
            if (account != null) return account;
        }

        // Fallback to hard-coded code
        var fallback = await context.Accounts.FirstOrDefaultAsync(a => a.Code == fallbackCode);
        if (fallback != null) return fallback;

        throw new InvalidOperationException(
            $"AccountingDefaults {accountLabel} not configured for company, " +
            $"and fallback account code '{fallbackCode}' not found in Chart of Accounts.");
    }

    /// <summary>
    /// Convenience: resolve all 4 accounts needed for a sales invoice post/cancel.
    /// </summary>
    public static async Task<(Account AR, Account SalesRevenue, Account Cogs, Account Inventory)>
        ResolveSalesAccountsAsync(AppDbContext context, Guid companyId)
    {
        var defaults = await GetDefaultsAsync(context, companyId);

        var ar = await ResolveAsync(context, companyId,
            defaults?.DefaultCustomerArAccountId, "1130", "Accounts Receivable");
        var salesRevenue = await ResolveAsync(context, companyId,
            defaults?.SalesRevenueAccountId, "4100", "Sales Revenue");
        var cogs = await ResolveAsync(context, companyId,
            defaults?.CogsAccountId, "5100", "Cost of Goods Sold");
        var inventory = await ResolveAsync(context, companyId,
            defaults?.InventoryAccountId, "1140", "Inventory");

        return (ar, salesRevenue, cogs, inventory);
    }

    /// <summary>
    /// Convenience: resolve all 2 accounts needed for a purchase invoice post/cancel.
    /// </summary>
    public static async Task<(Account Inventory, Account AP)>
        ResolvePurchaseAccountsAsync(AppDbContext context, Guid companyId)
    {
        var defaults = await GetDefaultsAsync(context, companyId);

        var inventory = await ResolveAsync(context, companyId,
            defaults?.InventoryAccountId, "1140", "Inventory");
        var ap = await ResolveAsync(context, companyId,
            defaults?.DefaultSupplierApAccountId, "2110", "Accounts Payable");

        return (inventory, ap);
    }

    /// <summary>
    /// Convenience: resolve accounts for fixed asset disposal (gain/loss).
    /// </summary>
    public static async Task<Account?>
        ResolveDisposalGainLossAccountAsync(AppDbContext context, Guid companyId, bool isLoss)
    {
        var defaults = await GetDefaultsAsync(context, companyId);

        if (isLoss)
        {
            // Use InventoryLoss account as fallback for disposal losses
            if (defaults?.InventoryLossAccountId.HasValue == true)
            {
                var acc = await context.Accounts.FindAsync(defaults.InventoryLossAccountId.Value);
                if (acc != null) return acc;
            }
            return await context.Accounts.FirstOrDefaultAsync(a => a.Code == "5500");
        }
        else
        {
            // Use InventoryGain account as fallback for disposal gains
            if (defaults?.InventoryGainAccountId.HasValue == true)
            {
                var acc = await context.Accounts.FindAsync(defaults.InventoryGainAccountId.Value);
                if (acc != null) return acc;
            }
            return await context.Accounts.FirstOrDefaultAsync(a => a.Code == "4200");
        }
    }
}
