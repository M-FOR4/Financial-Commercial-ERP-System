using Microsoft.AspNetCore.Authorization;

namespace ERP.Api.Common.Authorization;

/// <summary>
/// Authorize based on granular permission name (e.g. "Sales.Invoice.View").
/// Must be used with PermissionAuthorizationHandler.
/// </summary>
public class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission) : base(policy: permission)
    {
    }
}
