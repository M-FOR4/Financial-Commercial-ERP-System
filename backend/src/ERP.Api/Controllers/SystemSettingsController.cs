using System.Security.Claims;
using ERP.Api.Data;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SystemSettingsController : ControllerBase
{
    private readonly ISystemSettingsService _settingsService;
    private readonly AppDbContext _context;

    public SystemSettingsController(ISystemSettingsService settingsService, AppDbContext context)
    {
        _settingsService = settingsService;
        _context = context;
    }

    private async Task<Guid> GetCompanyIdAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user.");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        return user?.CompanyId ?? throw new UnauthorizedAccessException("User company not found.");
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;
    }

    [HasPermission("Admin.Settings.View")]
    [HttpGet("general")]
    public async Task<IActionResult> GetGeneral()
    {
        var companyId = await GetCompanyIdAsync();
        return Ok(await _settingsService.GetAsync(companyId));
    }

    [HasPermission("Admin.Settings.Edit")]
    [HttpPut("general")]
    public async Task<IActionResult> UpdateGeneral([FromBody] UpdateSystemSettingsRequest request)
    {
        try
        {
            var companyId = await GetCompanyIdAsync();
            var updated = await _settingsService.UpdateAsync(companyId, request, GetUserId());
            return Ok(new { success = true, message = "تم حفظ الإعدادات بنجاح.", settings = updated });
        }
        catch (Exception ex) when (ex is DbUpdateException or UnauthorizedAccessException)
        {
            return BadRequest(new { success = false, message = "تعذر حفظ الإعدادات." });
        }
    }
}
