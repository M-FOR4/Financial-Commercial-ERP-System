using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface IInventoryService
{
    // Categories
    Task<List<CategoryDto>> GetCategoriesAsync(bool? activeOnly = null);
    Task<CategoryDto?> GetCategoryByIdAsync(Guid id);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request);
    Task<CategoryDto?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request);

    // Warehouses
    Task<List<WarehouseDto>> GetWarehousesAsync(bool? activeOnly = null);
    Task<WarehouseDto?> GetWarehouseByIdAsync(Guid id);
    Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseRequest request);
    Task<WarehouseDto?> UpdateWarehouseAsync(Guid id, UpdateWarehouseRequest request);

    // Products
    Task<List<ProductDto>> GetProductsAsync(Guid? categoryId = null, bool? activeOnly = null, string? search = null);
    Task<ProductDto?> GetProductByIdAsync(Guid id);
    Task<ProductDto> CreateProductAsync(CreateProductRequest request, Guid companyId);
    Task<ProductDto?> UpdateProductAsync(Guid id, UpdateProductRequest request);

    // Stock Movements
    Task<List<StockMovementDto>> GetStockMovementsAsync(Guid? productId = null, Guid? warehouseId = null, MovementType? type = null, DateTime? fromDate = null, DateTime? toDate = null);
    Task<StockMovementDto> CreateStockMovementAsync(CreateStockMovementRequest request, Guid? createdByUserId);

    // Stock Status
    Task<List<StockStatusDto>> GetStockStatusAsync(Guid? productId = null, Guid? warehouseId = null);
    Task<List<LowStockAlertDto>> GetLowStockAlertsAsync();
}
