using ERP.Api.Common.Authorization;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/treasuries")]
[Authorize]
public class TreasuriesController : ControllerBase
{
    private readonly ITreasuryService _treasuryService;

    public TreasuriesController(ITreasuryService treasuryService)
    {
        _treasuryService = treasuryService;
    }

    [HasPermission("Cash.CashAccount.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var treasuries = await _treasuryService.GetAllTreasuriesAsync();
        return Ok(treasuries);
    }

    [HasPermission("Cash.CashAccount.View")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var treasury = await _treasuryService.GetTreasuryByIdAsync(id);
        if (treasury is null) return NotFound();
        return Ok(treasury);
    }

    [HasPermission("Cash.CashAccount.Add")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TreasuryRequest request)
    {
        try
        {
            var treasury = await _treasuryService.CreateTreasuryAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = treasury.Id }, treasury);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("Cash.CashAccount.Edit")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] TreasuryRequest request)
    {
        try
        {
            var treasury = await _treasuryService.UpdateTreasuryAsync(id, request);
            if (treasury is null) return NotFound();
            return Ok(treasury);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("Cash.CashAccount.Delete")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _treasuryService.DeleteTreasuryAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}
