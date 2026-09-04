namespace ERP.Api.Domain.Entities;

public class SalesReturnLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SalesReturnId { get; set; }
    public SalesReturn SalesReturn { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid? OriginalInvoiceLineId { get; set; }
    public SalesInvoiceLine? OriginalInvoiceLine { get; set; }
    public decimal Quantity { get; set; }
    public decimal RestockUnitCost { get; set; }     // D-029: Locked to original UnitCostAtSale
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
}
