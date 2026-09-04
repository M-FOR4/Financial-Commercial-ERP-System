using ERP.Api.Domain.Enums;

namespace ERP.Api.Domain.Entities;

public class TransferVoucher
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public Guid FromTreasuryId { get; set; }
    public Treasury FromTreasury { get; set; } = null!;
    public Guid ToTreasuryId { get; set; }
    public Treasury ToTreasury { get; set; } = null!;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string? Reference { get; set; }
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public Guid? JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
