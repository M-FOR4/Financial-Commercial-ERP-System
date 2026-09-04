using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface IReportService
{
    Task<TrialBalanceResponse> GetTrialBalanceAsync(TrialBalanceRequest request);
    Task<IncomeStatementResponse> GetIncomeStatementAsync(IncomeStatementRequest request);
    Task<BalanceSheetResponse> GetBalanceSheetAsync(BalanceSheetRequest request);
    Task<AccountStatementResponse> GetAccountStatementAsync(AccountStatementRequest request);
    Task<StockLedgerResponse> GetStockLedgerAsync(StockLedgerRequest request);
    Task<DashboardKpiResponse> GetDashboardKpisAsync();
}
