using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public interface ISystemSettingsService
{
    Task<SystemSettingsDto> GetAsync(Guid companyId);
    Task<SystemSettingsDto> UpdateAsync(Guid companyId, UpdateSystemSettingsRequest request, Guid? updatedByUserId);
    /// <summary>Business-logic helper: returns stored settings or factory defaults when no row exists.</summary>
    Task<SystemSettingsDto> GetOrDefaultAsync(Guid companyId);
}

/// <summary>
/// Per-company general system settings. One row per company; absent rows read as
/// factory defaults (all features off). Updates are audited (readme.md §7 Security).
/// </summary>
public class SystemSettingsService : ISystemSettingsService
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;
    private readonly ILogger<SystemSettingsService> _logger;

    public SystemSettingsService(AppDbContext context, IAuditService auditService, ILogger<SystemSettingsService> logger)
    {
        _context = context;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<SystemSettingsDto> GetAsync(Guid companyId)
    {
        var settings = await _context.SystemSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);
        return settings == null ? new SystemSettingsDto(AllowNegativeStock: false) : settings.ToDto();
    }

    public async Task<SystemSettingsDto> GetOrDefaultAsync(Guid companyId)
    {
        // Same behavior as GetAsync; named explicitly for business-logic call sites
        // so the default contract is obvious when reading posting rules.
        return await GetAsync(companyId);
    }

    public async Task<SystemSettingsDto> UpdateAsync(Guid companyId, UpdateSystemSettingsRequest request, Guid? updatedByUserId)
    {
        var settings = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);

        var before = settings == null ? null : settings.ToDto();
        var created = false;

        if (settings == null)
        {
            settings = new SystemSetting { CompanyId = companyId };
            _context.SystemSettings.Add(settings);
            created = true;
        }

        settings.AllowNegativeStock = request.AllowNegativeStock;
        settings.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var after = settings.ToDto();
        var details = $"AllowNegativeStock: {(before?.AllowNegativeStock ?? false)} → {after.AllowNegativeStock}";
        await _auditService.LogAsync(
            updatedByUserId,
            created ? "CREATE" : "UPDATE",
            "SystemSetting",
            companyId.ToString(),
            details);

        _logger.LogInformation(
            "System settings updated for company {CompanyId}: AllowNegativeStock={AllowNegativeStock} (by user {UserId})",
            companyId, after.AllowNegativeStock, updatedByUserId);

        return after;
    }
}
