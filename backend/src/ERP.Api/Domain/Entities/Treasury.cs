using ERP.Api.Domain.Enums;

namespace ERP.Api.Domain.Entities;

public class Treasury
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TreasuryType Type { get; set; }
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "LYD";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CashVoucher> CashVouchers { get; set; } = new List<CashVoucher>();
    public ICollection<TransferVoucher> FromTransfers { get; set; } = new List<TransferVoucher>();
    public ICollection<TransferVoucher> ToTransfers { get; set; } = new List<TransferVoucher>();
}
