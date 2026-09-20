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
    /// <summary>Seeded AR control account code (العملاء / المدينون).</summary>
    public const string DefaultArAccountCode = "1130";

    /// <summary>Seeded AP control account code (الموردون / الدائنون).</summary>
    public const string DefaultApAccountCode = "2110";

    /// <summary>
    /// Resolves an account row by its chart-of-accounts code, preferring the
    /// company-scoped match. Returns Guid.Empty when no such account exists
    /// (callers decide whether that is fatal).
    /// </summary>
    public static async Task<Guid> ResolveAccountByCodeAsync(
        AppDbContext context, Guid companyId, string code)
    {
        var account = await context.Accounts
            .FirstOrDefaultAsync(a => a.Code == code && a.CompanyId == companyId)
            ?? await context.Accounts.FirstOrDefaultAsync(a => a.Code == code);

        return account?.Id ?? Guid.Empty;
    }

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
    /// Convenience: resolve accounts needed for a sales invoice with VAT.
    /// Returns AR, Sales Revenue, Sales Discount, VAT Payable, COGS, Inventory.
    /// </summary>
    public static async Task<(Account AR, Account SalesRevenue, Account SalesDiscount, Account VatPayable, Account Cogs, Account Inventory)>
        ResolveSalesAccountsWithTaxAsync(AppDbContext context, Guid companyId)
    {
        var defaults = await GetDefaultsAsync(context, companyId);

        var ar = await ResolveAsync(context, companyId,
            defaults?.DefaultCustomerArAccountId, "1130", "Accounts Receivable");
        var salesRevenue = await ResolveAsync(context, companyId,
            defaults?.SalesRevenueAccountId, "4100", "Sales Revenue");
        var salesDiscount = await ResolveAsync(context, companyId,
            defaults?.SalesDiscountAccountId, "4110", "Sales Discount");
        var vatPayable = await ResolveAsync(context, companyId,
            defaults?.VatPayableAccountId, "2200", "VAT Payable");
        var cogs = await ResolveAsync(context, companyId,
            defaults?.CogsAccountId, "5100", "Cost of Goods Sold");
        var inventory = await ResolveAsync(context, companyId,
            defaults?.InventoryAccountId, "1140", "Inventory");

        return (ar, salesRevenue, salesDiscount, vatPayable, cogs, inventory);
    }

    /// <summary>
    /// Convenience: resolve accounts needed for a purchase invoice with VAT.
    /// Returns Inventory, AP, VAT Receivable, Purchase Discount.
    /// </summary>
    public static async Task<(Account Inventory, Account AP, Account VatReceivable, Account PurchaseDiscount)>
        ResolvePurchaseAccountsWithTaxAsync(AppDbContext context, Guid companyId)
    {
        var defaults = await GetDefaultsAsync(context, companyId);

        var inventory = await ResolveAsync(context, companyId,
            defaults?.InventoryAccountId, "1140", "Inventory");
        var ap = await ResolveAsync(context, companyId,
            defaults?.DefaultSupplierApAccountId, "2110", "Accounts Payable");
        var vatReceivable = await ResolveAsync(context, companyId,
            defaults?.VatReceivableAccountId, "1150", "VAT Receivable");
        var purchaseDiscount = await ResolveAsync(context, companyId,
            defaults?.PurchaseDiscountAccountId, "2125", "Purchase Discount");

        return (inventory, ap, vatReceivable, purchaseDiscount);
    }

    /// <summary>
    /// Convenience: resolve accounts for manual stock adjustments (gain/loss).
    /// </summary>
    public static async Task<(Account Inventory, Account Gain, Account Loss)>
        ResolveInventoryAdjustmentAccountsAsync(AppDbContext context, Guid companyId)
    {
        var defaults = await GetDefaultsAsync(context, companyId);

        var inventory = await ResolveAsync(context, companyId,
            defaults?.InventoryAccountId, "1140", "Inventory");
        var gain = await ResolveAsync(context, companyId,
            defaults?.InventoryGainAccountId, "4200", "Inventory Gain");
        var loss = await ResolveAsync(context, companyId,
            defaults?.InventoryLossAccountId, "5500", "Inventory Loss");

        return (inventory, gain, loss);
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
