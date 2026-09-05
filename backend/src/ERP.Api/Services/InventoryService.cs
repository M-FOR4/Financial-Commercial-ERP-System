using ERP.Api.Common;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _context;
    private readonly ILogger<InventoryService> _logger;

    public InventoryService(AppDbContext context, ILogger<InventoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ═══════════════════════════════════════════
    //  Categories
    // ═══════════════════════════════════════════

    public async Task<List<CategoryDto>> GetCategoriesAsync(bool? activeOnly = null)
    {
        var query = _context.Categories.AsNoTracking().AsQueryable();
        if (activeOnly.HasValue)
            query = query.Where(c => c.IsActive == activeOnly.Value);

        var categories = await query.OrderBy(c => c.Code).ToListAsync();

        return categories.Select(c => new CategoryDto(
            c.Id, c.Code, c.Name, c.Description, c.IsActive,
            c.Products.Count, c.CreatedAt
        )).ToList();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(Guid id)
    {
        var c = await _context.Categories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (c == null) return null;

        return new CategoryDto(
            c.Id, c.Code, c.Name, c.Description, c.IsActive,
            await _context.Products.CountAsync(p => p.CategoryId == c.Id),
            c.CreatedAt
        );
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request)
    {
        if (await _context.Categories.AnyAsync(c => c.Code == request.Code.Trim()))
            throw new InvalidOperationException($"A category with code '{request.Code}' already exists.");

        var category = new Category
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return new CategoryDto(
            category.Id, category.Code, category.Name, category.Description,
            category.IsActive, 0, category.CreatedAt
        );
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return null;

        category.Name = request.Name.Trim();
        category.Description = request.Description?.Trim();
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var productCount = await _context.Products.CountAsync(p => p.CategoryId == category.Id);
        return new CategoryDto(
            category.Id, category.Code, category.Name, category.Description,
            category.IsActive, productCount, category.CreatedAt
        );
    }

    // ═══════════════════════════════════════════
    //  Warehouses
    // ═══════════════════════════════════════════

    public async Task<List<WarehouseDto>> GetWarehousesAsync(bool? activeOnly = null)
    {
        var query = _context.Warehouses.AsNoTracking().AsQueryable();
        if (activeOnly.HasValue)
            query = query.Where(w => w.IsActive == activeOnly.Value);

        var warehouses = await query.OrderBy(w => w.Code).ToListAsync();
        return warehouses.Select(MapToWarehouseDto).ToList();
    }

    public async Task<WarehouseDto?> GetWarehouseByIdAsync(Guid id)
    {
        var w = await _context.Warehouses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return w == null ? null : MapToWarehouseDto(w);
    }

    public async Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseRequest request)
    {
        if (await _context.Warehouses.AnyAsync(w => w.Code == request.Code.Trim()))
            throw new InvalidOperationException($"A warehouse with code '{request.Code}' already exists.");

        var warehouse = new Warehouse
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Location = request.Location?.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        return MapToWarehouseDto(warehouse);
    }

    public async Task<WarehouseDto?> UpdateWarehouseAsync(Guid id, UpdateWarehouseRequest request)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null) return null;

        warehouse.Name = request.Name.Trim();
        warehouse.Location = request.Location?.Trim();
        warehouse.IsActive = request.IsActive;
        warehouse.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToWarehouseDto(warehouse);
    }

    // ═══════════════════════════════════════════
    //  Products
    // ═══════════════════════════════════════════

    public async Task<List<ProductDto>> GetProductsAsync(Guid? categoryId = null, bool? activeOnly = null, string? search = null)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .AsNoTracking()
            .AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        if (activeOnly.HasValue)
            query = query.Where(p => p.IsActive == activeOnly.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.SKU.ToLower().Contains(s) || p.Name.ToLower().Contains(s));
        }

        var products = await query.OrderBy(p => p.SKU).ToListAsync();
        return products.Select(MapToProductDto).ToList();
    }

    public async Task<ProductDto?> GetProductByIdAsync(Guid id)
    {
        var p = await _context.Products
            .Include(x => x.Category)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        return p == null ? null : MapToProductDto(p);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, Guid companyId)
    {
        if (await _context.Products.AnyAsync(p => p.SKU == request.SKU.Trim()))
            throw new InvalidOperationException($"A product with SKU '{request.SKU}' already exists.");

        var category = await _context.Categories.FindAsync(request.CategoryId);
        if (category == null)
            throw new InvalidOperationException("Specified category does not exist.");

        // Resolve BaseUnitId from UnitOfMeasure string
        var unitName = request.UnitOfMeasure?.Trim();
        var baseUnit = await _context.Units.FirstOrDefaultAsync(u =>
            u.Name == unitName || u.Symbol == unitName ||
            u.Name == unitName!.Split(' ').Last());
        if (baseUnit == null)
        {
            // Fallback: try "قطعة" (Piece) as default
            baseUnit = await _context.Units.FirstOrDefaultAsync(u => u.Name == "قطعة");
            baseUnit ??= await _context.Units.FirstOrDefaultAsync();
        }

        var product = new Product
        {
            CompanyId = companyId,
            SKU = request.SKU.Trim(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CategoryId = request.CategoryId,
            UnitOfMeasure = request.UnitOfMeasure?.Trim(),
            BaseUnitId = baseUnit?.Id ?? Guid.Empty,
            PurchasePrice = request.PurchasePrice,
            SellingPrice = request.SellingPrice,
            CurrentStock = 0m,
            MinStockLevel = request.MinStockLevel,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return MapToProductDto(product);
    }

    public async Task<ProductDto?> UpdateProductAsync(Guid id, UpdateProductRequest request)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (product == null) return null;

        var category = await _context.Categories.FindAsync(request.CategoryId);
        if (category == null)
            throw new InvalidOperationException("Specified category does not exist.");

        product.Name = request.Name.Trim();
        product.Description = request.Description?.Trim();
        product.CategoryId = request.CategoryId;
        product.UnitOfMeasure = request.UnitOfMeasure.Trim();
        product.PurchasePrice = request.PurchasePrice;
        product.SellingPrice = request.SellingPrice;
        product.MinStockLevel = request.MinStockLevel;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Reload with category included
        await _context.Entry(product).Reference(p => p.Category).LoadAsync();
        return MapToProductDto(product);
    }

    // ═══════════════════════════════════════════
    //  Stock Movements
    // ═══════════════════════════════════════════

    public async Task<List<StockMovementDto>> GetStockMovementsAsync(
        Guid? productId = null, Guid? warehouseId = null,
        MovementType? type = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        // Npgsql requires UTC Kind for timestamptz comparisons; query-string dates arrive as Unspecified.
        // (Treating them as UTC via SpecifyKind is correct — ToUniversalTime would shift naive dates by the server offset.)
        fromDate = fromDate.ToUtc();
        toDate = toDate.ToUtc();

        var query = _context.StockMovements
            .Include(sm => sm.Product)
            .Include(sm => sm.Warehouse)
            .Include(sm => sm.CreatedByUser)
            .AsNoTracking()
            .AsQueryable();

        if (productId.HasValue)
            query = query.Where(sm => sm.ProductId == productId.Value);

        if (warehouseId.HasValue)
            query = query.Where(sm => sm.WarehouseId == warehouseId.Value);

        if (type.HasValue)
            query = query.Where(sm => sm.MovementType == type.Value);

        if (fromDate.HasValue)
            query = query.Where(sm => sm.MovementDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(sm => sm.MovementDate <= toDate.Value);

        var movements = await query.OrderByDescending(sm => sm.MovementDate).ThenByDescending(sm => sm.CreatedAt).ToListAsync();
        return movements.Select(MapToStockMovementDto).ToList();
    }

    public async Task<StockMovementDto> CreateStockMovementAsync(CreateStockMovementRequest request, Guid? createdByUserId)
    {
        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null)
            throw new InvalidOperationException("Specified product does not exist.");

        var warehouse = await _context.Warehouses.FindAsync(request.WarehouseId);
        if (warehouse == null)
            throw new InvalidOperationException("Specified warehouse does not exist.");

        if (!warehouse.IsActive)
            throw new InvalidOperationException($"Warehouse '{warehouse.Name}' is not active.");

        // For Out and Transfer movements, check sufficient stock
        if (request.MovementType is MovementType.Out or MovementType.Transfer)
        {
            if (product.CurrentStock < request.Quantity)
                throw new InvalidOperationException(
                    $"Insufficient stock for '{product.SKU}'. Available: {product.CurrentStock}, Requested: {request.Quantity}. " +
                    "Negative stock policy: BLOCK (V1 default).");
        }

        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            // Update product stock based on movement type
            switch (request.MovementType)
            {
                case MovementType.In:
                case MovementType.Adjustment when request.Quantity >= 0:
                    product.CurrentStock += request.Quantity;
                    break;

                case MovementType.Out:
                    product.CurrentStock -= request.Quantity;
                    break;

                case MovementType.Adjustment when request.Quantity < 0:
                    var absQty = Math.Abs(request.Quantity);
                    if (product.CurrentStock < absQty)
                        throw new InvalidOperationException(
                            $"Insufficient stock for adjustment. Available: {product.CurrentStock}, Adjustment: {absQty}.");
                    product.CurrentStock -= absQty;
                    break;

                case MovementType.Transfer:
                    // Transfer out reduces stock (TransferIn would be a separate In movement)
                    product.CurrentStock -= request.Quantity;
                    break;
            }

            product.UpdatedAt = DateTime.UtcNow;

            var movement = new StockMovement
            {
                ProductId = request.ProductId,
                WarehouseId = request.WarehouseId,
                MovementType = request.MovementType,
                Quantity = Math.Abs(request.Quantity),
                UnitCost = request.UnitCost,
                ReferenceDocument = request.ReferenceDocument?.Trim(),
                Notes = request.Notes?.Trim(),
                MovementDate = request.MovementDate.ToUtc() ?? DateTime.UtcNow,
                CreatedByUserId = createdByUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.StockMovements.Add(movement);
            await _context.SaveChangesAsync();
            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            _logger.LogInformation("Stock movement created: {Type} {Qty} × {Product} in {Warehouse}",
                request.MovementType, request.Quantity, product.SKU, warehouse.Name);

            // Reload with navigation properties
            return await ReloadStockMovementAsync(movement.Id)
                ?? throw new InvalidOperationException("Failed to reload created stock movement.");
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }
            throw;
        }
    }

    // ═══════════════════════════════════════════
    //  Stock Status
    // ═══════════════════════════════════════════

    public async Task<List<StockStatusDto>> GetStockStatusAsync(Guid? productId = null, Guid? warehouseId = null)
    {
        var productsQuery = _context.Products
            .Include(p => p.Category)
            .AsNoTracking()
            .Where(p => p.IsActive)
            .AsQueryable();

        if (productId.HasValue)
            productsQuery = productsQuery.Where(p => p.Id == productId.Value);

        var products = await productsQuery.OrderBy(p => p.SKU).ToListAsync();
        var result = new List<StockStatusDto>();

        foreach (var product in products)
        {
            var movementsQuery = _context.StockMovements
                .Include(sm => sm.Warehouse)
                .AsNoTracking()
                .Where(sm => sm.ProductId == product.Id)
                .AsQueryable();

            if (warehouseId.HasValue)
                movementsQuery = movementsQuery.Where(sm => sm.WarehouseId == warehouseId.Value);

            var movements = await movementsQuery.ToListAsync();

            var warehouseStocks = movements
                .GroupBy(sm => sm.WarehouseId)
                .Select(g => new WarehouseStockDto(
                    g.Key,
                    g.First().Warehouse.Code,
                    g.First().Warehouse.Name,
                    g.Sum(sm => sm.MovementType == MovementType.In || sm.MovementType == MovementType.Adjustment
                        ? sm.Quantity
                        : -sm.Quantity)
                ))
                .Where(ws => ws.Quantity != 0)
                .OrderBy(ws => ws.WarehouseCode)
                .ToList();

            result.Add(new StockStatusDto(
                product.Id,
                product.SKU,
                product.Name,
                product.Category.Name,
                product.CurrentStock,
                product.MinStockLevel,
                product.CurrentStock <= product.MinStockLevel,
                warehouseStocks
            ));
        }

        return result;
    }

    public async Task<List<LowStockAlertDto>> GetLowStockAlertsAsync()
    {
        var lowStockProducts = await _context.Products
            .Include(p => p.Category)
            .AsNoTracking()
            .Where(p => p.IsActive && p.CurrentStock <= p.MinStockLevel)
            .OrderBy(p => p.SKU)
            .ToListAsync();

        return lowStockProducts.Select(p => new LowStockAlertDto(
            p.Id,
            p.SKU,
            p.Name,
            p.Category.Name,
            p.CurrentStock,
            p.MinStockLevel,
            p.MinStockLevel - p.CurrentStock
        )).ToList();
    }

    // ═══════════════════════════════════════════
    //  Private Helpers
    // ═══════════════════════════════════════════

    private static WarehouseDto MapToWarehouseDto(Warehouse w) =>
        new(w.Id, w.Code, w.Name, w.Location, w.IsActive, w.CreatedAt);

    private static ProductDto MapToProductDto(Product p) =>
        new(
            p.Id, p.SKU, p.Name, p.Description,
            p.CategoryId, p.Category?.Name ?? string.Empty,
            p.UnitOfMeasure,
            p.PurchasePrice, p.SellingPrice,
            p.CurrentStock, p.MinStockLevel,
            p.CurrentStock <= p.MinStockLevel,
            p.IsActive, p.CreatedAt
        );

    private static StockMovementDto MapToStockMovementDto(StockMovement sm) =>
        new(
            sm.Id,
            sm.ProductId, sm.Product?.SKU ?? string.Empty, sm.Product?.Name ?? string.Empty,
            sm.WarehouseId, sm.Warehouse?.Name ?? string.Empty,
            sm.MovementType, sm.MovementType.ToString(),
            sm.Quantity, sm.UnitCost, sm.TotalCost,
            sm.ReferenceDocument, sm.Notes,
            sm.MovementDate,
            sm.CreatedByUserId, sm.CreatedByUser?.FullName,
            sm.CreatedAt
        );

    private async Task<StockMovementDto?> ReloadStockMovementAsync(Guid id)
    {
        var sm = await _context.StockMovements
            .Include(x => x.Product)
            .Include(x => x.Warehouse)
            .Include(x => x.CreatedByUser)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        return sm == null ? null : MapToStockMovementDto(sm);
    }
}
