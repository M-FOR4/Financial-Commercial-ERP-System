using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface IAccountingService
{
    Task SeedDefaultChartOfAccountsAsync();
    Task<List<AccountDto>> GetAccountsTreeAsync();
    Task<List<AccountDto>> GetAccountsFlatAsync(AccountType? type = null, bool? activeOnly = null);
    Task<AccountDto?> GetAccountByIdAsync(Guid id);
    Task<AccountDto> CreateAccountAsync(CreateAccountRequest request);
    Task<AccountDto?> UpdateAccountAsync(Guid id, UpdateAccountRequest request);
    Task<AccountBalanceDto?> GetAccountBalanceAsync(Guid id);

    Task<List<JournalEntryDto>> GetJournalEntriesAsync(DateTime? fromDate = null, DateTime? toDate = null, JournalEntryStatus? status = null, string? search = null);
    Task<JournalEntryDto?> GetJournalEntryByIdAsync(Guid id);
    Task<JournalEntryDto> CreateJournalEntryDraftAsync(CreateJournalEntryRequest request);
    Task<JournalEntryDto?> UpdateJournalEntryDraftAsync(Guid id, UpdateJournalEntryRequest request);
    Task<JournalEntryDto> PostJournalEntryAsync(Guid id, Guid? postedByUserId);
    Task<JournalEntryDto> CancelJournalEntryAsync(Guid id, Guid? cancelledByUserId);
}
