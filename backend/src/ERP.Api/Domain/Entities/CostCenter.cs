namespace ERP.Api.Domain.Entities;

/// <summary>
/// Cost Center for management and financial analysis.
/// Cost Center is NOT an Account — it is a separate analytical dimension.
/// </summary>
public class CostCenter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
