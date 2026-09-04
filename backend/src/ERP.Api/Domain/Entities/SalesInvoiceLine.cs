namespace ERP.Api.Domain.Entities;

public class SalesInvoiceLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SalesInvoiceId { get; set; }
    public SalesInvoice SalesInvoice { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal UnitCostAtSale { get; set; }      // D-029: Snapshot at time of posting
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }
}
