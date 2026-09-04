using ERP.Api.Domain.Enums;

namespace ERP.Api.Domain.Entities;

public class CashVoucher
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public VoucherType VoucherType { get; set; }    // Receipt or Payment
    public PartyType PartyType { get; set; }        // Customer, Supplier, or Account
    public decimal Amount { get; set; }
    public Guid TreasuryId { get; set; }
    public Treasury Treasury { get; set; } = null!;
    public Guid TargetAccountId { get; set; }
    public Account TargetAccount { get; set; } = null!;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public Guid? PartyId { get; set; }
    public string? Description { get; set; }
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public Guid? JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
