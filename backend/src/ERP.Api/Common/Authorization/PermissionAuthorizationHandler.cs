using System.Security.Claims;
using System.Text.Json;
using ERP.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Common.Authorization;

/// <summary>
/// Server-side permission enforcement handler.
/// Checks user's PermissionsJson (direct permissions) + role-based permissions.
/// PERMISSIONS.md §18: "Permissions must be enforced on the Backend."
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionAuthorizationRequirement>
{
    private readonly AppDbContext _db;

    public PermissionAuthorizationHandler(AppDbContext db)
    {
        _db = db;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionAuthorizationRequirement requirement)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? context.User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid))
        {
            return; // Not authenticated
        }

        // Load user with roles and their permissions
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userIdGuid);

        if (user == null || !user.IsActive)
        {
            return; // Inactive user
        }

        // 1. Check direct user permissions (PermissionsJson)
        var directPermissions = JsonSerializer.Deserialize<List<string>>(user.PermissionsJson) ?? new List<string>();
        if (directPermissions.Contains(requirement.Permission))
        {
            context.Succeed(requirement);
            return;
        }

        // 2. Check role-based permissions
        foreach (var userRole in user.UserRoles)
        {
            if (userRole.Role?.RolePermissions?.Any(rp => rp.Permission?.Name == requirement.Permission) == true)
            {
                context.Succeed(requirement);
                return;
            }
        }

        // Permission not found - deny
    }
}
