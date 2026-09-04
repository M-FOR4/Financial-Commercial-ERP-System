using ERP.Api.Domain.Enums;

namespace ERP.Api.Domain.Entities;

public class JournalEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public Guid FiscalYearId { get; set; }
    public FiscalYear FiscalYear { get; set; } = null!;
    public string EntryNumber { get; set; } = string.Empty;
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public DateTime? PostedAt { get; set; }
    public Guid? PostedByUserId { get; set; }
    public User? PostedByUser { get; set; }
    public string? SourceDocumentType { get; set; }     // e.g. "SalesInvoice"
    public string? SourceDocumentId { get; set; }        // e.g. invoice GUID
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<JournalEntryLine> Lines { get; set; } = new List<JournalEntryLine>();
}
