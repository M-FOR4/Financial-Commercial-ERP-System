using ERP.Api.Domain.Enums;

namespace ERP.Api.Domain.Entities;

public class SalesReturn
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string ReturnNumber { get; set; } = string.Empty;
    public Guid OriginalInvoiceId { get; set; }
    public SalesInvoice OriginalInvoice { get; set; } = null!;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;
    public DateTime ReturnDate { get; set; } = DateTime.UtcNow;
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public decimal TotalAmount { get; set; } = 0m;
    public string? Notes { get; set; }
    public Guid? JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public Guid? PostedByUserId { get; set; }
    public User? PostedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<SalesReturnLine> Lines { get; set; } = new List<SalesReturnLine>();
}
