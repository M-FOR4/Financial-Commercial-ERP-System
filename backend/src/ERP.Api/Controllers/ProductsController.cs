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
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly AppDbContext _context;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(IInventoryService inventoryService, AppDbContext context, ILogger<ProductsController> logger)
    {
        _inventoryService = inventoryService;
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
    public async Task<IActionResult> GetProducts([FromQuery] Guid? categoryId, [FromQuery] bool? activeOnly, [FromQuery] string? search)
    {
        var products = await _inventoryService.GetProductsAsync(categoryId, activeOnly, search);
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProductById(Guid id)
    {
        var product = await _inventoryService.GetProductByIdAsync(id);
        if (product == null) return NotFound(new { success = false, message = "Product not found." });
        return Ok(product);
    }

    [HttpPost]
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
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRequest request)
    {
        try
        {
            var updated = await _inventoryService.UpdateProductAsync(id, request);
            if (updated == null) return NotFound(new { success = false, message = "Product not found." });
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
