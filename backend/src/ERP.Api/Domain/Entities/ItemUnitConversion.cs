namespace ERP.Api.Domain.Entities;

/// <summary>
/// Defines conversion rules for an item's units.
/// Example: 1 Carton = 100 Meter (where Meter is the base unit)
/// </summary>
public class ItemUnitConversion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid SourceUnitId { get; set; }
    public Unit SourceUnit { get; set; } = null!;
    public Guid BaseUnitId { get; set; }
    public Unit BaseUnit { get; set; } = null!;
    public decimal ConversionFactor { get; set; }  // 1 SourceUnit = ConversionFactor BaseUnits
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
