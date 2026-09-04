using System.ComponentModel.DataAnnotations;
using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

// ── Customer DTOs ──

public record CustomerDto(
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

public record CreateCustomerRequest(
    [Required, MaxLength(50)] string Code,
    [Required, MaxLength(300)] string Name,
    [MaxLength(50)] string? Phone,
    [MaxLength(200)] string? Email,
    [MaxLength(50)] string? TaxNumber,
    [MaxLength(500)] string? Address,
    bool IsActive = true
);

public record UpdateCustomerRequest(
    [Required, MaxLength(300)] string Name,
    [MaxLength(50)] string? Phone,
    [MaxLength(200)] string? Email,
    [MaxLength(50)] string? TaxNumber,
    [MaxLength(500)] string? Address,
    bool IsActive = true
);

// ── Sales Invoice DTOs ──

public record SalesInvoiceLineRequest(
    [Required] Guid ProductId,
    [Range(0.0001, 999999999999)] decimal Quantity,
    [Range(0, 999999999999)] decimal UnitPrice,
    [MaxLength(300)] string? Notes
);

public record SalesInvoiceLineDto(
    Guid Id,
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal UnitCostAtSale,
    decimal TotalPrice,
    string? Notes
);

public record CreateSalesInvoiceRequest(
    [Required] Guid CustomerId,
    [Required] Guid WarehouseId,
    [Required, MinLength(1)] List<SalesInvoiceLineRequest> Lines,
    DateTime? InvoiceDate = null,
    DateTime? DueDate = null,
    [Range(0, 999999999999)] decimal DiscountAmount = 0m,
    [Range(0, 100)] decimal TaxRate = 0m,
    [MaxLength(500)] string? Notes = null
);

public record SalesInvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid CustomerId,
    string CustomerName,
    string CustomerCode,
    Guid WarehouseId,
    string WarehouseName,
    DateTime InvoiceDate,
    DateTime? DueDate,
    JournalEntryStatus Status,
    string StatusName,
    decimal SubTotal,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    string? Notes,
    Guid? JournalEntryId,
    List<SalesInvoiceLineDto> Lines,
    DateTime CreatedAt
);

// ── Sales Return DTOs ──

public record SalesReturnLineRequest(
    [Required] Guid OriginalInvoiceLineId,
    [Range(0.0001, 999999999999)] decimal Quantity,
    [MaxLength(300)] string? Notes
);

public record SalesReturnLineDto(
    Guid Id,
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    Guid OriginalInvoiceLineId,
    decimal Quantity,
    decimal RestockUnitCost,
    decimal TotalPrice,
    string? Notes
);

public record CreateSalesReturnRequest(
    [Required] Guid OriginalInvoiceId,
    [MaxLength(500)] string? Notes,
    [Required, MinLength(1)] List<SalesReturnLineRequest> Lines
);

public record SalesReturnDto(
    Guid Id,
    string ReturnNumber,
    Guid OriginalInvoiceId,
    string OriginalInvoiceNumber,
    Guid CustomerId,
    string CustomerName,
    Guid WarehouseId,
    string WarehouseName,
    DateTime ReturnDate,
    JournalEntryStatus Status,
    string StatusName,
    decimal TotalAmount,
    string? Notes,
    Guid? JournalEntryId,
    List<SalesReturnLineDto> Lines,
    DateTime CreatedAt
);
