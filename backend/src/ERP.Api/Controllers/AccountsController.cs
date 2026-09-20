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

    [HasPermission("Accounting.Account.View")]
    [HttpGet]
    public async Task<IActionResult> GetAccountsTree()
    {
        var tree = await _accountingService.GetAccountsTreeAsync();
        return Ok(tree);
    }

    [HasPermission("Accounting.Account.View")]
    [HttpGet("flat")]
    public async Task<IActionResult> GetAccountsFlat([FromQuery] AccountType? type, [FromQuery] bool? activeOnly)
    {
        var accounts = await _accountingService.GetAccountsFlatAsync(type, activeOnly);
        return Ok(accounts);
    }

    [HasPermission("Accounting.Account.View")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAccountById(Guid id)
    {
        var account = await _accountingService.GetAccountByIdAsync(id);
        if (account == null) return NotFound(new { success = false, message = "Account not found." });
        return Ok(account);
    }

    /// <summary>
    /// Suggests the next free account code for the (optional) parent account.
    /// Codes follow the chart-of-accounts convention: children of a 4-digit
    /// parent are allocated in steps of 10 inside the parent's numeric block.
    /// </summary>
    [HasPermission("Accounting.Account.View")]
    [HttpGet("suggest-code")]
    public async Task<IActionResult> SuggestAccountCode([FromQuery] Guid? parentId, [FromQuery] AccountType? type)
    {
        try
        {
            var suggestion = await _accountingService.SuggestAccountCodeAsync(parentId, type);
            return Ok(suggestion);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HasPermission("Accounting.Account.View")]
    [HttpGet("{id:guid}/balance")]
    public async Task<IActionResult> GetAccountBalance(Guid id)
    {
        var balance = await _accountingService.GetAccountBalanceAsync(id);
        if (balance == null) return NotFound(new { success = false, message = "Account not found." });
        return Ok(balance);
    }

    [HasPermission("Accounting.Account.Add")]
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

    [HasPermission("Accounting.Account.Edit")]
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

    // Seed is an admin-only operation — requires account add permission plus settings edit
    [HasPermission("Admin.Settings.Edit")]
    [HttpPost("seed")]
    public async Task<IActionResult> SeedDefaultAccounts()
    {
        await _accountingService.SeedDefaultChartOfAccountsAsync();
        return Ok(new { success = true, message = "Default Chart of Accounts seeded successfully." });
    }
}
