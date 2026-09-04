using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class AccountingTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task SeedDefaultChartOfAccounts_ShouldCreateStandardHierarchy()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new AccountingService(context, NullLogger<AccountingService>.Instance);

        // Act
        await service.SeedDefaultChartOfAccountsAsync();
        var accounts = await service.GetAccountsFlatAsync();

        // Assert
        Assert.NotEmpty(accounts);
        Assert.Contains(accounts, a => a.Code == "1000" && a.IsHeader);
        Assert.Contains(accounts, a => a.Code == "1110" && !a.IsHeader);
        Assert.Contains(accounts, a => a.Code == "2110" && !a.IsHeader);
        Assert.Contains(accounts, a => a.Code == "4100" && !a.IsHeader);
        Assert.Contains(accounts, a => a.Code == "5100" && !a.IsHeader);
    }

    [Fact]
    public async Task CreateJournalEntryDraft_ShouldThrow_WhenUnbalanced()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new AccountingService(context, NullLogger<AccountingService>.Instance);
        await service.SeedDefaultChartOfAccountsAsync();

        var cashAcc = await context.Accounts.FirstAsync(a => a.Code == "1110");
        var salesAcc = await context.Accounts.FirstAsync(a => a.Code == "4100");

        var unbalancedRequest = new CreateJournalEntryRequest(
            EntryDate: DateTime.UtcNow,
            Description: "Unbalanced Cash Sale",
            Lines: new List<JournalEntryLineRequest>
            {
                new(cashAcc.Id, Debit: 500m, Credit: 0m, Description: "Cash"),
                new(salesAcc.Id, Debit: 0m, Credit: 400m, Description: "Sales") // 500 != 400
            }
        );

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateJournalEntryDraftAsync(unbalancedRequest));
    }

    [Fact]
    public async Task PostJournalEntry_ShouldUpdateBalancesAndSetStatusToPosted()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new AccountingService(context, NullLogger<AccountingService>.Instance);
        await service.SeedDefaultChartOfAccountsAsync();

        var cashAcc = await context.Accounts.FirstAsync(a => a.Code == "1110"); // Asset
        var salesAcc = await context.Accounts.FirstAsync(a => a.Code == "4100"); // Revenue

        var request = new CreateJournalEntryRequest(
            EntryDate: DateTime.UtcNow,
            Description: "Cash Sale for Goods",
            Lines: new List<JournalEntryLineRequest>
            {
                new(cashAcc.Id, Debit: 1000m, Credit: 0m, Description: "Debit Cash"),
                new(salesAcc.Id, Debit: 0m, Credit: 1000m, Description: "Credit Revenue")
            }
        );

        var draft = await service.CreateJournalEntryDraftAsync(request);
        Assert.Equal(JournalEntryStatus.Draft, draft.Status);

        // Act
        var posted = await service.PostJournalEntryAsync(draft.Id, Guid.NewGuid());

        // Assert
        Assert.Equal(JournalEntryStatus.Posted, posted.Status);
        Assert.NotNull(posted.PostedAt);

        var updatedCash = await service.GetAccountBalanceAsync(cashAcc.Id);
        var updatedSales = await service.GetAccountBalanceAsync(salesAcc.Id);

        Assert.NotNull(updatedCash);
        Assert.NotNull(updatedSales);
        Assert.Equal(1000m, updatedCash.Balance); // Asset increases by (1000 - 0)
        Assert.Equal(1000m, updatedSales.Balance); // Revenue increases by (1000 - 0)
    }

    [Fact]
    public async Task CancelJournalEntry_ShouldRevertBalancesAndSetStatusToCancelled()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new AccountingService(context, NullLogger<AccountingService>.Instance);
        await service.SeedDefaultChartOfAccountsAsync();

        var cashAcc = await context.Accounts.FirstAsync(a => a.Code == "1110");
        var salesAcc = await context.Accounts.FirstAsync(a => a.Code == "4100");

        var request = new CreateJournalEntryRequest(
            EntryDate: DateTime.UtcNow,
            Description: "Reversible Sale",
            Lines: new List<JournalEntryLineRequest>
            {
                new(cashAcc.Id, Debit: 750m, Credit: 0m, Description: "Debit Cash"),
                new(salesAcc.Id, Debit: 0m, Credit: 750m, Description: "Credit Revenue")
            }
        );

        var draft = await service.CreateJournalEntryDraftAsync(request);
        var posted = await service.PostJournalEntryAsync(draft.Id, Guid.NewGuid());
        Assert.Equal(JournalEntryStatus.Posted, posted.Status);

        // Act
        var cancelled = await service.CancelJournalEntryAsync(draft.Id, Guid.NewGuid());

        // Assert
        Assert.Equal(JournalEntryStatus.Cancelled, cancelled.Status);

        var revertedCash = await service.GetAccountBalanceAsync(cashAcc.Id);
        var revertedSales = await service.GetAccountBalanceAsync(salesAcc.Id);

        Assert.Equal(0m, revertedCash!.Balance);
        Assert.Equal(0m, revertedSales!.Balance);
    }
}
