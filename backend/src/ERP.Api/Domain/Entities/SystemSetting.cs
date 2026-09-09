namespace ERP.Api.Domain.Entities;

/// <summary>
/// Per-company system configuration (General Settings).
/// One row per company; missing rows mean factory defaults (see SystemSettingsService).
/// README.md §7 Inventory: "Negative stock is controlled by system settings and permissions."
/// </summary>
public class SystemSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    /// <summary>
    /// When true, sales invoices may be posted even when the requested quantity exceeds
    /// the available stock (inventory balance may go negative). COGS for such lines uses
    /// the product's last known purchase price. When false (default), posting beyond
    /// available stock is rejected.
    /// </summary>
    public bool AllowNegativeStock { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
