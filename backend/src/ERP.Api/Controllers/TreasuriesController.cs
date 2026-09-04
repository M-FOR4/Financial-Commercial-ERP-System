using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/treasuries")]
public class TreasuriesController : ControllerBase
{
    private readonly ITreasuryService _treasuryService;

    public TreasuriesController(ITreasuryService treasuryService)
    {
        _treasuryService = treasuryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var treasuries = await _treasuryService.GetAllTreasuriesAsync();
        return Ok(treasuries);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var treasury = await _treasuryService.GetTreasuryByIdAsync(id);
        if (treasury is null) return NotFound();
        return Ok(treasury);
    }

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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _treasuryService.DeleteTreasuryAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}
