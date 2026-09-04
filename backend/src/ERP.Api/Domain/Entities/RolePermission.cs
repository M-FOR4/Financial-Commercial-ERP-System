namespace ERP.Api.Domain.Entities;

/// <summary>
/// Many-to-many: Role ↔ Permission
/// </summary>
public class RolePermission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
