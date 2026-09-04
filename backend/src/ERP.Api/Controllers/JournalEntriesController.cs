using System.Security.Claims;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/journal-entries")]
[Authorize]
public class JournalEntriesController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly ILogger<JournalEntriesController> _logger;

    public JournalEntriesController(IAccountingService accountingService, ILogger<JournalEntriesController> logger)
    {
        _accountingService = accountingService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetJournalEntries(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] JournalEntryStatus? status,
        [FromQuery] string? search)
    {
        var entries = await _accountingService.GetJournalEntriesAsync(fromDate, toDate, status, search);
        return Ok(entries);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetJournalEntryById(Guid id)
    {
        var entry = await _accountingService.GetJournalEntryByIdAsync(id);
        if (entry == null) return NotFound(new { success = false, message = "Journal Entry not found." });
        return Ok(entry);
    }

    [HttpPost]
    public async Task<IActionResult> CreateDraft([FromBody] CreateJournalEntryRequest request)
    {
        try
        {
            var created = await _accountingService.CreateJournalEntryDraftAsync(request);
            return CreatedAtAction(nameof(GetJournalEntryById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateDraft(Guid id, [FromBody] UpdateJournalEntryRequest request)
    {
        try
        {
            var updated = await _accountingService.UpdateJournalEntryDraftAsync(id, request);
            if (updated == null) return NotFound(new { success = false, message = "Journal Entry not found." });
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/post")]
    public async Task<IActionResult> Post(Guid id)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value;
            Guid? userId = Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;

            var posted = await _accountingService.PostJournalEntryAsync(id, userId);
            return Ok(new { success = true, message = $"Journal Entry '{posted.EntryNumber}' successfully posted.", entry = posted });
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

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value;
            Guid? userId = Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;

            var cancelled = await _accountingService.CancelJournalEntryAsync(id, userId);
            return Ok(new { success = true, message = $"Journal Entry '{cancelled.EntryNumber}' cancelled. Ledger balances reversed.", entry = cancelled });
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
