namespace ERP.Api.Domain.Entities;

public class DepreciationEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AssetId { get; set; }
    public FixedAsset Asset { get; set; } = null!;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public decimal DepreciationAmount { get; set; }
    public decimal BookValueAfter { get; set; }
    public Guid? JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }
    public DateTime ProcessDate { get; set; } = DateTime.UtcNow;
    public DateTime PeriodStartDate { get; set; }
    public DateTime PeriodEndDate { get; set; }
    public bool IsPosted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
