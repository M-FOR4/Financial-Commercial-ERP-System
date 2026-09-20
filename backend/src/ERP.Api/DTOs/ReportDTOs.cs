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
//  GENERAL LEDGER (دفتر الأستاذ)
// ═══════════════════════════════════

public record GeneralLedgerRequest(
    Guid AccountId,
    DateTime FromDate,
    DateTime ToDate
);

/// <summary>
/// One posted journal line of the selected account.
/// Balance columns follow the account's NORMAL balance nature
/// (Asset/Expense = debit side, Liability/Equity/Revenue = credit side),
/// matching Account.Balance and AccountingService posting rules.
/// </summary>
public record GeneralLedgerLineDto(
    DateTime Date,
    string EntryNumber,
    string? SourceDocumentType,
    string Description,
    string CounterpartAccount,
    decimal Debit,
    decimal Credit,
    decimal RunningBalance,
    string? UserName
);

public record GeneralLedgerResponse(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    string AccountType,
    string BalanceNature,
    DateTime FromDate,
    DateTime ToDate,
    decimal OpeningBalance,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance,
    List<GeneralLedgerLineDto> Lines
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
