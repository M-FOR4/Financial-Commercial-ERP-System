using System.ComponentModel.DataAnnotations;
using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

// ── Category DTOs ──

public record CategoryDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    bool IsActive,
    int ProductCount,
    DateTime CreatedAt
);

public record CreateCategoryRequest(
    [Required, MaxLength(50)] string Code,
    [Required, MaxLength(200)] string Name,
    [MaxLength(500)] string? Description,
    bool IsActive = true
);

public record UpdateCategoryRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(500)] string? Description,
    bool IsActive = true
);

// ── Warehouse DTOs ──

public record WarehouseDto(
    Guid Id,
    string Code,
    string Name,
    string? Location,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateWarehouseRequest(
    [Required, MaxLength(50)] string Code,
    [Required, MaxLength(200)] string Name,
    [MaxLength(500)] string? Location,
    bool IsActive = true
);

public record UpdateWarehouseRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(500)] string? Location,
    bool IsActive = true
);

// ── Product DTOs ──

public record ProductDto(
    Guid Id,
    string SKU,
    string Name,
    string? Description,
    Guid CategoryId,
    string CategoryName,
    string UnitOfMeasure,
    decimal PurchasePrice,
    decimal SellingPrice,
    decimal CurrentStock,
    decimal MinStockLevel,
    bool IsLowStock,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateProductRequest(
    [Required, MaxLength(100)] string SKU,
    [Required, MaxLength(300)] string Name,
    [MaxLength(1000)] string? Description,
    [Required] Guid CategoryId,
    [Required, MaxLength(50)] string UnitOfMeasure,
    [Range(0, 999999999999)] decimal PurchasePrice = 0m,
    [Range(0, 999999999999)] decimal SellingPrice = 0m,
    [Range(0, 999999999999)] decimal MinStockLevel = 0m,
    bool IsActive = true
);

public record UpdateProductRequest(
    [Required, MaxLength(300)] string Name,
    [MaxLength(1000)] string? Description,
    [Required] Guid CategoryId,
    [Required, MaxLength(50)] string UnitOfMeasure,
    [Range(0, 999999999999)] decimal PurchasePrice = 0m,
    [Range(0, 999999999999)] decimal SellingPrice = 0m,
    [Range(0, 999999999999)] decimal MinStockLevel = 0m,
    bool IsActive = true
);

// ── Stock Movement DTOs ──

public record StockMovementDto(
    Guid Id,
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    Guid WarehouseId,
    string WarehouseName,
    MovementType MovementType,
    string MovementTypeName,
    decimal Quantity,
    decimal UnitCost,
    decimal TotalCost,
    string? ReferenceDocument,
    string? Notes,
    DateTime MovementDate,
    Guid? CreatedByUserId,
    string? CreatedByUserName,
    DateTime CreatedAt
);

public record CreateStockMovementRequest(
    [Required] Guid ProductId,
    [Required] Guid WarehouseId,
    [Required] MovementType MovementType,
    [Range(0.0001, 999999999999)] decimal Quantity,
    [Range(0, 999999999999)] decimal UnitCost,
    [MaxLength(200)] string? ReferenceDocument,
    [MaxLength(500)] string? Notes,
    DateTime? MovementDate
);

// ── Stock Status DTOs ──

public record StockStatusDto(
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    string CategoryName,
    decimal TotalStock,
    decimal MinStockLevel,
    bool IsLowStock,
    List<WarehouseStockDto> WarehouseStocks
);

public record WarehouseStockDto(
    Guid WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    decimal Quantity
);

public record LowStockAlertDto(
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    string CategoryName,
    decimal CurrentStock,
    decimal MinStockLevel,
    decimal Deficit
);
