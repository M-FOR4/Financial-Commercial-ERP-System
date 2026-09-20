using System.ComponentModel.DataAnnotations;
using ERP.Api.Domain.Enums;

namespace ERP.Api.DTOs;

public record StockTransferLineDto(
    Guid Id,
    Guid ProductId,
    string ProductSKU,
    string ProductName,
    decimal Quantity,
    decimal UnitCost,
    string? Notes
);

public record StockTransferDto(
    Guid Id,
    string TransferNumber,
    Guid SourceWarehouseId,
    string SourceWarehouseName,
    Guid DestinationWarehouseId,
    string DestinationWarehouseName,
    DateTime TransferDate,
    JournalEntryStatus Status,
    string StatusName,
    decimal TotalQuantity,
    string? Notes,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    List<StockTransferLineDto> Lines,
    DateTime CreatedAt
);

public record CreateStockTransferRequest(
    [Required] Guid SourceWarehouseId,
    [Required] Guid DestinationWarehouseId,
    [Required, MinLength(1)] List<StockTransferLineRequest> Lines,
    DateTime? TransferDate = null,
    [MaxLength(500)] string? Notes = null
);

public record StockTransferLineRequest(
    [Required] Guid ProductId,
    [Range(0.0001, 999999999999)] decimal Quantity,
    [Range(0, 999999999999)] decimal UnitCost,
    [MaxLength(300)] string? Notes = null
);
