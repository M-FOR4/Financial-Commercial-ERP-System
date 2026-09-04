using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class SalesTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task SeedAccountsAndProducts(AppDbContext context)
    {
        // Seed COA accounts needed for sales posting
        var arAccount = new Account { Code = "1130", Name = "Accounts Receivable", Type = AccountType.Asset, IsHeader = false };
        var salesAccount = new Account { Code = "4100", Name = "Sales Revenue", Type = AccountType.Revenue, IsHeader = false };
        var cogsAccount = new Account { Code = "5100", Name = "COGS", Type = AccountType.Expense, IsHeader = false };
        var invAccount = new Account { Code = "1140", Name = "Inventory", Type = AccountType.Asset, IsHeader = false };
        context.Accounts.AddRange(arAccount, salesAccount, cogsAccount, invAccount);

        var category = new Category { Code = "GEN", Name = "General" };
        context.Categories.Add(category);
        await context.SaveChangesAsync();

        var product = new Product
        {
            SKU = "WIDGET-001", Name = "Widget", CategoryId = category.Id,
            UnitOfMeasure = "Piece", PurchasePrice = 10m, SellingPrice = 20m,
            CurrentStock = 100m, MinStockLevel = 10m
        };
        context.Products.Add(product);

        var warehouse = new Warehouse { Code = "WH-MAIN", Name = "Main Warehouse", Location = "Tripoli" };
        context.Warehouses.Add(warehouse);

        var customer = new Customer { Code = "CUST-001", Name = "Test Customer" };
        context.Customers.Add(customer);

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task PostSalesInvoice_ShouldCreateJournalEntryAndDeductStock()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        await SeedAccountsAndProducts(context);
        var service = new SalesService(context, NullLogger<SalesService>.Instance);

        var customer = await context.Customers.FirstAsync(c => c.Code == "CUST-001");
        var warehouse = await context.Warehouses.FirstAsync(w => w.Code == "WH-MAIN");
        var product = await context.Products.FirstAsync(p => p.SKU == "WIDGET-001");

        // Create draft invoice
        var createReq = new CreateSalesInvoiceRequest(
            CustomerId: customer.Id,
            WarehouseId: warehouse.Id,
            Lines: new List<SalesInvoiceLineRequest>
            {
                new(product.Id, Quantity: 10m, UnitPrice: 20m, Notes: null)
            },
            InvoiceDate: DateTime.UtcNow,
            DueDate: null,
            DiscountAmount: 0m,
            TaxRate: 0m,
            Notes: "Test sale"
        );
        var draft = await service.CreateSalesInvoiceDraftAsync(createReq);
        Assert.Equal(JournalEntryStatus.Draft, draft.Status);
        Assert.Equal(10m * 20m, draft.TotalAmount);

        // Act: Post
        var posted = await service.PostSalesInvoiceAsync(draft.Id, Guid.NewGuid());

        // Assert
        Assert.Equal(JournalEntryStatus.Posted, posted.Status);
        Assert.NotNull(posted.JournalEntryId);

        // Product stock should be deducted
        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(90m, updatedProduct!.CurrentStock); // 100 - 10

        // Journal Entry should exist with 4 lines (AR, Revenue, COGS, Inventory)
        var je = await context.JournalEntries.Include(j => j.Lines).FirstAsync(j => j.Id == posted.JournalEntryId);
        Assert.Equal(4, je.Lines.Count);

        // Verify balances: AR debit 200, Revenue credit 200, COGS debit 100, Inventory credit 100
        var arLine = je.Lines.First(l => l.Account.Code == "1130");
        Assert.Equal(200m, arLine.Debit);

        var revLine = je.Lines.First(l => l.Account.Code == "4100");
        Assert.Equal(200m, revLine.Credit);

        var cogsLine = je.Lines.First(l => l.Account.Code == "5100");
        Assert.Equal(100m, cogsLine.Debit); // 10 units × 10 purchase price

        var invLine = je.Lines.First(l => l.Account.Code == "1140");
        Assert.Equal(100m, invLine.Credit);
    }

    [Fact]
    public async Task CancelSalesInvoice_ShouldReverseBalancesAndRestoreStock()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        await SeedAccountsAndProducts(context);
        var service = new SalesService(context, NullLogger<SalesService>.Instance);

        var customer = await context.Customers.FirstAsync(c => c.Code == "CUST-001");
        var warehouse = await context.Warehouses.FirstAsync(w => w.Code == "WH-MAIN");
        var product = await context.Products.FirstAsync(p => p.SKU == "WIDGET-001");

        var createReq = new CreateSalesInvoiceRequest(
            CustomerId: customer.Id, WarehouseId: warehouse.Id,
            Lines: new List<SalesInvoiceLineRequest> { new(product.Id, 10m, 20m, null) },
            Notes: "Test cancel"
        );
        var draft = await service.CreateSalesInvoiceDraftAsync(createReq);
        var posted = await service.PostSalesInvoiceAsync(draft.Id, Guid.NewGuid());
        Assert.Equal(90m, (await context.Products.FindAsync(product.Id))!.CurrentStock);

        // Act: Cancel
        var cancelled = await service.CancelSalesInvoiceAsync(posted.Id);

        // Assert
        Assert.Equal(JournalEntryStatus.Cancelled, cancelled.Status);
        Assert.Equal(100m, (await context.Products.FindAsync(product.Id))!.CurrentStock); // Stock restored
    }

    [Fact]
    public async Task PostSalesReturn_ShouldUseD029_CostAtSale_Restock()
    {
        // Arrange: Create invoice, post it, then return items
        using var context = CreateInMemoryDbContext();
        await SeedAccountsAndProducts(context);
        var service = new SalesService(context, NullLogger<SalesService>.Instance);

        var customer = await context.Customers.FirstAsync(c => c.Code == "CUST-001");
        var warehouse = await context.Warehouses.FirstAsync(w => w.Code == "WH-MAIN");
        var product = await context.Products.FirstAsync(p => p.SKU == "WIDGET-001");

        // Invoice: 5 units at 20 each, cost at sale = 10 (purchase price)
        var createReq = new CreateSalesInvoiceRequest(
            CustomerId: customer.Id, WarehouseId: warehouse.Id,
            Lines: new List<SalesInvoiceLineRequest> { new(product.Id, 5m, 20m, null) },
            Notes: "Pre-return invoice"
        );
        var draft = await service.CreateSalesInvoiceDraftAsync(createReq);
        var posted = await service.PostSalesInvoiceAsync(draft.Id, Guid.NewGuid());
        Assert.Equal(95m, (await context.Products.FindAsync(product.Id))!.CurrentStock); // 100 - 5

        // Get the original invoice line ID
        var invoiceLine = await context.SalesInvoiceLines.FirstAsync(l => l.SalesInvoiceId == posted.Id);

        // Create return for 3 of the 5 units
        var returnReq = new CreateSalesReturnRequest(
            OriginalInvoiceId: posted.Id,
            Notes: "Customer returned 3 units",
            Lines: new List<SalesReturnLineRequest> { new(invoiceLine.Id, 3m, null) }
        );
        var returnDraft = await service.CreateSalesReturnDraftAsync(returnReq);
        Assert.Equal(JournalEntryStatus.Draft, returnDraft.Status);

        // Act: Post the return
        var postedReturn = await service.PostSalesReturnAsync(returnDraft.Id, Guid.NewGuid());

        // Assert: D-029 — RestockUnitCost should be locked to original UnitCostAtSale (10)
        var returnLine = await context.SalesReturnLines.FirstAsync(l => l.SalesReturnId == postedReturn.Id);
        Assert.Equal(10m, returnLine.RestockUnitCost); // D-029: cost at sale, not current cost

        // Stock restored: 95 + 3 = 98
        Assert.Equal(98m, (await context.Products.FindAsync(product.Id))!.CurrentStock);

        // Return Journal Entry should exist
        Assert.NotNull(postedReturn.JournalEntryId);
    }
}
