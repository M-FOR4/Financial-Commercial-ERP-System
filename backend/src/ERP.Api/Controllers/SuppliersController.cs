using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;
    public SuppliersController(ISupplierService supplierService, ILogger<SuppliersController> logger) { _supplierService = supplierService; }

    [HttpGet]
    public async Task<IActionResult> GetSuppliers([FromQuery] bool? activeOnly, [FromQuery] string? search)
        => Ok(await _supplierService.GetSuppliersAsync(activeOnly, search));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSupplierById(Guid id)
    {
        var s = await _supplierService.GetSupplierByIdAsync(id);
        return s == null ? NotFound(new { success = false, message = "Supplier not found." }) : Ok(s);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
    {
        try { var c = await _supplierService.CreateSupplierAsync(request); return CreatedAtAction(nameof(GetSupplierById), new { id = c.Id }, c); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSupplier(Guid id, [FromBody] CreateSupplierRequest request)
    {
        try { var u = await _supplierService.UpdateSupplierAsync(id, request); return u == null ? NotFound(new { success = false, message = "Supplier not found." }) : Ok(u); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}
