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

    private static async Task<Category> SeedCategoryAsync(AppDbContext context, string code = "CAT01", string name = "Electronics")
    {
        var category = new Category { Code = code, Name = name };
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        return category;
    }

    private static async Task<Warehouse> SeedWarehouseAsync(AppDbContext context, string code = "WH01", string name = "Main Warehouse")
    {
        var warehouse = new Warehouse { Code = code, Name = name, Location = "Tripoli" };
        context.Warehouses.Add(warehouse);
        await context.SaveChangesAsync();
        return warehouse;
    }

    private static async Task<Product> SeedProductAsync(AppDbContext context, Category category, string sku = "SKU001", string name = "Widget", decimal stock = 0m)
    {
        var product = new Product
        {
            SKU = sku,
            Name = name,
            CategoryId = category.Id,
            UnitOfMeasure = "Piece",
            PurchasePrice = 10m,
            SellingPrice = 15m,
            CurrentStock = stock,
            MinStockLevel = 10m
        };
        context.Products.Add(product);
        await context.SaveChangesAsync();
        // Reload to get category navigation
        await context.Entry(product).Reference(p => p.Category).LoadAsync();
        return product;
    }

    [Fact]
    public async Task CreateStockMovement_In_ShouldIncreaseProductStock()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context);
        var warehouse = await SeedWarehouseAsync(context);
        var product = await SeedProductAsync(context, category);

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

        // Act
        var result = await service.CreateStockMovementAsync(request, Guid.NewGuid());

        // Assert
        Assert.Equal(100m, result.Quantity);
        Assert.Equal(MovementType.In, result.MovementType);
        Assert.Equal(1000m, result.TotalCost);

        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(100m, updatedProduct!.CurrentStock);
    }

    [Fact]
    public async Task CreateStockMovement_Out_ShouldDecreaseProductStock()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context);
        var warehouse = await SeedWarehouseAsync(context);
        var product = await SeedProductAsync(context, category, stock: 200m);

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

        // Act
        var result = await service.CreateStockMovementAsync(request, Guid.NewGuid());

        // Assert
        Assert.Equal(50m, result.Quantity);
        Assert.Equal(MovementType.Out, result.MovementType);

        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(150m, updatedProduct!.CurrentStock);
    }

    [Fact]
    public async Task CreateStockMovement_Out_ShouldThrow_WhenInsufficientStock()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context);
        var warehouse = await SeedWarehouseAsync(context);
        var product = await SeedProductAsync(context, category, stock: 10m);

        var request = new CreateStockMovementRequest(
            ProductId: product.Id,
            WarehouseId: warehouse.Id,
            MovementType: MovementType.Out,
            Quantity: 50m, // Only 10 in stock
            UnitCost: 10m,
            ReferenceDocument: null,
            Notes: null,
            MovementDate: null
        );

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateStockMovementAsync(request, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateStockMovement_Adjustment_ShouldUpdateStock()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context);
        var warehouse = await SeedWarehouseAsync(context);
        var product = await SeedProductAsync(context, category, stock: 100m);

        var request = new CreateStockMovementRequest(
            ProductId: product.Id,
            WarehouseId: warehouse.Id,
            MovementType: MovementType.Adjustment,
            Quantity: 15m, // Positive adjustment
            UnitCost: 10m,
            ReferenceDocument: null,
            Notes: "Stock count correction",
            MovementDate: null
        );

        // Act
        var result = await service.CreateStockMovementAsync(request, Guid.NewGuid());

        // Assert
        Assert.Equal(15m, result.Quantity);
        var updatedProduct = await context.Products.FindAsync(product.Id);
        Assert.Equal(115m, updatedProduct!.CurrentStock);
    }

    [Fact]
    public async Task GetLowStockAlerts_ShouldReturnProductsBelowMinLevel()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context);
        var warehouse = await SeedWarehouseAsync(context);

        // Product A: below min stock (5 < 10)
        var productA = await SeedProductAsync(context, category, "SKU-A", "Low Item", stock: 5m);
        // Product B: above min stock (50 > 10)
        var productB = await SeedProductAsync(context, category, "SKU-B", "Good Item", stock: 50m);

        // Act
        var alerts = await service.GetLowStockAlertsAsync();

        // Assert
        Assert.Single(alerts);
        Assert.Equal(productA.SKU, alerts[0].ProductSKU);
        Assert.Equal(5m, alerts[0].CurrentStock);
        Assert.Equal(5m, alerts[0].Deficit); // 10 - 5 = 5
    }

    [Fact]
    public async Task CreateCategory_ShouldEnforceUniqueCode()
    {
        using var context = CreateInMemoryDbContext();
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);

        await service.CreateCategoryAsync(new CreateCategoryRequest("ELEC", "Electronics", null));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCategoryAsync(new CreateCategoryRequest("ELEC", "Duplicate", null)));
    }

    [Fact]
    public async Task CreateProduct_ShouldEnforceUniqueSKU()
    {
        using var context = CreateInMemoryDbContext();
        var service = new InventoryService(context, NullLogger<InventoryService>.Instance);
        var category = await SeedCategoryAsync(context);

        await service.CreateProductAsync(new CreateProductRequest(
            "SKU-001", "Widget", null, category.Id, "Piece"));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateProductAsync(new CreateProductRequest(
                "SKU-001", "Duplicate Widget", null, category.Id, "Piece")));
    }
}
