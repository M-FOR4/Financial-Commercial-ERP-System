using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

// ═══════════════════════════════════
//  ASSET CATEGORY DTOs
// ═══════════════════════════════════

public record AssetCategoryRequest(
    string Code,
    string Name,
    Guid AssetAccountId,
    Guid AccumulatedDepreciationAccountId,
    Guid DepreciationExpenseAccountId,
    int DefaultUsefulLifeYears
);

public record AssetCategoryResponse(
    Guid Id,
    string Code,
    string Name,
    Guid AssetAccountId,
    string AssetAccountName,
    Guid AccumulatedDepreciationAccountId,
    string AccumulatedDepreciationAccountName,
    Guid DepreciationExpenseAccountId,
    string DepreciationExpenseAccountName,
    int DefaultUsefulLifeYears,
    bool IsActive,
    DateTime CreatedAt
);

// ═══════════════════════════════════
//  FIXED ASSET DTOs
// ═══════════════════════════════════

public record FixedAssetRequest(
    string AssetCode,
    string Name,
    Guid CategoryId,
    DateTime PurchaseDate,
    decimal PurchaseCost,
    decimal SalvageValue,
    int UsefulLifeYears
);

public record FixedAssetResponse(
    Guid Id,
    string AssetCode,
    string Name,
    Guid CategoryId,
    string CategoryName,
    DateTime PurchaseDate,
    decimal PurchaseCost,
    decimal SalvageValue,
    int UsefulLifeYears,
    decimal CurrentBookValue,
    decimal AccumulatedDepreciation,
    decimal MonthlyDepreciation,
    AssetStatus Status,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    DateTime CreatedAt
);

// ═══════════════════════════════════
//  DEPRECIATION DTOs
// ═══════════════════════════════════

public record DepreciationRunRequest(
    DateTime PeriodStartDate,
    DateTime PeriodEndDate
);

public record DepreciationRunResponse(
    int AssetsProcessed,
    decimal TotalDepreciationAmount,
    List<DepreciationResultItem> Items
);

public record DepreciationResultItem(
    Guid AssetId,
    string AssetCode,
    string AssetName,
    decimal DepreciationAmount,
    decimal BookValueAfter,
    Guid JournalEntryId
);

public record DepreciationEntryResponse(
    Guid Id,
    Guid AssetId,
    string AssetCode,
    string AssetName,
    DateTime ProcessDate,
    DateTime PeriodStartDate,
    DateTime PeriodEndDate,
    decimal DepreciationAmount,
    decimal BookValueAfter,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    DateTime CreatedAt
);

// ═══════════════════════════════════
//  DISPOSAL DTOs
// ═══════════════════════════════════

public record AssetDisposalRequest(
    decimal DisposalValue,
    string Description
);

public record AssetDisposalResponse(
    Guid AssetId,
    string AssetCode,
    string AssetName,
    decimal PurchaseCost,
    decimal AccumulatedDepreciation,
    decimal DisposalValue,
    decimal GainOrLoss,
    Guid JournalEntryId,
    string JournalEntryNumber
);
