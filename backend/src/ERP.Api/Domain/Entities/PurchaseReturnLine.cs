namespace ERP.Api.Domain.Entities;

public class PurchaseReturnLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PurchaseReturnId { get; set; }
    public PurchaseReturn PurchaseReturn { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid? OriginalInvoiceLineId { get; set; }
    public PurchaseInvoiceLine? OriginalInvoiceLine { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
}
