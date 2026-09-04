using System.ComponentModel.DataAnnotations;
using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

// ── Supplier DTOs ──

public record SupplierDto(
    Guid Id,
    string Code,
    string Name,
    string? Phone,
    string? Email,
    string? TaxNumber,
    string? Address,
    decimal Balance,
    bool IsActive,
    int InvoiceCount,
    DateTime CreatedAt
);

public record CreateSupplierRequest(
    [Required, MaxLength(50)] string Code,
    [Required, MaxLength(300)] string Name,
    [MaxLength(50)] string? Phone,
    [MaxLength(200)] string? Email,
    [MaxLength(50)] string? TaxNumber,
    [MaxLength(500)] string? Address,
    bool IsActive = true
);

// ── Purchase Invoice DTOs ──

public record PurchaseInvoiceLineRequest(
    [Required] Guid ProductId,
    [Range(0.0001, 999999999999)] decimal Quantity,
    [Range(0, 999999999999)] decimal DirectUnitPrice,
    [MaxLength(300)] string? Notes
);

public record PurchaseInvoiceLineDto(
    Guid Id,
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    decimal Quantity,
    decimal DirectUnitPrice,
    decimal AllocatedAdditionalCost,
    decimal EffectiveUnitCost,
    decimal TotalPrice,
    string? Notes
);

public record CreatePurchaseInvoiceRequest(
    [Required] Guid SupplierId,
    [Required] Guid WarehouseId,
    [Required, MinLength(1)] List<PurchaseInvoiceLineRequest> Lines,
    DateTime? InvoiceDate = null,
    DateTime? DueDate = null,
    [Range(0, 999999999999)] decimal TaxAmount = 0m,
    [Range(0, 999999999999)] decimal AdditionalCosts = 0m,
    [MaxLength(500)] string? Notes = null
);

public record PurchaseInvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid SupplierId,
    string SupplierName,
    string SupplierCode,
    Guid WarehouseId,
    string WarehouseName,
    DateTime InvoiceDate,
    DateTime? DueDate,
    JournalEntryStatus Status,
    string StatusName,
    decimal SubTotal,
    decimal TaxAmount,
    decimal AdditionalCosts,
    decimal TotalAmount,
    string? Notes,
    Guid? JournalEntryId,
    List<PurchaseInvoiceLineDto> Lines,
    DateTime CreatedAt
);

// ── Purchase Return DTOs ──

public record PurchaseReturnLineRequest(
    [Required] Guid OriginalInvoiceLineId,
    [Range(0.0001, 999999999999)] decimal Quantity,
    [MaxLength(300)] string? Notes
);

public record PurchaseReturnLineDto(
    Guid Id,
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    Guid OriginalInvoiceLineId,
    decimal Quantity,
    decimal UnitCost,
    decimal TotalPrice,
    string? Notes
);

public record CreatePurchaseReturnRequest(
    [Required] Guid OriginalInvoiceId,
    [MaxLength(500)] string? Notes,
    [Required, MinLength(1)] List<PurchaseReturnLineRequest> Lines
);

public record PurchaseReturnDto(
    Guid Id,
    string ReturnNumber,
    Guid OriginalInvoiceId,
    string OriginalInvoiceNumber,
    Guid SupplierId,
    string SupplierName,
    Guid WarehouseId,
    string WarehouseName,
    DateTime ReturnDate,
    JournalEntryStatus Status,
    string StatusName,
    decimal TotalAmount,
    string? Notes,
    Guid? JournalEntryId,
    List<PurchaseReturnLineDto> Lines,
    DateTime CreatedAt
);
