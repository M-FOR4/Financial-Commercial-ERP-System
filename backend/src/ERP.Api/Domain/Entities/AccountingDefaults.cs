namespace ERP.Api.Domain.Entities;

/// <summary>
/// Configurable default account mappings per company.
/// Replaces hard-coded account code lookups like a.Code == "1130".
/// </summary>
public class AccountingDefaults
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    // Sales accounts
    public Guid? SalesRevenueAccountId { get; set; }
    public Account? SalesRevenueAccount { get; set; }
    public Guid? SalesCashAccountId { get; set; }          // Default treasury for cash sales
    public Account? SalesCashAccount { get; set; }
    public Guid? SalesReturnsAccountId { get; set; }
    public Account? SalesReturnsAccount { get; set; }

    // Purchases accounts
    public Guid? PurchasesAccountId { get; set; }
    public Account? PurchasesAccount { get; set; }

    // Inventory accounts
    public Guid? InventoryAccountId { get; set; }
    public Account? InventoryAccount { get; set; }
    public Guid? CogsAccountId { get; set; }
    public Account? CogsAccount { get; set; }
    public Guid? InventoryGainAccountId { get; set; }
    public Account? InventoryGainAccount { get; set; }
    public Guid? InventoryLossAccountId { get; set; }
    public Account? InventoryLossAccount { get; set; }

    // Receivables / Payables
    public Guid? DefaultCustomerArAccountId { get; set; }
    public Account? DefaultCustomerArAccount { get; set; }
    public Guid? DefaultSupplierApAccountId { get; set; }
    public Account? DefaultSupplierApAccount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
