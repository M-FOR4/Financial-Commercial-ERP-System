namespace ERP.Api.Domain.Entities;

/// <summary>
/// Standalone unit of measurement. E.g. "Meter", "Carton", "Piece", "Kilogram"
/// </summary>
public class Unit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;        // e.g. "Meter"
    public string? Symbol { get; set; }                     // e.g. "m", "pcs"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
