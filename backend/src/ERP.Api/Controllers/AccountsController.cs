using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly ILogger<AccountsController> _logger;

    public AccountsController(IAccountingService accountingService, ILogger<AccountsController> logger)
    {
        _accountingService = accountingService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAccountsTree()
    {
        var tree = await _accountingService.GetAccountsTreeAsync();
        return Ok(tree);
    }

    [HttpGet("flat")]
    public async Task<IActionResult> GetAccountsFlat([FromQuery] AccountType? type, [FromQuery] bool? activeOnly)
    {
        var accounts = await _accountingService.GetAccountsFlatAsync(type, activeOnly);
        return Ok(accounts);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAccountById(Guid id)
    {
        var account = await _accountingService.GetAccountByIdAsync(id);
        if (account == null) return NotFound(new { success = false, message = "Account not found." });
        return Ok(account);
    }

    [HttpGet("{id:guid}/balance")]
    public async Task<IActionResult> GetAccountBalance(Guid id)
    {
        var balance = await _accountingService.GetAccountBalanceAsync(id);
        if (balance == null) return NotFound(new { success = false, message = "Account not found." });
        return Ok(balance);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request)
    {
        try
        {
            var created = await _accountingService.CreateAccountAsync(request);
            return CreatedAtAction(nameof(GetAccountById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAccount(Guid id, [FromBody] UpdateAccountRequest request)
    {
        try
        {
            var updated = await _accountingService.UpdateAccountAsync(id, request);
            if (updated == null) return NotFound(new { success = false, message = "Account not found." });
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("seed")]
    public async Task<IActionResult> SeedDefaultAccounts()
    {
        await _accountingService.SeedDefaultChartOfAccountsAsync();
        return Ok(new { success = true, message = "Default Chart of Accounts seeded successfully." });
    }
}
