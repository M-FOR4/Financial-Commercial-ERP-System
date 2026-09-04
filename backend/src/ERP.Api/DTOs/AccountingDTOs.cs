using System.ComponentModel.DataAnnotations;
using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

public record AccountDto(
    Guid Id,
    string Code,
    string Name,
    AccountType Type,
    string TypeName,
    Guid? ParentId,
    string? ParentName,
    bool IsActive,
    bool IsHeader,
    decimal Balance,
    List<AccountDto>? Children,
    DateTime CreatedAt
);

public record CreateAccountRequest(
    [Required, MaxLength(50)] string Code,
    [Required, MaxLength(200)] string Name,
    [Required] AccountType Type,
    Guid? ParentId,
    bool IsHeader = false,
    bool IsActive = true
);

public record UpdateAccountRequest(
    [Required, MaxLength(200)] string Name,
    bool IsHeader = false,
    bool IsActive = true
);

public record AccountBalanceDto(
    Guid AccountId,
    string Code,
    string Name,
    AccountType Type,
    decimal Balance
);

public record JournalEntryLineRequest(
    [Required] Guid AccountId,
    [Range(0, 999999999999)] decimal Debit,
    [Range(0, 999999999999)] decimal Credit,
    [MaxLength(300)] string? Description
);

public record JournalEntryLineDto(
    Guid Id,
    Guid AccountId,
    string AccountCode,
    string AccountName,
    decimal Debit,
    decimal Credit,
    string? Description
);

public record CreateJournalEntryRequest(
    DateTime? EntryDate,
    [Required, MaxLength(500)] string Description,
    [Required, MinLength(2)] List<JournalEntryLineRequest> Lines
);

public record UpdateJournalEntryRequest(
    DateTime? EntryDate,
    [Required, MaxLength(500)] string Description,
    [Required, MinLength(2)] List<JournalEntryLineRequest> Lines
);

public record JournalEntryDto(
    Guid Id,
    string EntryNumber,
    DateTime EntryDate,
    string Description,
    JournalEntryStatus Status,
    string StatusName,
    DateTime? PostedAt,
    Guid? PostedByUserId,
    string? PostedByUserName,
    decimal TotalDebit,
    decimal TotalCredit,
    List<JournalEntryLineDto> Lines,
    DateTime CreatedAt
);
