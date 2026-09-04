namespace ERP.Api.Domain.Entities;

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    // Base inventory unit
    public string? UnitOfMeasure { get; set; }
    public Guid BaseUnitId { get; set; }
    public Unit BaseUnit { get; set; } = null!;

    public decimal PurchasePrice { get; set; } = 0m;
    public decimal SellingPrice { get; set; } = 0m;
    public decimal CurrentStock { get; set; } = 0m;    // Derived from StockMovements (cached)
    public decimal MinStockLevel { get; set; } = 0m;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
    public ICollection<ItemUnitConversion> UnitConversions { get; set; } = new List<ItemUnitConversion>();
}
