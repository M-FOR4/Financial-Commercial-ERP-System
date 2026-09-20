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
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;
    private readonly ICodeGeneratorService _codeGenerator;
    private readonly AppDbContext _context;
    private readonly ILogger<CustomersController> _logger;

    public CustomersController(
        ICustomerService customerService,
        ICodeGeneratorService codeGenerator,
        AppDbContext context,
        ILogger<CustomersController> logger)
    {
        _customerService = customerService;
        _codeGenerator = codeGenerator;
        _context = context;
        _logger = logger;
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

    /// <summary>Next auto-generated customer code, for the readonly form field.</summary>
    [HasPermission("Customer.Customer.Add")]
    [HttpGet("next-code")]
    public async Task<IActionResult> GetNextCode()
    {
        var companyId = await GetCompanyIdAsync();
        return Ok(new { code = await _codeGenerator.NextCustomerCodeAsync(companyId) });
    }

    [HasPermission("Customer.Customer.View")]
    [HttpGet]
    public async Task<IActionResult> GetCustomers([FromQuery] bool? activeOnly, [FromQuery] string? search)
    {
        var customers = await _customerService.GetCustomersAsync(activeOnly, search);
        return Ok(customers);
    }

    [HasPermission("Customer.Customer.View")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCustomerById(Guid id)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer == null) return NotFound(new { success = false, message = "Customer not found." });
        return Ok(customer);
    }

    [HasPermission("Customer.Customer.Add")]
    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        try
        {
            var created = await _customerService.CreateCustomerAsync(request);
            return CreatedAtAction(nameof(GetCustomerById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HasPermission("Customer.Customer.Edit")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerRequest request)
    {
        try
        {
            var updated = await _customerService.UpdateCustomerAsync(id, request);
            if (updated == null) return NotFound(new { success = false, message = "Customer not found." });
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
