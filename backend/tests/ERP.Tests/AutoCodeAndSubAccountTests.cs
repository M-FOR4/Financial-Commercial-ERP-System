using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

/// <summary>
/// Tests for automatic code generation and automatic party sub-account
/// creation (customers → AR 1130, suppliers → AP 2110).
/// </summary>
public class AutoCodeAndSubAccountTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<Company> SeedCompanyWithControlAccountsAsync(AppDbContext context)
    {
        var company = new Company { Id = Guid.NewGuid(), Name = "Test Co", DefaultCurrency = "LYD" };
        context.Companies.Add(company);

        var ar = new Account { CompanyId = company.Id, Code = "1130", Name = "Accounts Receivable", Type = AccountType.Asset };
        var ap = new Account { CompanyId = company.Id, Code = "2110", Name = "Accounts Payable", Type = AccountType.Liability };
        context.Accounts.AddRange(ar, ap);
        await context.SaveChangesAsync();
        return company;
    }

    private static CustomerService NewCustomerService(AppDbContext context) =>
        new(context, NullLogger<CustomerService>.Instance,
            new CodeGeneratorService(context), new AccountingService(
                context, NullLogger<AccountingService>.Instance));

    private static SupplierService NewSupplierService(AppDbContext context) =>
        new(context, NullLogger<SupplierService>.Instance,
            new CodeGeneratorService(context), new AccountingService(
                context, NullLogger<AccountingService>.Instance));

    [Fact]
    public async Task CreateCustomer_AutoGeneratesSequentialCode()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var service = NewCustomerService(context);

        var first = await service.CreateCustomerAsync(new CreateCustomerRequest(null, "أحمد", null, null, null, null));
        var second = await service.CreateCustomerAsync(new CreateCustomerRequest(null, "سالم", null, null, null, null));

        Assert.Equal("CUST-0001", first.Code);
        Assert.Equal("CUST-0002", second.Code);
    }

    [Fact]
    public async Task CreateCustomer_CreatesSubAccountUnderAR1130()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var service = NewCustomerService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest(null, "شركة النور", null, null, null, null));

        Assert.NotNull(customer);
        var customerEntity = await context.Customers.Include(c => c.Account).FirstAsync(c => c.Id == customer.Id);
        Assert.NotNull(customerEntity.AccountId);
        Assert.NotNull(customerEntity.Account);
        Assert.Equal("1130", customerEntity.Account!.Parent!.Code);
        Assert.Contains("(عميل)", customerEntity.Account.Name);
    }

    [Fact]
    public async Task CreateSupplier_AutoGeneratesSequentialCode()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var service = NewSupplierService(context);

        var first = await service.CreateSupplierAsync(new CreateSupplierRequest(null, "مورد الأول", null, null, null, null));
        var second = await service.CreateSupplierAsync(new CreateSupplierRequest(null, "مورد الثاني", null, null, null, null));

        Assert.Equal("SUPP-0001", first.Code);
        Assert.Equal("SUPP-0002", second.Code);
    }

    [Fact]
    public async Task CreateSupplier_CreatesSubAccountUnderAP2110()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var service = NewSupplierService(context);

        var supplier = await service.CreateSupplierAsync(new CreateSupplierRequest(null, "الشركة التجارية", null, null, null, null));

        var supplierEntity = await context.Suppliers.Include(s => s.Account).FirstAsync(s => s.Id == supplier.Id);
        Assert.NotNull(supplierEntity.AccountId);
        Assert.Equal("2110", supplierEntity.Account!.Parent!.Code);
        Assert.Contains("(مورد)", supplierEntity.Account.Name);
    }

    [Fact]
    public async Task CreateCustomer_ExplicitCodeStillRespected()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var service = NewCustomerService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest("VIP-01", "زبون مميز", null, null, null, null));

        Assert.Equal("VIP-01", customer.Code);
    }

    [Fact]
    public async Task CreateCustomer_DuplicateExplicitCodeRejected()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var service = NewCustomerService(context);

        await service.CreateCustomerAsync(new CreateCustomerRequest("DUP-01", "أ", null, null, null, null));
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCustomerAsync(new CreateCustomerRequest("DUP-01", "ب", null, null, null, null)));
    }

    [Fact]
    public async Task SubAccountCreation_IsIdempotentForSameName()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var accounting = new AccountingService(context, NullLogger<AccountingService>.Instance);

        var id1 = await accounting.GetOrCreateCustomerAccountAsync(company.Id, "شركة النور");
        var id2 = await accounting.GetOrCreateCustomerAccountAsync(company.Id, "شركة النور");

        Assert.Equal(id1, id2);
    }

    [Fact]
    public async Task SubAccountCodes_WalkParentBlockInTens()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyWithControlAccountsAsync(context);
        var accounting = new AccountingService(context, NullLogger<AccountingService>.Instance);

        var arId = await AccountResolutionHelper.ResolveAccountByCodeAsync(context, company.Id, "1130");
        var a = await accounting.CreateSubAccountAsync(company.Id, arId, "عميل أ", "party");
        var b = await accounting.CreateSubAccountAsync(company.Id, arId, "عميل ب", "party");

        Assert.Equal("1140", a.Code);
        Assert.Equal("1150", b.Code);
    }
}
