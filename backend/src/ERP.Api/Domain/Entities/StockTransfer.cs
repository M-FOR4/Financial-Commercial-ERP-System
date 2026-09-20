using ERP.Api.Domain.Enums;

namespace ERP.Api.Domain.Entities;

/// <summary>
/// Stock transfer document: moves inventory from a source warehouse to a destination warehouse.
///
/// Posting creates two linked ledger movements:
///  - Out from SourceWarehouse
///  - In to DestinationWarehouse
///
/// Stock availability is enforced against the source warehouse at post time under the
/// same negative-stock policy as other outbound movements.
/// </summary>
public class StockTransfer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }

    public string TransferNumber { get; set; } = string.Empty;
    public DateTime TransferDate { get; set; } = DateTime.UtcNow;
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public string? Notes { get; set; }

    public Guid SourceWarehouseId { get; set; }
    public Warehouse SourceWarehouse { get; set; } = null!;

    public Guid DestinationWarehouseId { get; set; }
    public Warehouse DestinationWarehouse { get; set; } = null!;

    public Guid? JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }

    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public Guid? PostedByUserId { get; set; }
    public User? PostedByUser { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<StockTransferLine> Lines { get; set; } = new List<StockTransferLine>();
}

public class StockTransferLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StockTransferId { get; set; }
    public StockTransfer StockTransfer { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
