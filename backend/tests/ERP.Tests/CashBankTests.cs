using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class CashBankTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<(Treasury treasury, Account treasuryAccount, Account targetAccount, Customer customer)> SeedTestData(AppDbContext db)
    {
        // Create a cash account (Asset)
        var treasuryAccount = new Account
        {
            Id = Guid.NewGuid(),
            Code = "1110",
            Name = "Cash on Hand",
            Type = AccountType.Asset,
            IsHeader = false,
            Balance = 0m,
            IsActive = true
        };

        // Create a revenue account
        var targetAccount = new Account
        {
            Id = Guid.NewGuid(),
            Code = "4100",
            Name = "Sales Revenue",
            Type = AccountType.Revenue,
            IsHeader = false,
            Balance = 0m,
            IsActive = true
        };

        // Create a payable account (for customer balance testing)
        var arAccount = new Account
        {
            Id = Guid.NewGuid(),
            Code = "1120",
            Name = "Accounts Receivable",
            Type = AccountType.Asset,
            IsHeader = false,
            Balance = 0m,
            IsActive = true
        };

        db.Accounts.AddRange(treasuryAccount, targetAccount, arAccount);
        await db.SaveChangesAsync();

        var treasury = new Treasury
        {
            Id = Guid.NewGuid(),
            Code = "TRE-001",
            Name = "Main Cash Box",
            Type = TreasuryType.Cash,
            AccountId = treasuryAccount.Id,
            Balance = 5000m,
            Currency = "LYD",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            Code = "C-001",
            Name = "Test Customer",
            Balance = 0m,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Treasuries.Add(treasury);
        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        return (treasury, treasuryAccount, targetAccount, customer);
    }

    [Fact]
    public async Task PostReceiptVoucher_ShouldIncreaseTreasuryBalance()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (treasury, treasuryAccount, targetAccount, customer) = await SeedTestData(db);
        var voucherService = new VoucherService(db);

        var request = new CashVoucherRequest(
            VoucherType: VoucherType.Receipt,
            Date: DateTime.UtcNow,
            TreasuryId: treasury.Id,
            PartyType: PartyType.GeneralAccount,
            PartyId: null,
            TargetAccountId: targetAccount.Id,
            Amount: 1500m,
            Description: "Cash receipt from sale"
        );

        var voucher = await voucherService.CreateCashVoucherAsync(request);

        // Act
        var posted = await voucherService.PostCashVoucherAsync(voucher.Id);

        // Assert
        Assert.NotNull(posted);
        Assert.Equal(JournalEntryStatus.Posted, posted.Status);

        var updatedTreasury = await db.Treasuries.FindAsync(treasury.Id);
        Assert.NotNull(updatedTreasury);
        Assert.Equal(6500m, updatedTreasury.Balance); // 5000 + 1500

        // Verify journal entry was created
        Assert.NotNull(posted.JournalEntryId);
        var je = await db.JournalEntries.FindAsync(posted.JournalEntryId!.Value);
        Assert.NotNull(je);
        Assert.Equal(JournalEntryStatus.Posted, je.Status);
    }

    [Fact]
    public async Task PostPaymentVoucher_ShouldDecreaseTreasuryBalance()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (treasury, treasuryAccount, targetAccount, customer) = await SeedTestData(db);
        var voucherService = new VoucherService(db);

        var request = new CashVoucherRequest(
            VoucherType: VoucherType.Payment,
            Date: DateTime.UtcNow,
            TreasuryId: treasury.Id,
            PartyType: PartyType.GeneralAccount,
            PartyId: null,
            TargetAccountId: targetAccount.Id,
            Amount: 2000m,
            Description: "Payment for supplies"
        );

        var voucher = await voucherService.CreateCashVoucherAsync(request);

        // Act
        var posted = await voucherService.PostCashVoucherAsync(voucher.Id);

        // Assert
        Assert.NotNull(posted);
        Assert.Equal(JournalEntryStatus.Posted, posted.Status);

        var updatedTreasury = await db.Treasuries.FindAsync(treasury.Id);
        Assert.NotNull(updatedTreasury);
        Assert.Equal(3000m, updatedTreasury.Balance); // 5000 - 2000
    }

    [Fact]
    public async Task CreatePaymentVoucher_ShouldThrowWhenInsufficientBalance()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (treasury, treasuryAccount, targetAccount, customer) = await SeedTestData(db);
        var voucherService = new VoucherService(db);

        var request = new CashVoucherRequest(
            VoucherType: VoucherType.Payment,
            Date: DateTime.UtcNow,
            TreasuryId: treasury.Id,
            PartyType: PartyType.GeneralAccount,
            PartyId: null,
            TargetAccountId: targetAccount.Id,
            Amount: 10000m, // More than 5000 balance
            Description: "Oversized payment"
        );

        // Act & Assert - balance check enforced at creation time
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            voucherService.CreateCashVoucherAsync(request));
    }

    [Fact]
    public async Task PostReceiptVoucher_WithCustomer_ShouldUpdateCustomerBalance()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (treasury, treasuryAccount, targetAccount, customer) = await SeedTestData(db);
        var voucherService = new VoucherService(db);

        var request = new CashVoucherRequest(
            VoucherType: VoucherType.Receipt,
            Date: DateTime.UtcNow,
            TreasuryId: treasury.Id,
            PartyType: PartyType.Customer,
            PartyId: customer.Id,
            TargetAccountId: targetAccount.Id,
            Amount: 1000m,
            Description: "Customer payment on account"
        );

        var voucher = await voucherService.CreateCashVoucherAsync(request);

        // Act
        var posted = await voucherService.PostCashVoucherAsync(voucher.Id);

        // Assert
        Assert.NotNull(posted);
        var updatedCustomer = await db.Customers.FindAsync(customer.Id);
        Assert.NotNull(updatedCustomer);
        Assert.Equal(-1000m, updatedCustomer.Balance); // Receipt reduces AR
    }

    [Fact]
    public async Task PostInternalTransfer_ShouldMoveBalanceBetweenTreasuries()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (treasury, treasuryAccount, targetAccount, customer) = await SeedTestData(db);

        // Create second treasury (bank account)
        var bankAccount = new Account
        {
            Id = Guid.NewGuid(),
            Code = "1120",
            Name = "Bank Account",
            Type = AccountType.Asset,
            IsHeader = false,
            Balance = 0m,
            IsActive = true
        };
        db.Accounts.Add(bankAccount);

        var bankTreasury = new Treasury
        {
            Id = Guid.NewGuid(),
            Code = "TRB-001",
            Name = "Main Bank Account",
            Type = TreasuryType.Bank,
            AccountId = bankAccount.Id,
            Balance = 10000m,
            Currency = "LYD",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Treasuries.Add(bankTreasury);
        await db.SaveChangesAsync();

        var voucherService = new VoucherService(db);

        var request = new TransferVoucherRequest(
            Date: DateTime.UtcNow,
            FromTreasuryId: treasury.Id,
            ToTreasuryId: bankTreasury.Id,
            Amount: 2500m,
            Reference: "Deposit to bank"
        );

        var transfer = await voucherService.CreateTransferVoucherAsync(request);

        // Act
        var posted = await voucherService.PostTransferVoucherAsync(transfer.Id);

        // Assert
        Assert.NotNull(posted);
        Assert.Equal(JournalEntryStatus.Posted, posted.Status);

        var updatedFrom = await db.Treasuries.FindAsync(treasury.Id);
        var updatedTo = await db.Treasuries.FindAsync(bankTreasury.Id);

        Assert.NotNull(updatedFrom);
        Assert.NotNull(updatedTo);
        Assert.Equal(2500m, updatedFrom.Balance);  // 5000 - 2500
        Assert.Equal(12500m, updatedTo.Balance);   // 10000 + 2500

        // Verify journal entry
        Assert.NotNull(posted.JournalEntryId);
        var je = await db.JournalEntries.FindAsync(posted.JournalEntryId!.Value);
        Assert.NotNull(je);
        Assert.Equal(2, je.Lines.Count); // One debit, one credit
    }

    [Fact]
    public async Task CancelCashVoucher_ShouldReverseBalances()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var (treasury, treasuryAccount, targetAccount, customer) = await SeedTestData(db);
        var voucherService = new VoucherService(db);

        var request = new CashVoucherRequest(
            VoucherType: VoucherType.Receipt,
            Date: DateTime.UtcNow,
            TreasuryId: treasury.Id,
            PartyType: PartyType.GeneralAccount,
            PartyId: null,
            TargetAccountId: targetAccount.Id,
            Amount: 1500m,
            Description: "Receipt to cancel"
        );

        var voucher = await voucherService.CreateCashVoucherAsync(request);
        await voucherService.PostCashVoucherAsync(voucher.Id);

        // Act
        var cancelled = await voucherService.CancelCashVoucherAsync(voucher.Id);

        // Assert
        Assert.NotNull(cancelled);
        Assert.Equal(JournalEntryStatus.Cancelled, cancelled.Status);

        var updatedTreasury = await db.Treasuries.FindAsync(treasury.Id);
        Assert.NotNull(updatedTreasury);
        Assert.Equal(5000m, updatedTreasury.Balance); // Back to original
    }
}
