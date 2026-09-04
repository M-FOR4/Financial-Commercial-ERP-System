using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class PurchaseTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()).Options;
        return new AppDbContext(options);
    }

    private static async Task SeedData(AppDbContext context)
    {
        context.Accounts.AddRange(
            new Account { Code = "1140", Name = "Inventory", Type = AccountType.Asset, IsHeader = false },
            new Account { Code = "2110", Name = "Accounts Payable", Type = AccountType.Liability, IsHeader = false }
        );
        context.Categories.Add(new Category { Code = "GEN", Name = "General" });
        await context.SaveChangesAsync();
        var cat = await context.Categories.FirstAsync();
        context.Products.Add(new Product { SKU = "SKU-A", Name = "Product A", CategoryId = cat.Id, UnitOfMeasure = "Piece", PurchasePrice = 10m, SellingPrice = 20m, CurrentStock = 50m });
        context.Warehouses.Add(new Warehouse { Code = "WH1", Name = "Main WH", Location = "Tripoli" });
        context.Suppliers.Add(new Supplier { Code = "SUP-001", Name = "Test Supplier" });
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateDraft_ShouldCalculateD030_ProportionalCostAllocation()
    {
        using var ctx = CreateInMemoryDbContext();
        await SeedData(ctx);
        var service = new PurchaseService(ctx, NullLogger<PurchaseService>.Instance);
        var supplier = await ctx.Suppliers.FirstAsync();
        var warehouse = await ctx.Warehouses.FirstAsync();
        var product = await ctx.Products.FirstAsync();

        var request = new CreatePurchaseInvoiceRequest(
            SupplierId: supplier.Id, WarehouseId: warehouse.Id,
            Lines: new List<PurchaseInvoiceLineRequest>
            {
                new(product.Id, Quantity: 100m, DirectUnitPrice: 10m, Notes: null), // SubTotal = 1000
                new(product.Id, Quantity: 50m, DirectUnitPrice: 20m, Notes: null),  // SubTotal = 1000
            },
            InvoiceDate: DateTime.UtcNow,
            AdditionalCosts: 300m, // D-030: freight/customs
            Notes: null
        );

        var draft = await service.CreatePurchaseInvoiceDraftAsync(request);
        Assert.Equal(JournalEntryStatus.Draft, draft.Status);
        Assert.Equal(2000m, draft.SubTotal);
        Assert.Equal(300m, draft.AdditionalCosts);
        Assert.Equal(2300m, draft.TotalAmount);

        // D-030: Each line should have proportional allocation
        // Line 1: 1000/2000 * 300 = 150, EffectiveUnitCost = 10 + 150/100 = 11.50
        var line1 = draft.Lines.First(l => l.Quantity == 100m);
        Assert.Equal(150m, Math.Round(line1.AllocatedAdditionalCost, 4));
        Assert.Equal(11.50m, Math.Round(line1.EffectiveUnitCost, 4));

        // Line 2: 1000/2000 * 300 = 150, EffectiveUnitCost = 20 + 150/50 = 23
        var line2 = draft.Lines.First(l => l.Quantity == 50m);
        Assert.Equal(150m, Math.Round(line2.AllocatedAdditionalCost, 4));
        Assert.Equal(23m, Math.Round(line2.EffectiveUnitCost, 4));
    }

    [Fact]
    public async Task PostPurchaseInvoice_ShouldCreateInboundStockAndJournalEntry()
    {
        using var ctx = CreateInMemoryDbContext();
        await SeedData(ctx);
        var service = new PurchaseService(ctx, NullLogger<PurchaseService>.Instance);
        var supplier = await ctx.Suppliers.FirstAsync();
        var warehouse = await ctx.Warehouses.FirstAsync();
        var product = await ctx.Products.FirstAsync();

        var request = new CreatePurchaseInvoiceRequest(
            SupplierId: supplier.Id, WarehouseId: warehouse.Id,
            Lines: new List<PurchaseInvoiceLineRequest> { new(product.Id, 20m, 10m, null) },
            AdditionalCosts: 0m
        );
        var draft = await service.CreatePurchaseInvoiceDraftAsync(request);
        var posted = await service.PostPurchaseInvoiceAsync(draft.Id, Guid.NewGuid());

        Assert.Equal(JournalEntryStatus.Posted, posted.Status);
        Assert.NotNull(posted.JournalEntryId);

        // Stock should increase
        var updatedProduct = await ctx.Products.FindAsync(product.Id);
        Assert.Equal(70m, updatedProduct!.CurrentStock); // 50 + 20

        // Journal entry: Debit Inventory, Credit AP
        var je = await ctx.JournalEntries.Include(j => j.Lines).FirstAsync(j => j.Id == posted.JournalEntryId);
        var invLine = je.Lines.First(l => l.Account.Code == "1140");
        Assert.Equal(200m, invLine.Debit); // 20 * 10
        var apLine = je.Lines.First(l => l.Account.Code == "2110");
        Assert.Equal(200m, apLine.Credit);
    }

    [Fact]
    public async Task CancelPurchaseInvoice_ShouldReverseBalancesAndStock()
    {
        using var ctx = CreateInMemoryDbContext();
        await SeedData(ctx);
        var service = new PurchaseService(ctx, NullLogger<PurchaseService>.Instance);
        var supplier = await ctx.Suppliers.FirstAsync();
        var warehouse = await ctx.Warehouses.FirstAsync();
        var product = await ctx.Products.FirstAsync();

        var draft = await service.CreatePurchaseInvoiceDraftAsync(new CreatePurchaseInvoiceRequest(
            supplier.Id, warehouse.Id, new List<PurchaseInvoiceLineRequest> { new(product.Id, 10m, 10m, null) }
        ));
        var posted = await service.PostPurchaseInvoiceAsync(draft.Id, Guid.NewGuid());
        Assert.Equal(60m, (await ctx.Products.FindAsync(product.Id))!.CurrentStock);

        var cancelled = await service.CancelPurchaseInvoiceAsync(posted.Id);
        Assert.Equal(JournalEntryStatus.Cancelled, cancelled.Status);
        Assert.Equal(50m, (await ctx.Products.FindAsync(product.Id))!.CurrentStock); // Stock restored
    }

    [Fact]
    public async Task PostPurchaseReturn_ShouldDeductStockAndCreateJournalEntry()
    {
        using var ctx = CreateInMemoryDbContext();
        await SeedData(ctx);
        var service = new PurchaseService(ctx, NullLogger<PurchaseService>.Instance);
        var supplier = await ctx.Suppliers.FirstAsync();
        var warehouse = await ctx.Warehouses.FirstAsync();
        var product = await ctx.Products.FirstAsync();

        // Purchase first
        var draft = await service.CreatePurchaseInvoiceDraftAsync(new CreatePurchaseInvoiceRequest(
            supplier.Id, warehouse.Id, new List<PurchaseInvoiceLineRequest> { new(product.Id, 20m, 10m, null) }
        ));
        var posted = await service.PostPurchaseInvoiceAsync(draft.Id, Guid.NewGuid());
        Assert.Equal(70m, (await ctx.Products.FindAsync(product.Id))!.CurrentStock);

        var purchaseLine = await ctx.PurchaseInvoiceLines.FirstAsync(l => l.PurchaseInvoiceId == posted.Id);

        // Create and post return for 5 units
        var returnDraft = await service.CreatePurchaseReturnDraftAsync(new CreatePurchaseReturnRequest(
            posted.Id, "Returning 5", new List<PurchaseReturnLineRequest> { new(purchaseLine.Id, 5m, null) }
        ));
        Assert.Equal(JournalEntryStatus.Draft, returnDraft.Status);

        var postedReturn = await service.PostPurchaseReturnAsync(returnDraft.Id, Guid.NewGuid());
        Assert.Equal(JournalEntryStatus.Posted, postedReturn.Status);

        // Stock reduced: 70 - 5 = 65
        Assert.Equal(65m, (await ctx.Products.FindAsync(product.Id))!.CurrentStock);
    }
}
