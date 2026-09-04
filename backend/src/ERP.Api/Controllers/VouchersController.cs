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
[Route("api/vouchers")]
[Authorize]
public class VouchersController : ControllerBase
{
    private readonly IVoucherService _voucherService;
    private readonly AppDbContext _context;

    public VouchersController(IVoucherService voucherService, AppDbContext context)
    {
        _voucherService = voucherService;
        _context = context;
    }

    private async Task<Guid> GetCompanyIdAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user.");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        return user?.CompanyId ?? throw new UnauthorizedAccessException("User company not found.");
    }

    // ═══════════════════════════════════
    //  CASH VOUCHERS
    // ═══════════════════════════════════

    [HttpGet("cash")]
    public async Task<IActionResult> GetAllCashVouchers()
    {
        var vouchers = await _voucherService.GetAllCashVouchersAsync();
        return Ok(vouchers);
    }

    [HttpGet("cash/{id:guid}")]
    public async Task<IActionResult> GetCashVoucherById(Guid id)
    {
        var voucher = await _voucherService.GetCashVoucherByIdAsync(id);
        if (voucher is null) return NotFound();
        return Ok(voucher);
    }

    [HttpPost("cash")]
    public async Task<IActionResult> CreateCashVoucher([FromBody] CashVoucherRequest request)
    {
        try
        {
            var userId = GetUserId();
            var companyId = await GetCompanyIdAsync();
            var voucher = await _voucherService.CreateCashVoucherAsync(request, userId, companyId);
            return CreatedAtAction(nameof(GetCashVoucherById), new { id = voucher.Id }, voucher);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("cash/{id:guid}/post")]
    public async Task<IActionResult> PostCashVoucher(Guid id)
    {
        try
        {
            var voucher = await _voucherService.PostCashVoucherAsync(id);
            if (voucher is null) return NotFound();
            return Ok(voucher);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("cash/{id:guid}/cancel")]
    public async Task<IActionResult> CancelCashVoucher(Guid id)
    {
        try
        {
            var voucher = await _voucherService.CancelCashVoucherAsync(id);
            if (voucher is null) return NotFound();
            return Ok(voucher);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ═══════════════════════════════════
    //  TRANSFER VOUCHERS
    // ═══════════════════════════════════

    [HttpGet("transfers")]
    public async Task<IActionResult> GetAllTransferVouchers()
    {
        var transfers = await _voucherService.GetAllTransferVouchersAsync();
        return Ok(transfers);
    }

    [HttpGet("transfers/{id:guid}")]
    public async Task<IActionResult> GetTransferVoucherById(Guid id)
    {
        var transfer = await _voucherService.GetTransferVoucherByIdAsync(id);
        if (transfer is null) return NotFound();
        return Ok(transfer);
    }

    [HttpPost("transfers")]
    public async Task<IActionResult> CreateTransferVoucher([FromBody] TransferVoucherRequest request)
    {
        try
        {
            var userId = GetUserId();
            var transfer = await _voucherService.CreateTransferVoucherAsync(request, userId);
            return CreatedAtAction(nameof(GetTransferVoucherById), new { id = transfer.Id }, transfer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transfers/{id:guid}/post")]
    public async Task<IActionResult> PostTransferVoucher(Guid id)
    {
        try
        {
            var transfer = await _voucherService.PostTransferVoucherAsync(id);
            if (transfer is null) return NotFound();
            return Ok(transfer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("transfers/{id:guid}/cancel")]
    public async Task<IActionResult> CancelTransferVoucher(Guid id)
    {
        try
        {
            var transfer = await _voucherService.CancelTransferVoucherAsync(id);
            if (transfer is null) return NotFound();
            return Ok(transfer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim is not null ? Guid.Parse(claim.Value) : null;
    }
}
