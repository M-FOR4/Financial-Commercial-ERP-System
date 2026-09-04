namespace ERP.Api.Domain.Entities;

/// <summary>
/// Granular permission definition. E.g. "Sales.Invoice.View", "Inventory.Item.Add"
/// </summary>
public class Permission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;          // e.g. "Sales.Invoice.View"
    public string Module { get; set; } = string.Empty;        // e.g. "Sales"
    public string Category { get; set; } = string.Empty;      // e.g. "Sales Invoice"
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
