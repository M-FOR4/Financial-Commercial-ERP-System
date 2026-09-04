using Microsoft.AspNetCore.Authorization;

namespace ERP.Api.Common.Authorization;

/// <summary>
/// Represents a requirement that the user must have a specific permission.
/// </summary>
public class PermissionAuthorizationRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionAuthorizationRequirement(string permission)
    {
        Permission = permission;
    }
}
