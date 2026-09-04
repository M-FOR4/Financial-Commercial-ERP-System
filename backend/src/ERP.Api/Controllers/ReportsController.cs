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

    [HttpPost("stock-ledger")]
    public async Task<IActionResult> GetStockLedger([FromBody] StockLedgerRequest request)
    {
        var result = await _reportService.GetStockLedgerAsync(request);
        return Ok(result);
    }
}
