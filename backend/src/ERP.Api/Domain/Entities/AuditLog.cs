namespace ERP.Api.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string Action { get; set; } = string.Empty;       // e.g. "POST", "CANCEL", "APPROVE"
    public string EntityName { get; set; } = string.Empty;   // e.g. "SalesInvoice"
    public string? EntityId { get; set; }
    public string? Details { get; set; }                      // JSON or text description
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Reason { get; set; }
    public string? IPAddress { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
