using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HasPermission("Accounting.Account.View")]
    [HttpGet("dashboard-kpis")]
    public async Task<IActionResult> GetDashboardKpis()
    {
        try
        {
            var kpis = await _reportService.GetDashboardKpisAsync();
            return Ok(kpis);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to load dashboard KPIs.", details = ex.Message });
        }
    }

    [HasPermission("Accounting.TrialBalance.View")]
    [HttpPost("trial-balance")]
    public async Task<IActionResult> GetTrialBalance([FromBody] TrialBalanceRequest request)
    {
        try
        {
            var result = await _reportService.GetTrialBalanceAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to generate trial balance.", details = ex.Message });
        }
    }

    [HasPermission("Reports.Reports.ViewAccountingReports")]
    [HttpPost("income-statement")]
    public async Task<IActionResult> GetIncomeStatement([FromBody] IncomeStatementRequest request)
    {
        try
        {
            var result = await _reportService.GetIncomeStatementAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to generate income statement.", details = ex.Message });
        }
    }

    [HasPermission("Reports.Reports.ViewAccountingReports")]
    [HttpPost("balance-sheet")]
    public async Task<IActionResult> GetBalanceSheet([FromBody] BalanceSheetRequest request)
    {
        try
        {
            var result = await _reportService.GetBalanceSheetAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to generate balance sheet.", details = ex.Message });
        }
    }

    [HasPermission("Accounting.GeneralLedger.ViewAccountStatement")]
    [HttpPost("statement")]
    public async Task<IActionResult> GetAccountStatement([FromBody] AccountStatementRequest request)
    {
        try
        {
            var result = await _reportService.GetAccountStatementAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// General Ledger (دفتر الأستاذ) for one account: opening balance, every posted
    /// transaction in the range with its counterpart account and running balance,
    /// plus period debit/credit totals.
    /// </summary>
    [HasPermission("Accounting.GeneralLedger.View")]
    [HttpGet("financial/general-ledger")]
    public async Task<IActionResult> GetGeneralLedger(
        [FromQuery(Name = "account_id")] Guid accountId,
        [FromQuery(Name = "date_from")] DateTime dateFrom,
        [FromQuery(Name = "date_to")] DateTime dateTo)
    {
        try
        {
            var result = await _reportService.GetGeneralLedgerAsync(
                new GeneralLedgerRequest(accountId, dateFrom, dateTo));
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("Inventory.Movement.View")]
    [HttpPost("stock-ledger")]
    public async Task<IActionResult> GetStockLedger([FromBody] StockLedgerRequest request)
    {
        var result = await _reportService.GetStockLedgerAsync(request);

        // PERMISSIONS.md §17: cost data requires an independent permission.
        // Users without Inventory.Item.ViewCost receive quantities only —
        // UnitCost, TotalValue, RunningValue and EndingValue are zeroed.
        if (!User.UserHasPermission("Inventory.Item.ViewCost"))
        {
            result = result with
            {
                Lines = result.Lines.Select(l => l with { UnitCost = 0m, TotalValue = 0m, RunningValue = 0m }).ToList(),
                EndingValue = 0m
            };
        }

        return Ok(result);
    }
}
