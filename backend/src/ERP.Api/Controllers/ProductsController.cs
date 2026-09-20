using System.Security.Claims;
using ERP.Api.Data;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Controllers;

public static class PermissionClaimExtensions
{
    /// <summary>
    /// Cheap claim-based permission check (JWT "permissions" claim is a comma-joined
    /// list populated at token generation). Used for field-level cost/profit gating
    /// where a full HasPermission DB round-trip is unnecessary.
    /// </summary>
    public static bool UserHasPermission(this ClaimsPrincipal user, string permission)
    {
        var claim = user.FindFirst("permissions")?.Value;
        if (string.IsNullOrEmpty(claim)) return false;
        return claim.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Contains(permission, StringComparer.Ordinal);
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly ICodeGeneratorService _codeGenerator;
    private readonly AppDbContext _context;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(
        IInventoryService inventoryService,
        ICodeGeneratorService codeGenerator,
        AppDbContext context,
        ILogger<ProductsController> logger)
    {
        _inventoryService = inventoryService;
        _codeGenerator = codeGenerator;
        _context = context;
        _logger = logger;
    }

    private async Task<Guid> GetCompanyIdAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user.");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        return user?.CompanyId ?? throw new UnauthorizedAccessException("User company not found.");
    }

    [HttpGet]
    [HasPermission("Inventory.Item.View")]
    public async Task<IActionResult> GetProducts([FromQuery] Guid? categoryId, [FromQuery] bool? activeOnly, [FromQuery] string? search)
    {
        var products = await _inventoryService.GetProductsAsync(categoryId, activeOnly, search);
        return Ok(ApplyCostVisibility(products));
    }

    /// <summary>Next auto-generated product SKU, for the readonly form field.</summary>
    [HasPermission("Inventory.Item.Add")]
    [HttpGet("next-code")]
    public async Task<IActionResult> GetNextCode()
    {
        var companyId = await GetCompanyIdAsync();
        return Ok(new { code = await _codeGenerator.NextProductCodeAsync(companyId) });
    }

    [HttpGet("lookup")]
    [HasPermission("Inventory.Item.View")]
    public async Task<IActionResult> LookupProduct([FromQuery] string code)
    {
        var companyId = await GetCompanyIdAsync();
        var product = await _inventoryService.LookupProductByCodeAsync(code, companyId);
        if (product == null) return NotFound(new { success = false, message = "Product not found for the provided code/barcode." });
        return Ok(product);
    }

    [HttpGet("{id:guid}")]
    [HasPermission("Inventory.Item.View")]
    public async Task<IActionResult> GetProductById(Guid id)
    {
        var product = await _inventoryService.GetProductByIdAsync(id);
        if (product == null) return NotFound(new { success = false, message = "Product not found." });
        return Ok(ApplyCostVisibility(new[] { product }));
    }

    [HttpPost]
    [HasPermission("Inventory.Item.Add")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        try
        {
            var companyId = await GetCompanyIdAsync();
            var created = await _inventoryService.CreateProductAsync(request, companyId);
            return CreatedAtAction(nameof(GetProductById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [HasPermission("Inventory.Item.Edit")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRequest request)
    {
        try
        {
            var updated = await _inventoryService.UpdateProductAsync(id, request);
            if (updated == null) return NotFound(new { success = false, message = "Product not found." });
            return Ok(updated);
        }
        catch (DbUpdateConcurrencyException)
        {
            return StatusCode(409, new { success = false, message = "Conflict: Product was modified concurrently by another transaction. Please refresh and retry." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// PERMISSIONS.md §17: cost data (purchase price, average cost) is sensitive and
    /// independently controlled. Users without Inventory.Item.ViewCost receive zeroed
    /// cost fields; selling price and stock remain visible.
    /// </summary>
    private IEnumerable<ProductDto> ApplyCostVisibility(IEnumerable<ProductDto> products)
    {
        if (User.UserHasPermission("Inventory.Item.ViewCost"))
            return products;

        return products.Select(p => p with { PurchasePrice = 0m, AvgCost = 0m });
    }
}