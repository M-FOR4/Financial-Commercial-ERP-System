using ERP.Api.Domain.Enums;

namespace ERP.Api.Domain.Entities;

public class AssetCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Default accounts for this asset category
    public int DefaultUsefulLifeYears { get; set; } = 5;

    // Default accounts for this asset category
    public Guid AssetAccountId { get; set; }
    public Account AssetAccount { get; set; } = null!;
    public Guid AccumulatedDepreciationAccountId { get; set; }
    public Account AccumulatedDepreciationAccount { get; set; } = null!;
    public Guid DepreciationExpenseAccountId { get; set; }
    public Account DepreciationExpenseAccount { get; set; } = null!;

    public ICollection<FixedAsset> FixedAssets { get; set; } = new List<FixedAsset>();
}
