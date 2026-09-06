namespace ERP.Api.Common.Authorization;

/// <summary>
/// Default permission sets for each built-in role.
///
/// Roles are ONLY UI presets: selecting a role pre-checks its permission set in the
/// admin form, but the STORED permissions (permissions_json) are the ground truth for
/// authorization on both backend and frontend. These presets exist so that API clients
/// that create a user with a role but without an explicit permission list still get a
/// sensible default instead of a locked-out account.
///
/// Permission names follow the canonical "{Module}.{Category}.{Action}" scheme seeded
/// in DataSeeder (e.g. "Sales.Invoice.View") — the SAME names enforced by
/// [HasPermission(...)] attributes, route guards and the sidebar.
/// </summary>
public static class RolePresets
{
    /// <summary>All permissions available in the system (used by the Admin role).</summary>
    public static readonly IReadOnlyList<string> All = new[]
    {
        // Sales
        "Sales.Invoice.View", "Sales.Invoice.Add", "Sales.Invoice.Edit", "Sales.Invoice.Delete",
        "Sales.Invoice.Cancel", "Sales.Invoice.Approve", "Sales.Invoice.Print",
        "Sales.Invoice.ViewCost", "Sales.Invoice.ViewProfit", "Sales.Invoice.ChangeAccount",
        "Sales.Invoice.AddCustomerFromInvoice", "Sales.Invoice.EditCustomerFromInvoice",
        "Sales.Invoice.AddPaymentFromInvoice", "Sales.Invoice.ViewOptions",
        "Sales.Return.View", "Sales.Return.Add", "Sales.Return.Edit", "Sales.Return.Delete",
        "Sales.Return.Cancel", "Sales.Return.Approve", "Sales.Return.Print",
        "Sales.Return.ViewCost", "Sales.Return.ViewProfit",
        "Sales.PriceList.View", "Sales.PriceList.Add", "Sales.PriceList.Edit", "Sales.PriceList.Delete", "Sales.PriceList.Approve",
        "Sales.Discount.View", "Sales.Discount.Add", "Sales.Discount.Edit", "Sales.Discount.Approve", "Sales.Discount.Override",
        // Customers
        "Customer.Customer.View", "Customer.Customer.Add", "Customer.Customer.Edit", "Customer.Customer.Delete",
        "Customer.Customer.ViewBalance", "Customer.Customer.ViewStatement", "Customer.Customer.PrintStatement",
        "Customer.Customer.ViewAging", "Customer.Customer.AddPayment", "Customer.Customer.EditPayment",
        "Customer.Customer.CancelPayment", "Customer.Customer.ViewBankingInformation",
        // Purchase
        "Purchase.Invoice.View", "Purchase.Invoice.Add", "Purchase.Invoice.Edit", "Purchase.Invoice.Delete",
        "Purchase.Invoice.Cancel", "Purchase.Invoice.Approve", "Purchase.Invoice.Print",
        "Purchase.Invoice.ViewCost", "Purchase.Invoice.EditCost", "Purchase.Invoice.ViewOptions",
        "Purchase.Return.View", "Purchase.Return.Add", "Purchase.Return.Edit", "Purchase.Return.Delete",
        "Purchase.Return.Cancel", "Purchase.Return.Approve", "Purchase.Return.Print",
        "Purchase.AdditionalCost.View", "Purchase.AdditionalCost.Add", "Purchase.AdditionalCost.Edit",
        "Purchase.AdditionalCost.Delete", "Purchase.AdditionalCost.Approve",
        // Suppliers
        "Supplier.Supplier.View", "Supplier.Supplier.Add", "Supplier.Supplier.Edit", "Supplier.Supplier.Delete",
        "Supplier.Supplier.ViewBalance", "Supplier.Supplier.ViewStatement", "Supplier.Supplier.PrintStatement",
        "Supplier.Supplier.ViewAging", "Supplier.Supplier.AddPayment", "Supplier.Supplier.EditPayment",
        "Supplier.Supplier.CancelPayment", "Supplier.Supplier.ViewBankingInformation",
        // Inventory
        "Inventory.Item.View", "Inventory.Item.Add", "Inventory.Item.Edit", "Inventory.Item.Delete",
        "Inventory.Item.ViewCost", "Inventory.Item.EditCost", "Inventory.Item.ViewPrices", "Inventory.Item.EditPrices",
        "Inventory.Category.View", "Inventory.Category.Add", "Inventory.Category.Edit", "Inventory.Category.Delete",
        "Inventory.Unit.View", "Inventory.Unit.Add", "Inventory.Unit.Edit", "Inventory.Unit.Delete", "Inventory.Unit.ManageItemUnitConversion",
        "Inventory.Warehouse.View", "Inventory.Warehouse.Add", "Inventory.Warehouse.Edit", "Inventory.Warehouse.Delete",
        "Inventory.Movement.View", "Inventory.Movement.ViewItemMovement", "Inventory.Movement.ViewWarehouseBalance",
        "Inventory.Movement.ViewCost", "Inventory.Movement.ViewValuation",
        "Inventory.WarehouseReceipt.View", "Inventory.WarehouseReceipt.Add", "Inventory.WarehouseReceipt.Edit",
        "Inventory.WarehouseReceipt.Delete", "Inventory.WarehouseReceipt.Cancel", "Inventory.WarehouseReceipt.Approve", "Inventory.WarehouseReceipt.Print",
        "Inventory.WarehouseIssue.View", "Inventory.WarehouseIssue.Add", "Inventory.WarehouseIssue.Edit",
        "Inventory.WarehouseIssue.Delete", "Inventory.WarehouseIssue.Cancel", "Inventory.WarehouseIssue.Approve", "Inventory.WarehouseIssue.Print",
        "Inventory.WarehouseTransfer.View", "Inventory.WarehouseTransfer.Add", "Inventory.WarehouseTransfer.Edit",
        "Inventory.WarehouseTransfer.Delete", "Inventory.WarehouseTransfer.Cancel", "Inventory.WarehouseTransfer.Approve", "Inventory.WarehouseTransfer.Print",
        "Inventory.StockCount.View", "Inventory.StockCount.Add", "Inventory.StockCount.Edit", "Inventory.StockCount.Delete", "Inventory.StockCount.Approve",
        "Inventory.StockAdjustment.View", "Inventory.StockAdjustment.Add", "Inventory.StockAdjustment.Approve", "Inventory.StockAdjustment.ViewCost",
        // Accounting
        "Accounting.Account.View", "Accounting.Account.Add", "Accounting.Account.Edit", "Accounting.Account.Delete",
        "Accounting.Account.Activate", "Accounting.Account.Deactivate",
        "Accounting.JournalEntry.View", "Accounting.JournalEntry.Add", "Accounting.JournalEntry.Edit", "Accounting.JournalEntry.Delete",
        "Accounting.JournalEntry.Cancel", "Accounting.JournalEntry.Approve", "Accounting.JournalEntry.Print",
        "Accounting.GeneralLedger.View", "Accounting.GeneralLedger.ViewAccountStatement", "Accounting.GeneralLedger.Print",
        "Accounting.TrialBalance.View", "Accounting.TrialBalance.Print",
        "Accounting.Closing.ViewStatus", "Accounting.Closing.Start", "Accounting.Closing.Approve", "Accounting.Closing.ReopenFiscalYear",
        // Cash & Bank
        "Cash.Receipt.View", "Cash.Receipt.Add", "Cash.Receipt.Edit", "Cash.Receipt.Delete",
        "Cash.Receipt.Cancel", "Cash.Receipt.Approve", "Cash.Receipt.Print",
        "Cash.Payment.View", "Cash.Payment.Add", "Cash.Payment.Edit", "Cash.Payment.Delete",
        "Cash.Payment.Cancel", "Cash.Payment.Approve", "Cash.Payment.Print",
        "Cash.CashAccount.View", "Cash.CashAccount.Add", "Cash.CashAccount.Edit", "Cash.CashAccount.Delete",
        "Cash.CashAccount.ViewBalance", "Cash.CashAccount.ViewTransactions",
        "Cash.BankAccount.View", "Cash.BankAccount.Add", "Cash.BankAccount.Edit", "Cash.BankAccount.Delete",
        "Cash.BankAccount.ViewBalance", "Cash.BankAccount.ViewTransactions",
        "Cash.Transfer.View", "Cash.Transfer.Add", "Cash.Transfer.Edit", "Cash.Transfer.Delete",
        "Cash.Transfer.Cancel", "Cash.Transfer.Approve",
        // Fixed Assets
        "FixedAsset.FixedAsset.View", "FixedAsset.FixedAsset.Add", "FixedAsset.FixedAsset.Edit", "FixedAsset.FixedAsset.Delete",
        "FixedAsset.FixedAsset.ApproveAcquisition", "FixedAsset.FixedAsset.CalculateDepreciation",
        "FixedAsset.FixedAsset.ApproveDepreciation", "FixedAsset.FixedAsset.Transfer", "FixedAsset.FixedAsset.Improve",
        "FixedAsset.FixedAsset.Sell", "FixedAsset.FixedAsset.Dispose", "FixedAsset.FixedAsset.ViewCost",
        "FixedAsset.FixedAsset.ViewBookValue", "FixedAsset.FixedAsset.PrintReport",
        // Cost Centers
        "CostCenter.CostCenter.View", "CostCenter.CostCenter.Add", "CostCenter.CostCenter.Edit", "CostCenter.CostCenter.Delete",
        "CostCenter.CostCenter.Assign", "CostCenter.CostCenter.ViewReports",
        // Reports
        "Reports.Reports.ViewSalesReports", "Reports.Reports.ViewPurchaseReports", "Reports.Reports.ViewInventoryReports",
        "Reports.Reports.ViewCustomerReports", "Reports.Reports.ViewSupplierReports", "Reports.Reports.ViewCashReports",
        "Reports.Reports.ViewBankReports", "Reports.Reports.ViewAccountingReports", "Reports.Reports.ViewFixedAssetReports",
        "Reports.Reports.ViewCostCenterReports", "Reports.Reports.ViewProfitReports", "Reports.Reports.ViewCostReports",
        "Reports.Reports.ViewAgingReports", "Reports.Reports.PrintReports", "Reports.Reports.ExportReports",
        // Administration
        "Admin.Company.View", "Admin.Company.Add", "Admin.Company.Edit", "Admin.Company.Delete",
        "Admin.Branch.View", "Admin.Branch.Add", "Admin.Branch.Edit", "Admin.Branch.Delete",
        "Admin.FiscalYear.View", "Admin.FiscalYear.Add", "Admin.FiscalYear.Edit", "Admin.FiscalYear.Close", "Admin.FiscalYear.Reopen",
        "Admin.User.View", "Admin.User.Add", "Admin.User.Edit", "Admin.User.Delete",
        "Admin.User.Activate", "Admin.User.Deactivate", "Admin.User.ResetCredentials",
        "Admin.Role.View", "Admin.Role.Add", "Admin.Role.Edit", "Admin.Role.Delete", "Admin.Role.Assign",
        "Admin.Permission.ViewMatrix", "Admin.Permission.ModifyRolePermissions", "Admin.Permission.AssignUserPermissions",
    };

    public static readonly IReadOnlyList<string> Accountant = new[]
    {
        "Accounting.Account.View", "Accounting.Account.Add", "Accounting.Account.Edit",
        "Accounting.JournalEntry.View", "Accounting.JournalEntry.Add", "Accounting.JournalEntry.Edit", "Accounting.JournalEntry.Approve",
        "Accounting.GeneralLedger.View", "Accounting.GeneralLedger.ViewAccountStatement",
        "Accounting.TrialBalance.View",
        "Cash.CashAccount.View", "Cash.CashAccount.ViewBalance",
        "Cash.Receipt.View", "Cash.Receipt.Add",
        "Cash.Payment.View", "Cash.Payment.Add",
        "Cash.Transfer.View", "Cash.Transfer.Add",
        "FixedAsset.FixedAsset.View",
        "Reports.Reports.ViewAccountingReports", "Reports.Reports.ViewSalesReports", "Reports.Reports.ViewCashReports",
        "Reports.Reports.ExportReports",
    };

    public static readonly IReadOnlyList<string> SalesManager = new[]
    {
        "Sales.Invoice.View", "Sales.Invoice.Add", "Sales.Invoice.Edit", "Sales.Invoice.Delete",
        "Sales.Invoice.Cancel", "Sales.Invoice.Approve", "Sales.Invoice.Print", "Sales.Invoice.ViewProfit",
        "Sales.Return.View", "Sales.Return.Add", "Sales.Return.Edit", "Sales.Return.Cancel", "Sales.Return.Approve", "Sales.Return.Print",
        "Sales.PriceList.View", "Sales.PriceList.Add", "Sales.PriceList.Edit",
        "Sales.Discount.View", "Sales.Discount.Add", "Sales.Discount.Edit",
        "Customer.Customer.View", "Customer.Customer.Add", "Customer.Customer.Edit",
        "Reports.Reports.ViewSalesReports", "Reports.Reports.ViewCustomerReports", "Reports.Reports.ExportReports",
    };

    public static readonly IReadOnlyList<string> InventoryManager = new[]
    {
        "Purchase.Invoice.View",
        "Inventory.Item.View", "Inventory.Item.Add", "Inventory.Item.Edit", "Inventory.Item.ViewCost",
        "Inventory.Category.View", "Inventory.Category.Add", "Inventory.Category.Edit",
        "Inventory.Unit.View", "Inventory.Unit.Add", "Inventory.Unit.Edit",
        "Inventory.Warehouse.View", "Inventory.Warehouse.Add", "Inventory.Warehouse.Edit",
        "Inventory.Movement.View", "Inventory.Movement.ViewItemMovement", "Inventory.Movement.ViewWarehouseBalance",
        "Inventory.WarehouseReceipt.View", "Inventory.WarehouseReceipt.Add", "Inventory.WarehouseReceipt.Approve",
        "Inventory.WarehouseIssue.View", "Inventory.WarehouseIssue.Add", "Inventory.WarehouseIssue.Approve",
        "Inventory.WarehouseTransfer.View", "Inventory.WarehouseTransfer.Add", "Inventory.WarehouseTransfer.Approve",
        "Inventory.StockCount.View", "Inventory.StockCount.Add", "Inventory.StockCount.Approve",
        "Inventory.StockAdjustment.View", "Inventory.StockAdjustment.Add", "Inventory.StockAdjustment.Approve",
        "Reports.Reports.ViewInventoryReports", "Reports.Reports.ViewPurchaseReports",
    };

    public static readonly IReadOnlyList<string> Cashier = new[]
    {
        "Sales.Invoice.View", "Sales.Invoice.AddPaymentFromInvoice",
        "Customer.Customer.View",
        "Cash.Receipt.View", "Cash.Receipt.Add", "Cash.Receipt.Print",
        "Cash.Payment.View", "Cash.Payment.Add", "Cash.Payment.Print",
        "Cash.CashAccount.View", "Cash.CashAccount.ViewBalance",
        "Cash.Transfer.View", "Cash.Transfer.Add",
        "Cash.BankAccount.View",
    };

    /// <summary>
    /// Returns the default permission preset for a role, or <c>null</c> for unknown roles.
    /// </summary>
    public static IReadOnlyList<string>? For(string? role)
    {
        return role switch
        {
            "Admin" => All,
            "Accountant" => Accountant,
            "SalesManager" => SalesManager,
            "InventoryManager" => InventoryManager,
            "Cashier" => Cashier,
            _ => null,
        };
    }
}