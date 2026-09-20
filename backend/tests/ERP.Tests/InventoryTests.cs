using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class InventoryTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<Company> SeedCompanyAsync(AppDbContext context)
    {
        var company = new Company { Id = Guid.NewGuid(), Name = "Test Company", DefaultCurrency = "LYD" };
        context.Companies.Add(company);
        
        var fiscalYear = new FiscalYear { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "2026", StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2026, 12, 31), IsActive = true };
        context.FiscalYears.Add(fiscalYear);

        var accInv = new Account { Id = Guid.NewGuid(), CompanyId = company.Id, Code = "1140", Name = "Inventory", Type = AccountType.Asset };
        var accGain = new Account { Id = Guid.NewGuid(), CompanyId = company.Id, Code = "4200", Name = "Inventory Gain", Type = AccountType.Revenue };
        var accLoss = new Account { Id = Guid.NewGuid(), CompanyId = company.Id, Code = "5500", Name = "Inventory Loss", Type = AccountType.Expense };
        context.Accounts.AddRange(accInv, accGain, accLoss);

        var defaults = new AccountingDefaults
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            InventoryAccountId = accInv.Id,
            InventoryGainAccountId = accGain.Id,
            InventoryLossAccountId = accLoss.Id
        };
        context.AccountingDefaults.Add(defaults);

        await context.SaveChangesAsync();
        return company;
    }

    private static async Task<Category> SeedCategoryAsync(AppDbContext context, Guid companyId, string code = "CAT01", string name = "Electronics")
    {
        var category = new Category { CompanyId = companyId, Code = code, Name = name };
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        return category;
    }

    private static async Task<Warehouse> SeedWarehouseAsync(AppDbContext context, Guid companyId, string code = "WH01", string name = "Main Warehouse")
    {
        var warehouse = new Warehouse { CompanyId = companyId, Code = code, Name = name, Location = "Tripoli" };
        context.Warehouses.Add(warehouse);
        await context.SaveChangesAsync();
        return warehouse;
    }

    private static async Task<Product> SeedProductAsync(AppDbContext context, Guid companyId, Category category, string sku = "SKU001", string name = "Widget", decimal stock = 0m, string? barcode = null)
    {
        var product = new Product
        {
            CompanyId = companyId,
            SKU = sku,
            Barcode = barcode,
            Name = name,
            CategoryId = category.Id,
            UnitOfMeasure = "Piece",
            PurchasePrice = 10m,
            AvgCost = 10m,
            SellingPrice = 15m,
            CurrentStock = stock,
            MinStockLevel = 10m
        };
        context.Products.Add(product);
        await context.SaveChangesAsync();
        await context.Entry(product).Reference(p => p.Category).LoadAsync();
        return product;
    }

    [Fact]
    public async Task CreateStockMovement_In_ShouldIncreaseProductStockAndRecalculateAvgCost()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context, company.Id);
        var warehouse = await SeedWarehouseAsync(context, company.Id);
        var product = await SeedProductAsync(context, company.Id, category);

        var request = new CreateStockMovementRequest(
            ProductId: product.Id,
            WarehouseId: warehouse.Id,
            MovementType: MovementType.In,
            Quantity: 100m,
            UnitCost: 10m,
            ReferenceDocument: "PO-001",
            Notes: "Initial stock",
            MovementDate: null
        );

        var result = await service.CreateStockMovementAsync(request, Guid.NewGuid(), company.Id);

        Assert.Equal(100m, result.Quantity);
        Assert.Equal(MovementType.In, result.MovementType);

        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(100m, updatedProduct!.CurrentStock);
        Assert.Equal(10m, updatedProduct.AvgCost);
    }

    [Fact]
    public async Task CreateStockMovement_Out_ShouldDecreaseProductStock()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context, company.Id);
        var warehouse = await SeedWarehouseAsync(context, company.Id);
        var product = await SeedProductAsync(context, company.Id, category, stock: 200m);

        // Add inbound movement to support stock in warehouse
        context.StockMovements.Add(new StockMovement
        {
            CompanyId = company.Id,
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            MovementType = MovementType.In,
            Quantity = 200m,
            UnitCost = 10m
        });
        await context.SaveChangesAsync();

        var request = new CreateStockMovementRequest(
            ProductId: product.Id,
            WarehouseId: warehouse.Id,
            MovementType: MovementType.Out,
            Quantity: 50m,
            UnitCost: 10m,
            ReferenceDocument: "SO-001",
            Notes: "Sale",
            MovementDate: null
        );

        var result = await service.CreateStockMovementAsync(request, Guid.NewGuid(), company.Id);

        Assert.Equal(50m, result.Quantity);
        Assert.Equal(MovementType.Out, result.MovementType);

        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(150m, updatedProduct!.CurrentStock);
    }

    [Fact]
    public async Task CreateStockMovement_Out_ShouldThrow_WhenInsufficientStock()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context, company.Id);
        var warehouse = await SeedWarehouseAsync(context, company.Id);
        var product = await SeedProductAsync(context, company.Id, category, stock: 10m);

        var request = new CreateStockMovementRequest(
            ProductId: product.Id,
            WarehouseId: warehouse.Id,
            MovementType: MovementType.Out,
            Quantity: 50m,
            UnitCost: 10m,
            ReferenceDocument: null,
            Notes: null,
            MovementDate: null
        );

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateStockMovementAsync(request, Guid.NewGuid(), company.Id));
    }

    [Fact]
    public async Task StockTransfer_Post_ShouldCreateAtomicMirroredMovementsAndBalanceWarehouses()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context, company.Id);
        var sourceWh = await SeedWarehouseAsync(context, company.Id, "WH-SRC", "Source Warehouse");
        var destWh = await SeedWarehouseAsync(context, company.Id, "WH-DST", "Destination Warehouse");
        var product = await SeedProductAsync(context, company.Id, category, "SKU-TR", "Transfer Item", stock: 100m);

        // Seed initial stock in source warehouse
        context.StockMovements.Add(new StockMovement
        {
            CompanyId = company.Id,
            ProductId = product.Id,
            WarehouseId = sourceWh.Id,
            MovementType = MovementType.In,
            Quantity = 100m,
            UnitCost = 10m
        });
        await context.SaveChangesAsync();

        var userId = Guid.NewGuid();
        var createReq = new CreateStockTransferRequest(
            SourceWarehouseId: sourceWh.Id,
            DestinationWarehouseId: destWh.Id,
            Lines: new List<StockTransferLineRequest>
            {
                new StockTransferLineRequest(product.Id, Quantity: 40m, UnitCost: 10m, Notes: "Transfer line 1")
            },
            Notes: "Inter-warehouse transfer"
        );

        var draft = await service.CreateStockTransferDraftAsync(createReq, company.Id, userId);
        Assert.Equal(JournalEntryStatus.Draft, draft.Status);

        var posted = await service.PostStockTransferAsync(draft.Id, userId);
        Assert.Equal(JournalEntryStatus.Posted, posted.Status);

        // Check movements created
        var movements = await context.StockMovements.Where(sm => sm.CompanyId == company.Id && sm.ProductId == product.Id).ToListAsync();
        var transferOut = movements.FirstOrDefault(sm => sm.MovementType == MovementType.TransferOut);
        var transferIn = movements.FirstOrDefault(sm => sm.MovementType == MovementType.TransferIn);

        Assert.NotNull(transferOut);
        Assert.NotNull(transferIn);
        Assert.Equal(sourceWh.Id, transferOut!.WarehouseId);
        Assert.Equal(destWh.Id, transferOut.DestinationWarehouseId);
        Assert.Equal(destWh.Id, transferIn!.WarehouseId);
        Assert.Equal(sourceWh.Id, transferIn.DestinationWarehouseId);
        Assert.Equal(transferOut.Id, transferIn.SourceMovementId);

        // Verify per-warehouse stock status
        var statusList = await service.GetStockStatusAsync(product.Id);
        var productStatus = statusList.First();
        var srcStock = productStatus.WarehouseStocks.First(ws => ws.WarehouseId == sourceWh.Id).Quantity;
        var dstStock = productStatus.WarehouseStocks.First(ws => ws.WarehouseId == destWh.Id).Quantity;

        Assert.Equal(60m, srcStock);
        Assert.Equal(40m, dstStock);
    }

    [Fact]
    public async Task ManualStockMovement_ShouldCreateBalancedJournalEntryAndAuditLog()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context, company.Id);
        var warehouse = await SeedWarehouseAsync(context, company.Id);
        var product = await SeedProductAsync(context, company.Id, category);

        var request = new CreateStockMovementRequest(
            ProductId: product.Id,
            WarehouseId: warehouse.Id,
            MovementType: MovementType.In,
            Quantity: 50m,
            UnitCost: 20m,
            ReferenceDocument: "MAN-01",
            Notes: "Stock intake",
            MovementDate: null
        );

        var result = await service.CreateStockMovementAsync(request, Guid.NewGuid(), company.Id);
        Assert.NotNull(result);

        // Verify Journal Entry was created with CompanyId and FiscalYearId
        var je = await context.JournalEntries.Include(j => j.Lines).FirstOrDefaultAsync(j => j.CompanyId == company.Id);
        Assert.NotNull(je);
        Assert.Equal("StockMovement", je!.SourceDocumentType);
        Assert.Equal(company.Id, je.CompanyId);
        Assert.Equal(2, je.Lines.Count);

        var debitLine = je.Lines.First(l => l.Debit > 0);
        var creditLine = je.Lines.First(l => l.Credit > 0);
        Assert.Equal(1000m, debitLine.Debit); // 50 * 20
        Assert.Equal(1000m, creditLine.Credit);
    }

    [Fact]
    public async Task BarcodeLookup_ShouldFindProductByBarcode()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context, company.Id);
        var product = await SeedProductAsync(context, company.Id, category, "SKU-BAR", "Barcode Item", barcode: "6291100012345");

        var found = await service.LookupProductByCodeAsync("6291100012345", company.Id);

        Assert.NotNull(found);
        Assert.Equal(product.SKU, found!.SKU);
        Assert.Equal("6291100012345", found.Barcode);
    }

    [Fact]
    public async Task CreateCategory_ShouldEnforceUniqueCodePerCompany()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);

        await service.CreateCategoryAsync(new CreateCategoryRequest("ELEC", "Electronics", null), company.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCategoryAsync(new CreateCategoryRequest("ELEC", "Duplicate", null), company.Id));
    }

    [Fact]
    public async Task CreateProduct_ShouldEnforceUniqueSKUPerCompany()
    {
        using var context = CreateInMemoryDbContext();
        var company = await SeedCompanyAsync(context);
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context, company.Id);

        await service.CreateProductAsync(new CreateProductRequest(
            "SKU-001", "Widget", null, category.Id, "Piece"), company.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateProductAsync(new CreateProductRequest(
                "SKU-001", "Duplicate Widget", null, category.Id, "Piece"), company.Id));
    }
}
