using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace ERP.Api.Common.Authorization;

/// <summary>
/// Custom policy provider that recognizes permission names as policy names.
/// When [HasPermission("Sales.Invoice.View")] is used, it creates a policy
/// with a PermissionAuthorizationRequirement for "Sales.Invoice.View".
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private const string PERMISSION_PREFIX = "";
    private readonly DefaultAuthorizationPolicyProvider _fallbackProvider;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        _fallbackProvider = new DefaultAuthorizationPolicyProvider(options);
    }

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (string.IsNullOrEmpty(policyName))
        {
            return Task.FromResult<AuthorizationPolicy?>(null);
        }

        // If it's a permission name (not a built-in policy), create a custom policy
        var policyBuilder = new AuthorizationPolicyBuilder();
        policyBuilder.AddRequirements(new PermissionAuthorizationRequirement(policyName));
        return Task.FromResult<AuthorizationPolicy?>(policyBuilder.Build());
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() =>
        _fallbackProvider.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() =>
        _fallbackProvider.GetFallbackPolicyAsync();
}
