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
[Route("api/sales")]
[Authorize]
public class SalesController : ControllerBase
{

    private readonly ISalesService _salesService;
    private readonly AppDbContext _context;
    private readonly ILogger<SalesController> _logger;

    public SalesController(ISalesService salesService, AppDbContext context, ILogger<SalesController> logger)
    {
        _salesService = salesService;
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

    // ── Invoices ──

    [HasPermission("Sales.Invoice.View")]
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices([FromQuery] JournalEntryStatus? status, [FromQuery] string? search)
    {
        var invoices = await _salesService.GetSalesInvoicesAsync(status, search);
        return Ok(invoices);
    }

    [HasPermission("Sales.Invoice.View")]
    [HttpGet("invoices/{id:guid}")]
    public async Task<IActionResult> GetInvoiceById(Guid id)
    {
        var invoice = await _salesService.GetSalesInvoiceByIdAsync(id);
        if (invoice == null) return NotFound(new { success = false, message = "Invoice not found." });
        return Ok(invoice);
    }

    [HasPermission("Sales.Invoice.Add")]
    [HasPermission("Sales.Invoice.View")]
    [HttpPost("invoices")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateSalesInvoiceRequest request)
    {
        try
        {
            var companyId = await GetCompanyIdAsync();
            var created = await _salesService.CreateSalesInvoiceDraftAsync(request, companyId);
            return CreatedAtAction(nameof(GetInvoiceById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HasPermission("Sales.Invoice.Approve")]
    [HasPermission("Sales.Invoice.View")]
    [HttpPost("invoices/{id:guid}/post")]
    public async Task<IActionResult> PostInvoice(Guid id)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value;
            Guid? userId = Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;

            var posted = await _salesService.PostSalesInvoiceAsync(id, userId);
            return Ok(new { success = true, message = $"Invoice '{posted.InvoiceNumber}' posted successfully.", invoice = posted });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HasPermission("Sales.Invoice.Cancel")]
    [HasPermission("Sales.Invoice.View")]
    [HttpPost("invoices/{id:guid}/cancel")]
    public async Task<IActionResult> CancelInvoice(Guid id)
    {
        try
        {
            var cancelled = await _salesService.CancelSalesInvoiceAsync(id);
            return Ok(new { success = true, message = $"Invoice '{cancelled.InvoiceNumber}' cancelled. Ledger reversed.", invoice = cancelled });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── Returns ──

    [HasPermission("Sales.Return.View")]
    [HttpGet("returns")]
    public async Task<IActionResult> GetReturns([FromQuery] JournalEntryStatus? status)
    {
        var returns = await _salesService.GetSalesReturnsAsync(status);
        return Ok(returns);
    }

    [HasPermission("Sales.Return.View")]
    [HttpGet("returns/{id:guid}")]
    public async Task<IActionResult> GetReturnById(Guid id)
    {
        var salesReturn = await _salesService.GetSalesReturnByIdAsync(id);
        if (salesReturn == null) return NotFound(new { success = false, message = "Sales Return not found." });
        return Ok(salesReturn);
    }

    [HasPermission("Sales.Return.View")]
    [HttpPost("returns")]
    public async Task<IActionResult> CreateReturn([FromBody] CreateSalesReturnRequest request)
    {
        try
        {
            var created = await _salesService.CreateSalesReturnDraftAsync(request);
            return CreatedAtAction(nameof(GetReturnById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HasPermission("Sales.Return.Approve")]
    [HasPermission("Sales.Return.View")]
    [HttpPost("returns/{id:guid}/post")]
    public async Task<IActionResult> PostReturn(Guid id)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value;
            Guid? userId = Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;

            var posted = await _salesService.PostSalesReturnAsync(id, userId);
            return Ok(new { success = true, message = $"Return '{posted.ReturnNumber}' posted successfully.", salesReturn = posted });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
