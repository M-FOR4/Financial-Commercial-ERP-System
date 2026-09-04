using System.Security.Claims;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(IInventoryService inventoryService, ILogger<InventoryController> logger)
    {
        _inventoryService = inventoryService;
        _logger = logger;
    }

    [HttpGet("movements")]
    public async Task<IActionResult> GetStockMovements(
        [FromQuery] Guid? productId,
        [FromQuery] Guid? warehouseId,
        [FromQuery] MovementType? type,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var movements = await _inventoryService.GetStockMovementsAsync(productId, warehouseId, type, fromDate, toDate);
        return Ok(movements);
    }

    [HttpPost("movements")]
    public async Task<IActionResult> CreateStockMovement([FromBody] CreateStockMovementRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value;
            Guid? userId = Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;

            var created = await _inventoryService.CreateStockMovementAsync(request, userId);
            return CreatedAtAction(nameof(GetStockMovements), new { productId = created.ProductId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("stock-status")]
    public async Task<IActionResult> GetStockStatus([FromQuery] Guid? productId, [FromQuery] Guid? warehouseId)
    {
        var status = await _inventoryService.GetStockStatusAsync(productId, warehouseId);
        return Ok(status);
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockAlerts()
    {
        var alerts = await _inventoryService.GetLowStockAlertsAsync();
        return Ok(alerts);
    }
}
