using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Admin")]
public class AuditController : ControllerBase
{
    private readonly IAuditService _auditService;

    public AuditController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] Guid? userId,
        [FromQuery] string? action,
        [FromQuery] string? entityName,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 100)
    {
        var logs = await _auditService.GetLogsAsync(userId, action, entityName, fromDate, toDate, skip, take);
        var total = await _auditService.GetLogsCountAsync(userId, action, entityName, fromDate, toDate);
        return Ok(new { logs, total });
    }
}
