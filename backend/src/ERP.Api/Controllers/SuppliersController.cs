using ERP.Api.Data;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;
    private readonly ICodeGeneratorService _codeGenerator;
    private readonly AppDbContext _context;

    public SuppliersController(
        ISupplierService supplierService,
        ICodeGeneratorService codeGenerator,
        AppDbContext context,
        ILogger<SuppliersController> logger)
    {
        _supplierService = supplierService;
        _codeGenerator = codeGenerator;
        _context = context;
    }

    private async Task<Guid> GetCompanyIdAsync()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user.");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        return user?.CompanyId ?? throw new UnauthorizedAccessException("User company not found.");
    }

    /// <summary>Next auto-generated supplier code, for the readonly form field.</summary>
    [HasPermission("Supplier.Supplier.Add")]
    [HttpGet("next-code")]
    public async Task<IActionResult> GetNextCode()
    {
        var companyId = await GetCompanyIdAsync();
        return Ok(new { code = await _codeGenerator.NextSupplierCodeAsync(companyId) });
    }

    [HasPermission("Supplier.Supplier.View")]
    [HttpGet]
    public async Task<IActionResult> GetSuppliers([FromQuery] bool? activeOnly, [FromQuery] string? search)
        => Ok(await _supplierService.GetSuppliersAsync(activeOnly, search));

    [HasPermission("Supplier.Supplier.View")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSupplierById(Guid id)
    {
        var s = await _supplierService.GetSupplierByIdAsync(id);
        return s == null ? NotFound(new { success = false, message = "Supplier not found." }) : Ok(s);
    }

    [HasPermission("Supplier.Supplier.Add")]
    [HttpPost]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
    {
        try { var c = await _supplierService.CreateSupplierAsync(request); return CreatedAtAction(nameof(GetSupplierById), new { id = c.Id }, c); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HasPermission("Supplier.Supplier.Edit")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSupplier(Guid id, [FromBody] CreateSupplierRequest request)
    {
        try { var u = await _supplierService.UpdateSupplierAsync(id, request); return u == null ? NotFound(new { success = false, message = "Supplier not found." }) : Ok(u); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}
