using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

// ═══════════════════════════════════
//  TREASURY DTOs
// ═══════════════════════════════════

public record TreasuryRequest(
    string Code,
    string Name,
    TreasuryType Type,
    Guid AccountId,
    string Currency = "LYD"
);

public record TreasuryResponse(
    Guid Id,
    string Code,
    string Name,
    TreasuryType Type,
    Guid AccountId,
    string AccountName,
    decimal Balance,
    string Currency,
    bool IsActive,
    DateTime CreatedAt
);

// ═══════════════════════════════════
//  CASH VOUCHER DTOs
// ═══════════════════════════════════

public record CashVoucherRequest(
    VoucherType VoucherType,
    DateTime Date,
    Guid TreasuryId,
    PartyType PartyType,
    Guid? PartyId,
    Guid TargetAccountId,
    decimal Amount,
    string Description
);

public record CashVoucherResponse(
    Guid Id,
    string VoucherNumber,
    VoucherType VoucherType,
    DateTime Date,
    Guid TreasuryId,
    string TreasuryName,
    PartyType PartyType,
    Guid? PartyId,
    string? PartyName,
    Guid TargetAccountId,
    string TargetAccountName,
    decimal Amount,
    string Description,
    JournalEntryStatus Status,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    DateTime CreatedAt
);

// ═══════════════════════════════════
//  TRANSFER VOUCHER DTOs
// ═══════════════════════════════════

public record TransferVoucherRequest(
    DateTime Date,
    Guid FromTreasuryId,
    Guid ToTreasuryId,
    decimal Amount,
    string Reference
);

public record TransferVoucherResponse(
    Guid Id,
    string TransferNumber,
    DateTime Date,
    Guid FromTreasuryId,
    string FromTreasuryName,
    Guid ToTreasuryId,
    string ToTreasuryName,
    decimal Amount,
    string Reference,
    JournalEntryStatus Status,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    DateTime CreatedAt
);
