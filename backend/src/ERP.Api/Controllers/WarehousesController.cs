using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly ILogger<WarehousesController> _logger;

    public WarehousesController(IInventoryService inventoryService, ILogger<WarehousesController> logger)
    {
        _inventoryService = inventoryService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetWarehouses([FromQuery] bool? activeOnly)
    {
        var warehouses = await _inventoryService.GetWarehousesAsync(activeOnly);
        return Ok(warehouses);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetWarehouseById(Guid id)
    {
        var warehouse = await _inventoryService.GetWarehouseByIdAsync(id);
        if (warehouse == null) return NotFound(new { success = false, message = "Warehouse not found." });
        return Ok(warehouse);
    }

    [HttpPost]
    public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseRequest request)
    {
        try
        {
            var created = await _inventoryService.CreateWarehouseAsync(request);
            return CreatedAtAction(nameof(GetWarehouseById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateWarehouse(Guid id, [FromBody] UpdateWarehouseRequest request)
    {
        try
        {
            var updated = await _inventoryService.UpdateWarehouseAsync(id, request);
            if (updated == null) return NotFound(new { success = false, message = "Warehouse not found." });
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
