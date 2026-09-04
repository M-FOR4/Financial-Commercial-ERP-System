namespace ERP.Api.Domain.Entities;

public class PurchaseInvoiceLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PurchaseInvoiceId { get; set; }
    public PurchaseInvoice PurchaseInvoice { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal DirectUnitPrice { get; set; }
    public decimal AllocatedAdditionalCost { get; set; }  // D-030: Allocated additional cost per line
    public decimal EffectiveUnitCost { get; set; }        // DirectUnitPrice + (AllocatedAdditionalCost / Quantity)
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
}
