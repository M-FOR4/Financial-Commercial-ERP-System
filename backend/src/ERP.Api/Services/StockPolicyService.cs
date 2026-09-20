using ERP.Api.Data;
using ERP.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

/// <summary>
/// Centralized engine for enforcing inventory policy gates, specifically negative-stock permissions.
/// </summary>
public static class StockPolicyService
{
    /// <summary>
    /// Check whether negative stock is allowed for a company based on SystemSettings.
    /// </summary>
    public static async Task<bool> GetEffectiveAllowNegativeStockAsync(AppDbContext context, Guid companyId)
    {
        var settings = await context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);

        return settings?.AllowNegativeStock ?? false;
    }

    /// <summary>
    /// Enforce that a product has sufficient available stock at a specific warehouse for an outbound action.
    /// If negative stock is disabled for the company and stock is insufficient, throws an InvalidOperationException.
    /// </summary>
    public static async Task ValidateStockAvailabilityAsync(
        AppDbContext context,
        Guid companyId,
        Guid productId,
        Guid warehouseId,
        decimal requiredQuantity,
        string actionDescription)
    {
        if (requiredQuantity <= 0m)
            return;

        var allowNegative = await GetEffectiveAllowNegativeStockAsync(context, companyId);
        if (allowNegative)
            return;

        var product = await context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == productId);

        if (product == null)
            throw new InvalidOperationException($"المنتج غير موجود / Product with ID '{productId}' was not found.");

        // Calculate available stock at the specific warehouse
        var warehouseMovements = await context.StockMovements
            .AsNoTracking()
            .Where(sm => sm.CompanyId == companyId && sm.ProductId == productId && sm.WarehouseId == warehouseId)
            .ToListAsync();

        decimal warehouseStock = 0m;
        foreach (var m in warehouseMovements)
        {
            if (m.MovementType is MovementType.In or MovementType.TransferIn)
                warehouseStock += m.Quantity;
            else if (m.MovementType is MovementType.Out or MovementType.TransferOut)
                warehouseStock -= m.Quantity;
            else if (m.MovementType == MovementType.Adjustment)
                warehouseStock += m.Quantity; // Quantity can be positive or negative for adjustments
        }

        if (warehouseStock < requiredQuantity)
        {
            throw new InvalidOperationException(
                $"المخزون المتاح في المستودع غير كافٍ لـ '{actionDescription}'. المنتج: '{product.Name}' ({product.SKU})، المتوفر: {warehouseStock:N2}، المطلوب: {requiredQuantity:N2} / " +
                $"Insufficient stock in warehouse for '{actionDescription}'. Product: '{product.Name}' ({product.SKU}), Available: {warehouseStock:N2}, Required: {requiredQuantity:N2}.");
        }
    }
}
