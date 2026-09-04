namespace ERP.Api.Domain.Entities;

/// <summary>
/// Many-to-many: User ↔ Role
/// Effective permissions = (all permissions from all assigned roles) + (direct user permissions)
/// </summary>
public class UserRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
