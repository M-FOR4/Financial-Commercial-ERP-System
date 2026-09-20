using ERP.Api.Domain.Entities;

namespace ERP.Api.Services;

/// <summary>
/// Shared tax-base and rounding helpers for automated invoice postings.
///
/// The ERP’s approved policy for V1 is:
///  - Tax base is net-of-discount on both frontend and backend.
///  - Monetary values are rounded to 4 decimal places using MidpointRounding.AwayFromZero.
///  - Any line/tax rounding residual is assigned to the highest-value line via JournalBuilder.
/// </summary>
public static class InvoiceTaxHelper
{
    /// <summary>
    /// Net taxable base for sales = SubTotal - Discounts.
    /// This matches the frontend’s practice of computing tax on the net after discounts.
    /// </summary>
    public static decimal SalesTaxBase(decimal subTotal, decimal discountAmount) =>
        Math.Max(0m, subTotal - discountAmount);

    /// <summary>
    /// Sales tax amount = TaxBase * (TaxRate / 100).
    /// The result is rounded to monetary precision in the calling builder step.
    /// </summary>
    public static decimal CalculateSalesTax(decimal taxBase, decimal taxRate) =>
        taxBase * (taxRate / 100m);

    /// <summary>
    /// Purchase tax base is typically the taxable goods/subtotal portion.
    /// In this ERP’s current purchase DTO, tax amount is supplied explicitly, so this
    /// helper exists for symmetry/future VAT-base derivations (e.g. recoverable input VAT).
    /// </summary>
    public static decimal PurchaseTaxBase(decimal taxableSubtotal, decimal taxRate) =>
        taxableSubtotal * (taxRate / 100m);
}
