using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

// ═══════════════════════════════════
//  TRIAL BALANCE
// ═══════════════════════════════════

public record TrialBalanceRequest(DateTime FromDate, DateTime ToDate);

public record TrialBalanceLineDto(
    string AccountCode,
    string AccountName,
    AccountType AccountType,
    decimal OpeningDebit,
    decimal OpeningCredit,
    decimal MovementDebit,
    decimal MovementCredit,
    decimal EndingDebit,
    decimal EndingCredit
);

public record TrialBalanceResponse(
    DateTime FromDate,
    DateTime ToDate,
    List<TrialBalanceLineDto> Lines,
    decimal TotalDebit,
    decimal TotalCredit,
    bool IsBalanced
);

// ═══════════════════════════════════
//  INCOME STATEMENT (P&L)
// ═══════════════════════════════════

public record IncomeStatementRequest(DateTime FromDate, DateTime ToDate);

public record IncomeStatementLineDto(
    string AccountCode,
    string AccountName,
    decimal Amount
);

public record IncomeStatementSectionDto(
    string Title,
    List<IncomeStatementLineDto> Lines,
    decimal Total
);

public record IncomeStatementResponse(
    DateTime FromDate,
    DateTime ToDate,
    IncomeStatementSectionDto Revenue,
    IncomeStatementSectionDto CostOfGoodsSold,
    decimal GrossProfit,
    IncomeStatementSectionDto OperatingExpenses,
    decimal NetOperatingIncome
);

// ═══════════════════════════════════
//  BALANCE SHEET
// ═══════════════════════════════════

public record BalanceSheetRequest(DateTime AsOfDate);

public record BalanceSheetLineDto(
    string AccountCode,
    string AccountName,
    decimal Balance
);

public record BalanceSheetSectionDto(
    string Title,
    List<BalanceSheetLineDto> Lines,
    decimal Total
);

public record BalanceSheetResponse(
    DateTime AsOfDate,
    BalanceSheetSectionDto Assets,
    BalanceSheetSectionDto Liabilities,
    BalanceSheetSectionDto Equity,
    decimal CurrentYearNetIncome,
    decimal TotalLiabilitiesAndEquity,
    bool IsValid
);

// ═══════════════════════════════════
//  ACCOUNT / PARTY STATEMENT
// ═══════════════════════════════════

public record AccountStatementRequest(
    string PartyType,
    Guid PartyId,
    DateTime FromDate,
    DateTime ToDate
);

public record StatementLineDto(
    DateTime Date,
    string Reference,
    string Description,
    decimal Debit,
    decimal Credit,
    decimal Balance
);

public record AccountStatementResponse(
    string PartyName,
    string PartyCode,
    DateTime FromDate,
    DateTime ToDate,
    List<StatementLineDto> Lines,
    decimal OpeningBalance,
    decimal ClosingBalance,
    decimal TotalDebit,
    decimal TotalCredit
);

// ═══════════════════════════════════
//  STOCK LEDGER
// ═══════════════════════════════════

public record StockLedgerRequest(
    Guid? ProductId,
    Guid? WarehouseId,
    DateTime FromDate,
    DateTime ToDate
);

public record StockLedgerLineDto(
    DateTime Date,
    string MovementType,
    decimal QuantityIn,
    decimal QuantityOut,
    decimal UnitCost,
    decimal TotalValue,
    decimal RunningQuantity,
    decimal RunningValue,
    decimal WeightedAverageCost,
    string? ReferenceDocument
);

public record StockLedgerResponse(
    string ProductName,
    string ProductSku,
    string WarehouseName,
    List<StockLedgerLineDto> Lines,
    decimal TotalInbound,
    decimal TotalOutbound,
    decimal EndingQuantity,
    decimal EndingValue
);

// ═══════════════════════════════════
//  REPORTS DASHBOARD KPIs
// ═══════════════════════════════════

public record DashboardKpiResponse(
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal NetProfit,
    decimal TotalAssets,
    decimal TotalLiabilities,
    decimal TotalEquity,
    int TotalCustomers,
    int TotalSuppliers,
    int TotalProducts,
    decimal TotalCashBalance
);
