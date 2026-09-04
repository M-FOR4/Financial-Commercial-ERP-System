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
[Route("api/purchases")]
[Authorize]
public class PurchasesController : ControllerBase
{
    private readonly IPurchaseService _purchaseService;
    private readonly AppDbContext _context;
    public PurchasesController(IPurchaseService purchaseService, AppDbContext context, ILogger<PurchasesController> logger) { _purchaseService = purchaseService; _context = context; }

    private async Task<Guid> GetCompanyIdAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user.");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        return user?.CompanyId ?? throw new UnauthorizedAccessException("User company not found.");
    }

    [HasPermission("Purchase.Invoice.View")]
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices([FromQuery] JournalEntryStatus? status, [FromQuery] string? search)
        => Ok(await _purchaseService.GetPurchaseInvoicesAsync(status, search));

    [HasPermission("Purchase.Invoice.View")]
    [HttpGet("invoices/{id:guid}")]
    public async Task<IActionResult> GetInvoiceById(Guid id)
    {
        var inv = await _purchaseService.GetPurchaseInvoiceByIdAsync(id);
        return inv == null ? NotFound(new { success = false, message = "Invoice not found." }) : Ok(inv);
    }

    [HasPermission("Purchase.Invoice.View")]
    [HttpPost("invoices")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreatePurchaseInvoiceRequest request)
    {
        try { var companyId = await GetCompanyIdAsync(); var c = await _purchaseService.CreatePurchaseInvoiceDraftAsync(request, companyId); return CreatedAtAction(nameof(GetInvoiceById), new { id = c.Id }, c); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HasPermission("Purchase.Invoice.View")]
    [HttpPost("invoices/{id:guid}/post")]
    public async Task<IActionResult> PostInvoice(Guid id)
    {
        try
        {
            var userId = GetUserId();
            var posted = await _purchaseService.PostPurchaseInvoiceAsync(id, userId);
            return Ok(new { success = true, message = $"Invoice '{posted.InvoiceNumber}' posted.", invoice = posted });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HasPermission("Purchase.Invoice.View")]
    [HttpPost("invoices/{id:guid}/cancel")]
    public async Task<IActionResult> CancelInvoice(Guid id)
    {
        try
        {
            var cancelled = await _purchaseService.CancelPurchaseInvoiceAsync(id);
            return Ok(new { success = true, message = $"Invoice '{cancelled.InvoiceNumber}' cancelled.", invoice = cancelled });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HasPermission("Purchase.Return.View")]
    [HttpGet("returns")]
    public async Task<IActionResult> GetReturns([FromQuery] JournalEntryStatus? status)
        => Ok(await _purchaseService.GetPurchaseReturnsAsync(status));

    [HasPermission("Purchase.Return.View")]
    [HttpGet("returns/{id:guid}")]
    public async Task<IActionResult> GetReturnById(Guid id)
    {
        var ret = await _purchaseService.GetPurchaseReturnByIdAsync(id);
        return ret == null ? NotFound(new { success = false, message = "Return not found." }) : Ok(ret);
    }

    [HasPermission("Purchase.Return.View")]
    [HttpPost("returns")]
    public async Task<IActionResult> CreateReturn([FromBody] CreatePurchaseReturnRequest request)
    {
        try { var c = await _purchaseService.CreatePurchaseReturnDraftAsync(request); return CreatedAtAction(nameof(GetReturnById), new { id = c.Id }, c); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HasPermission("Purchase.Return.View")]
    [HttpPost("returns/{id:guid}/post")]
    public async Task<IActionResult> PostReturn(Guid id)
    {
        try
        {
            var userId = GetUserId();
            var posted = await _purchaseService.PostPurchaseReturnAsync(id, userId);
            return Ok(new { success = true, message = $"Return '{posted.ReturnNumber}' posted.", purchaseReturn = posted });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var parsed) ? parsed : null;
    }
}
