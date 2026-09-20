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
    private readonly IAuditService? _auditService;
    private readonly ICodeGeneratorService? _codeGenerator;

    public InventoryService(
        AppDbContext context,
        ILogger<InventoryService> logger,
        IAuditService? auditService = null,
        ICodeGeneratorService? codeGenerator = null)
    {
        _context = context;
        _logger = logger;
        _auditService = auditService;
        _codeGenerator = codeGenerator;
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
        var defaultCompany = await _context.Companies.FirstOrDefaultAsync();
        var companyId = defaultCompany?.Id ?? Guid.Empty;
        return await CreateCategoryAsync(request, companyId);
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request, Guid companyId)
    {
        var code = request.Code.Trim();
        if (await _context.Categories.AnyAsync(c => c.CompanyId == companyId && c.Code == code))
            throw new InvalidOperationException($"A category with code '{code}' already exists for this company.");

        var category = new Category
        {
            CompanyId = companyId,
            Code = code,
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
        var defaultCompany = await _context.Companies.FirstOrDefaultAsync();
        var companyId = defaultCompany?.Id ?? Guid.Empty;
        return await CreateWarehouseAsync(request, companyId);
    }

    public async Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseRequest request, Guid companyId)
    {
        var code = request.Code.Trim();
        if (await _context.Warehouses.AnyAsync(w => w.CompanyId == companyId && w.Code == code))
            throw new InvalidOperationException($"A warehouse with code '{code}' already exists for this company.");

        var warehouse = new Warehouse
        {
            CompanyId = companyId,
            Code = code,
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
            query = query.Where(p => p.SKU.ToLower().Contains(s) || p.Name.ToLower().Contains(s) || (p.Barcode != null && p.Barcode.ToLower().Contains(s)));
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

    public async Task<ProductDto?> LookupProductByCodeAsync(string code, Guid companyId)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        var cleanCode = code.Trim();

        var product = await _context.Products
            .Include(p => p.Category)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CompanyId == companyId && (p.SKU == cleanCode || p.Barcode == cleanCode));

        return product == null ? null : MapToProductDto(product);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, Guid companyId)
    {
        // Auto-generate the SKU when the caller omits it (auto-gen policy).
        var sku = request.SKU?.Trim();
        if (string.IsNullOrEmpty(sku))
        {
            if (_codeGenerator == null)
                throw new InvalidOperationException("SKU is required when the code generator is unavailable.");
            sku = await _codeGenerator.NextProductCodeAsync(companyId);
        }
        else if (await _context.Products.AnyAsync(p => p.CompanyId == companyId && p.SKU == sku))
            throw new InvalidOperationException($"A product with SKU '{sku}' already exists for this company.");

        var barcode = request.Barcode?.Trim();
        if (!string.IsNullOrEmpty(barcode) && await _context.Products.AnyAsync(p => p.CompanyId == companyId && p.Barcode == barcode))
            throw new InvalidOperationException($"A product with Barcode '{barcode}' already exists for this company.");

        var category = await _context.Categories.FindAsync(request.CategoryId);
        if (category == null)
            throw new InvalidOperationException("Specified category does not exist.");

        // Resolve BaseUnitId from UnitOfMeasure string safely
        var unitName = request.UnitOfMeasure?.Trim();
        var baseUnit = await _context.Units.FirstOrDefaultAsync(u =>
            u.Name == unitName || u.Symbol == unitName ||
            (unitName != null && u.Name == unitName.Split(' ').Last()));
        if (baseUnit == null)
        {
            baseUnit = await _context.Units.FirstOrDefaultAsync(u => u.Name == "قطعة")
                ?? await _context.Units.FirstOrDefaultAsync();
        }

        var product = new Product
        {
            CompanyId = companyId,
            SKU = sku,
            Barcode = barcode,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CategoryId = request.CategoryId,
            UnitOfMeasure = request.UnitOfMeasure?.Trim(),
            BaseUnitId = baseUnit?.Id ?? Guid.Empty,
            PurchasePrice = request.PurchasePrice,
            AvgCost = request.PurchasePrice,
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

        var barcode = request.Barcode?.Trim();
        if (!string.IsNullOrEmpty(barcode) && await _context.Products.AnyAsync(p => p.CompanyId == product.CompanyId && p.Id != id && p.Barcode == barcode))
            throw new InvalidOperationException($"A product with Barcode '{barcode}' already exists for this company.");

        product.Name = request.Name.Trim();
        product.Description = request.Description?.Trim();
        product.CategoryId = request.CategoryId;
        product.UnitOfMeasure = request.UnitOfMeasure.Trim();
        product.Barcode = barcode;
        product.PurchasePrice = request.PurchasePrice;
        product.SellingPrice = request.SellingPrice;
        product.MinStockLevel = request.MinStockLevel;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

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
        fromDate = fromDate.ToUtc();
        toDate = toDate.ToUtc();

        var query = _context.StockMovements
            .Include(sm => sm.Product)
            .Include(sm => sm.Warehouse)
            .Include(sm => sm.DestinationWarehouse)
            .Include(sm => sm.CreatedByUser)
            .AsNoTracking()
            .AsQueryable();

        if (productId.HasValue)
            query = query.Where(sm => sm.ProductId == productId.Value);

        if (warehouseId.HasValue)
            query = query.Where(sm => sm.WarehouseId == warehouseId.Value || sm.DestinationWarehouseId == warehouseId.Value);

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
        var companyId = product?.CompanyId ?? Guid.Empty;
        return await CreateStockMovementAsync(request, createdByUserId, companyId);
    }

    public async Task<StockMovementDto> CreateStockMovementAsync(CreateStockMovementRequest request, Guid? createdByUserId, Guid companyId)
    {
        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null)
            throw new InvalidOperationException("Specified product does not exist.");

        if (companyId == Guid.Empty)
            companyId = product.CompanyId;

        var warehouse = await _context.Warehouses.FindAsync(request.WarehouseId);
        if (warehouse == null)
            throw new InvalidOperationException("Specified warehouse does not exist.");

        if (!warehouse.IsActive)
            throw new InvalidOperationException($"Warehouse '{warehouse.Name}' is not active.");

        // Enforce central stock policy check for outbound / negative adjustment actions
        if (request.MovementType is MovementType.Out or MovementType.TransferOut ||
            (request.MovementType == MovementType.Adjustment && request.Quantity < 0))
        {
            var reqQty = Math.Abs(request.Quantity);
            await StockPolicyService.ValidateStockAvailabilityAsync(
                _context, companyId, product.Id, warehouse.Id, reqQty,
                $"Manual stock movement ({request.MovementType})");
        }

        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            decimal previousStock = product.CurrentStock;
            decimal previousAvgCost = product.AvgCost;

            // Recalculate stock and Weighted Average Cost
            if (request.MovementType == MovementType.In)
            {
                var newTotalQty = product.CurrentStock + request.Quantity;
                if (newTotalQty > 0m)
                {
                    product.AvgCost = JournalBuilder.Round(
                        ((product.CurrentStock * product.AvgCost) + (request.Quantity * request.UnitCost)) / newTotalQty);
                }
                product.CurrentStock += request.Quantity;
                product.PurchasePrice = request.UnitCost;
            }
            else if (request.MovementType == MovementType.Out)
            {
                product.CurrentStock -= request.Quantity;
            }
            else if (request.MovementType == MovementType.Adjustment)
            {
                if (request.Quantity >= 0m)
                {
                    var newTotalQty = product.CurrentStock + request.Quantity;
                    if (newTotalQty > 0m)
                    {
                        product.AvgCost = JournalBuilder.Round(
                            ((product.CurrentStock * product.AvgCost) + (request.Quantity * request.UnitCost)) / newTotalQty);
                    }
                    product.CurrentStock += request.Quantity;
                }
                else
                {
                    product.CurrentStock -= Math.Abs(request.Quantity);
                }
            }

            product.UpdatedAt = DateTime.UtcNow;

            var movement = new StockMovement
            {
                CompanyId = companyId,
                ProductId = request.ProductId,
                WarehouseId = request.WarehouseId,
                MovementType = request.MovementType,
                Quantity = Math.Abs(request.Quantity),
                UnitCost = request.UnitCost > 0m ? request.UnitCost : product.AvgCost,
                ReferenceDocument = request.ReferenceDocument?.Trim(),
                Notes = request.Notes?.Trim(),
                MovementDate = request.MovementDate.ToUtc() ?? DateTime.UtcNow,
                CreatedByUserId = createdByUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.StockMovements.Add(movement);

            // Generate balancing Journal Entry for manual stock movements
            var (invAcc, gainAcc, lossAcc) = await AccountResolutionHelper.ResolveInventoryAdjustmentAccountsAsync(_context, companyId);
            var jeCount = await _context.JournalEntries.CountAsync(j => j.CompanyId == companyId);
            var fiscalYear = await _context.FiscalYears.FirstOrDefaultAsync(fy => fy.CompanyId == companyId && fy.IsActive);

            if (fiscalYear != null)
            {
                var je = new JournalEntry
                {
                    CompanyId = companyId,
                    FiscalYearId = fiscalYear.Id,
                    EntryNumber = $"JE-INV-{DateTime.UtcNow:yyyyMM}-{jeCount + 1:D4}",
                    EntryDate = movement.MovementDate,
                    Description = $"Manual Stock Movement ({movement.MovementType}) — {product.Name}",
                    Status = JournalEntryStatus.Posted,
                    PostedAt = DateTime.UtcNow,
                    PostedByUserId = createdByUserId,
                    SourceDocumentType = "StockMovement",
                    SourceDocumentId = movement.Id.ToString(),
                    CreatedAt = DateTime.UtcNow
                };

                var movementTotal = movement.TotalCost;
                if (movement.MovementType == MovementType.In || (movement.MovementType == MovementType.Adjustment && request.Quantity >= 0m))
                {
                    // Inward adjustment: Debit Inventory, Credit Gain Account
                    je.Lines.Add(new JournalEntryLine { AccountId = invAcc.Id, Debit = movementTotal, Credit = 0m, Description = $"Inventory Gain — {product.Name}" });
                    je.Lines.Add(new JournalEntryLine { AccountId = gainAcc.Id, Debit = 0m, Credit = movementTotal, Description = $"Inventory Adjustment Gain — {product.Name}" });
                }
                else if (movement.MovementType == MovementType.Out || (movement.MovementType == MovementType.Adjustment && request.Quantity < 0m))
                {
                    // Outward adjustment: Debit Loss Account, Credit Inventory
                    je.Lines.Add(new JournalEntryLine { AccountId = lossAcc.Id, Debit = movementTotal, Credit = 0m, Description = $"Inventory Adjustment Loss — {product.Name}" });
                    je.Lines.Add(new JournalEntryLine { AccountId = invAcc.Id, Debit = 0m, Credit = movementTotal, Description = $"Inventory Loss — {product.Name}" });
                }

                if (je.Lines.Count > 0)
                {
                    je.Lines.ToList().NormalizeAndBalance();
                    _context.JournalEntries.Add(je);
                    await _context.SaveChangesAsync();

                    foreach (var line in je.Lines)
                    {
                        line.ApplyPostingToAccountBalance(_context);
                    }
                }
            }

            await _context.SaveChangesAsync();

            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            // Record audit trail via IAuditService
            if (_auditService != null)
            {
                await _auditService.LogAsync(
                    createdByUserId,
                    "StockMovement.Create",
                    "StockMovement",
                    movement.Id.ToString(),
                    $"Stock movement {request.MovementType}: {request.Quantity} of product {product.SKU}. Stock change: {previousStock} -> {product.CurrentStock}. AvgCost: {previousAvgCost} -> {product.AvgCost}");
            }

            _logger.LogInformation("Stock movement created: {Type} {Qty} × {Product} in {Warehouse}",
                request.MovementType, request.Quantity, product.SKU, warehouse.Name);

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
    //  Stock Transfers
    // ═══════════════════════════════════════════

    public async Task<StockTransferDto> CreateStockTransferDraftAsync(CreateStockTransferRequest request, Guid companyId, Guid userId)
    {
        if (request.SourceWarehouseId == request.DestinationWarehouseId)
            throw new InvalidOperationException("Source and Destination warehouses must be different.");

        var sourceWh = await _context.Warehouses.FindAsync(request.SourceWarehouseId);
        if (sourceWh == null || !sourceWh.IsActive)
            throw new InvalidOperationException("Source warehouse is invalid or inactive.");

        var destWh = await _context.Warehouses.FindAsync(request.DestinationWarehouseId);
        if (destWh == null || !destWh.IsActive)
            throw new InvalidOperationException("Destination warehouse is invalid or inactive.");

        var count = await _context.StockTransfers.CountAsync(st => st.CompanyId == companyId);
        var transferNumber = $"ST-{DateTime.UtcNow:yyyyMM}-{count + 1:D4}";

        var transfer = new StockTransfer
        {
            CompanyId = companyId,
            TransferNumber = transferNumber,
            SourceWarehouseId = request.SourceWarehouseId,
            DestinationWarehouseId = request.DestinationWarehouseId,
            TransferDate = request.TransferDate.ToUtc() ?? DateTime.UtcNow,
            Status = JournalEntryStatus.Draft,
            Notes = request.Notes?.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var lineReq in request.Lines)
        {
            var product = await _context.Products.FindAsync(lineReq.ProductId);
            if (product == null)
                throw new InvalidOperationException($"Product with ID '{lineReq.ProductId}' does not exist.");

            transfer.Lines.Add(new StockTransferLine
            {
                ProductId = lineReq.ProductId,
                Quantity = lineReq.Quantity,
                UnitCost = lineReq.UnitCost > 0m ? lineReq.UnitCost : product.AvgCost,
                Notes = lineReq.Notes?.Trim(),
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.StockTransfers.Add(transfer);
        await _context.SaveChangesAsync();

        return (await GetStockTransferByIdAsync(transfer.Id))!;
    }

    public async Task<StockTransferDto> PostStockTransferAsync(Guid transferId, Guid userId)
    {
        var transfer = await _context.StockTransfers
            .Include(st => st.Lines)
            .ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(st => st.Id == transferId);

        if (transfer == null)
            throw new InvalidOperationException("Stock transfer document not found.");

        if (transfer.Status == JournalEntryStatus.Posted)
            throw new InvalidOperationException("Stock transfer has already been posted.");

        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            // 1. Validate source stock availability for all lines
            foreach (var line in transfer.Lines)
            {
                await StockPolicyService.ValidateStockAvailabilityAsync(
                    _context, transfer.CompanyId, line.ProductId, transfer.SourceWarehouseId, line.Quantity,
                    $"Stock Transfer {transfer.TransferNumber}");
            }

            // 2. Create atomic linked outbound and inbound movements per line
            foreach (var line in transfer.Lines)
            {
                // Outbound movement from source warehouse
                var outMovement = new StockMovement
                {
                    CompanyId = transfer.CompanyId,
                    ProductId = line.ProductId,
                    WarehouseId = transfer.SourceWarehouseId,
                    DestinationWarehouseId = transfer.DestinationWarehouseId,
                    MovementType = MovementType.TransferOut,
                    Quantity = line.Quantity,
                    UnitCost = line.UnitCost,
                    ReferenceDocument = transfer.TransferNumber,
                    Notes = $"Transfer Out -> Dest WH ({transfer.DestinationWarehouseId})",
                    MovementDate = transfer.TransferDate,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StockMovements.Add(outMovement);
                await _context.SaveChangesAsync();

                // Inbound movement into destination warehouse linked by SourceMovementId
                var inMovement = new StockMovement
                {
                    CompanyId = transfer.CompanyId,
                    ProductId = line.ProductId,
                    WarehouseId = transfer.DestinationWarehouseId,
                    DestinationWarehouseId = transfer.SourceWarehouseId,
                    SourceMovementId = outMovement.Id,
                    MovementType = MovementType.TransferIn,
                    Quantity = line.Quantity,
                    UnitCost = line.UnitCost,
                    ReferenceDocument = transfer.TransferNumber,
                    Notes = $"Transfer In <- Source WH ({transfer.SourceWarehouseId})",
                    MovementDate = transfer.TransferDate,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StockMovements.Add(inMovement);
            }

            transfer.Status = JournalEntryStatus.Posted;
            transfer.PostedByUserId = userId;
            transfer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (transaction != null)
                await transaction.CommitAsync();

            if (_auditService != null)
            {
                await _auditService.LogAsync(
                    userId,
                    "StockTransfer.Post",
                    "StockTransfer",
                    transfer.Id.ToString(),
                    $"Posted Stock Transfer {transfer.TransferNumber} from WH {transfer.SourceWarehouseId} to WH {transfer.DestinationWarehouseId}. Lines count: {transfer.Lines.Count}");
            }

            return (await GetStockTransferByIdAsync(transfer.Id))!;
        }
        catch
        {
            if (transaction != null)
                await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<StockTransferDto>> GetStockTransfersAsync(Guid companyId)
    {
        var transfers = await _context.StockTransfers
            .Include(st => st.SourceWarehouse)
            .Include(st => st.DestinationWarehouse)
            .Include(st => st.JournalEntry)
            .Include(st => st.Lines)
            .ThenInclude(l => l.Product)
            .AsNoTracking()
            .Where(st => st.CompanyId == companyId)
            .OrderByDescending(st => st.TransferDate)
            .ToListAsync();

        return transfers.Select(MapToStockTransferDto).ToList();
    }

    public async Task<StockTransferDto?> GetStockTransferByIdAsync(Guid id)
    {
        var st = await _context.StockTransfers
            .Include(x => x.SourceWarehouse)
            .Include(x => x.DestinationWarehouse)
            .Include(x => x.JournalEntry)
            .Include(x => x.Lines)
            .ThenInclude(l => l.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        return st == null ? null : MapToStockTransferDto(st);
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
                .Select(g =>
                {
                    var inQty = g.Where(sm => sm.MovementType == MovementType.In || sm.MovementType == MovementType.TransferIn || (sm.MovementType == MovementType.Adjustment && sm.Quantity >= 0m)).Sum(sm => Math.Abs(sm.Quantity));
                    var outQty = g.Where(sm => sm.MovementType == MovementType.Out || sm.MovementType == MovementType.TransferOut || sm.MovementType == MovementType.Transfer || (sm.MovementType == MovementType.Adjustment && sm.Quantity < 0m)).Sum(sm => Math.Abs(sm.Quantity));
                    return new WarehouseStockDto(
                        g.Key,
                        g.First().Warehouse.Code,
                        g.First().Warehouse.Name,
                        inQty - outQty
                    );
                })
                .Where(ws => ws.Quantity != 0m)
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
    //  Private Mapping Helpers
    // ═══════════════════════════════════════════

    private static WarehouseDto MapToWarehouseDto(Warehouse w) =>
        new(w.Id, w.Code, w.Name, w.Location, w.IsActive, w.CreatedAt);

    private static ProductDto MapToProductDto(Product p) =>
        new(
            p.Id, p.SKU, p.Barcode, p.Name, p.Description,
            p.CategoryId, p.Category?.Name ?? string.Empty,
            p.UnitOfMeasure ?? "Piece",
            p.PurchasePrice, p.AvgCost, p.SellingPrice,
            p.CurrentStock, p.MinStockLevel,
            p.CurrentStock <= p.MinStockLevel,
            p.IsActive, p.CreatedAt
        );

    private static StockMovementDto MapToStockMovementDto(StockMovement sm) =>
        new(
            sm.Id,
            sm.ProductId, sm.Product?.SKU ?? string.Empty, sm.Product?.Name ?? string.Empty,
            sm.WarehouseId, sm.Warehouse?.Name ?? string.Empty,
            sm.DestinationWarehouseId, sm.DestinationWarehouse?.Name,
            sm.SourceMovementId,
            sm.MovementType, sm.MovementType.ToString(),
            sm.Quantity, sm.UnitCost, sm.TotalCost,
            sm.ReferenceDocument, sm.Notes,
            sm.MovementDate,
            sm.CreatedByUserId, sm.CreatedByUser?.FullName,
            sm.CreatedAt
        );

    private static StockTransferDto MapToStockTransferDto(StockTransfer st) =>
        new(
            st.Id,
            st.TransferNumber,
            st.SourceWarehouseId, st.SourceWarehouse?.Name ?? string.Empty,
            st.DestinationWarehouseId, st.DestinationWarehouse?.Name ?? string.Empty,
            st.TransferDate,
            st.Status, st.Status.ToString(),
            st.Lines.Sum(l => l.Quantity),
            st.Notes,
            st.JournalEntryId, st.JournalEntry?.EntryNumber,
            st.Lines.Select(l => new StockTransferLineDto(
                l.Id, l.ProductId, l.Product?.SKU ?? string.Empty, l.Product?.Name ?? string.Empty,
                l.Quantity, l.UnitCost, l.Notes
            )).ToList(),
            st.CreatedAt
        );

    private async Task<StockMovementDto?> ReloadStockMovementAsync(Guid id)
    {
        var sm = await _context.StockMovements
            .Include(x => x.Product)
            .Include(x => x.Warehouse)
            .Include(x => x.DestinationWarehouse)
            .Include(x => x.CreatedByUser)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        return sm == null ? null : MapToStockMovementDto(sm);
    }
}
