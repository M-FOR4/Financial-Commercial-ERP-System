namespace ERP.Api.Domain.Entities;

public class JournalEntryLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid JournalEntryId { get; set; }
    public JournalEntry JournalEntry { get; set; } = null!;
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public decimal Debit { get; set; } = 0m;
    public decimal Credit { get; set; } = 0m;
    public string? Description { get; set; }
    public Guid? CostCenterId { get; set; }
    public CostCenter? CostCenter { get; set; }
    public Guid? CustomerId { get; set; }     // Optional: customer reference on AR lines
    public Customer? Customer { get; set; }
    public Guid? SupplierId { get; set; }     // Optional: supplier reference on AP lines
    public Supplier? Supplier { get; set; }
}
