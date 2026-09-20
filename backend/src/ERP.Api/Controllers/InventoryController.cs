using System.Security.Claims;
using ERP.Api.Data;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly AppDbContext _context;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(IInventoryService inventoryService, AppDbContext context, ILogger<InventoryController> logger)
    {
        _inventoryService = inventoryService;
        _context = context;
        _logger = logger;
    }

    private async Task<(Guid userId, Guid companyId)> GetUserContextAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user.");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        var companyId = user?.CompanyId ?? throw new UnauthorizedAccessException("User company not found.");
        return (userId, companyId);
    }

    [HttpGet("movements")]
    [HasPermission("Inventory.Movement.View")]
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
    [HasPermission("Inventory.Movement.Add")]
    public async Task<IActionResult> CreateStockMovement([FromBody] CreateStockMovementRequest request)
    {
        try
        {
            var (userId, companyId) = await GetUserContextAsync();
            var created = await _inventoryService.CreateStockMovementAsync(request, userId, companyId);
            return CreatedAtAction(nameof(GetStockMovements), new { productId = created.ProductId }, created);
        }
        catch (DbUpdateConcurrencyException)
        {
            return StatusCode(409, new { success = false, message = "Conflict: Product stock was modified concurrently by another transaction. Please retry." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── Stock Transfers Endpoints ──

    [HttpGet("transfers")]
    [HasPermission("Inventory.WarehouseTransfer.View")]
    public async Task<IActionResult> GetStockTransfers()
    {
        var (_, companyId) = await GetUserContextAsync();
        var transfers = await _inventoryService.GetStockTransfersAsync(companyId);
        return Ok(transfers);
    }

    [HttpGet("transfers/{id:guid}")]
    [HasPermission("Inventory.WarehouseTransfer.View")]
    public async Task<IActionResult> GetStockTransferById(Guid id)
    {
        var transfer = await _inventoryService.GetStockTransferByIdAsync(id);
        if (transfer == null)
            return NotFound(new { success = false, message = "Stock transfer document not found." });
        return Ok(transfer);
    }

    [HttpPost("transfers")]
    [HasPermission("Inventory.WarehouseTransfer.Add")]
    public async Task<IActionResult> CreateStockTransfer([FromBody] CreateStockTransferRequest request)
    {
        try
        {
            var (userId, companyId) = await GetUserContextAsync();
            var created = await _inventoryService.CreateStockTransferDraftAsync(request, companyId, userId);
            return CreatedAtAction(nameof(GetStockTransferById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("transfers/{id:guid}/post")]
    [HasPermission("Inventory.WarehouseTransfer.Approve")]
    public async Task<IActionResult> PostStockTransfer(Guid id)
    {
        try
        {
            var (userId, _) = await GetUserContextAsync();
            var posted = await _inventoryService.PostStockTransferAsync(id, userId);
            return Ok(posted);
        }
        catch (DbUpdateConcurrencyException)
        {
            return StatusCode(409, new { success = false, message = "Conflict: Stock was modified concurrently during transfer posting. Please retry." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── Stock Status Endpoints ──

    [HttpGet("stock-status")]
    [HasPermission("Inventory.Movement.View")]
    public async Task<IActionResult> GetStockStatus([FromQuery] Guid? productId, [FromQuery] Guid? warehouseId)
    {
        var status = await _inventoryService.GetStockStatusAsync(productId, warehouseId);
        return Ok(status);
    }

    [HttpGet("low-stock")]
    [HasPermission("Inventory.Movement.View")]
    public async Task<IActionResult> GetLowStockAlerts()
    {
        var alerts = await _inventoryService.GetLowStockAlertsAsync();
        return Ok(alerts);
    }
}
