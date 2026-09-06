using System.Text.Json;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Data;

/// <summary>
/// Comprehensive data seeder that runs on first startup.
/// Seeds the full foundational data: Company, Branch, FiscalYear, Permissions, Roles,
/// Super Admin user, Chart of Accounts (with CompanyId), AccountingDefaults, and Warehouse.
/// Per DATABASE_DOMAIN.md §3-8, PERMISSIONS.md §5-15, and ACCOUNTING_RULES.md §30.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher passwordHasher, ILogger logger)
    {
        // ═══════════════════════════════════════════
        // 0. FIXUP: Rename legacy permission names
        // ═══════════════════════════════════════════
        await FixupPermissionNamesAsync(db, logger);

        // Only seed if no permissions exist (idempotent).
        // The migration seeds the default company, so we check permissions instead.
        if (await db.Permissions.AnyAsync())
        {
            logger.LogInformation("Database already seeded. Skipping DataSeeder.");
            return;
        }

        logger.LogInformation("Starting comprehensive data seed...");

        // ═══════════════════════════════════════════
        // 1. DEFAULT COMPANY
        // ═══════════════════════════════════════════
        // Use the same GUID as the migration seed so all FK defaults resolve
        var defaultCompanyId = new Guid("00000000-0000-0000-0000-000000000000");
        var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == defaultCompanyId);
        if (company == null)
        {
            company = new Company
            {
                Id = defaultCompanyId,
                Name = "الشركة الرئيسية",
                LegalName = "Main Company LLC",
                DefaultCurrency = "LYD",
                Country = "Libya",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Companies.Add(company);
        }

        // ═══════════════════════════════════════════
        // 2. DEFAULT BRANCH
        // ═══════════════════════════════════════════
        var branch = new Branch
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Code = "BR-001",
            Name = "الفرع الرئيسي",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Branches.Add(branch);

        // ═══════════════════════════════════════════
        // 3. DEFAULT FISCAL YEAR
        // ═══════════════════════════════════════════
        var fiscalYear = new FiscalYear
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Name = "السنة المالية 2026",
            StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2026, 12, 31, 23, 59, 59, DateTimeKind.Utc),
            IsClosed = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.FiscalYears.Add(fiscalYear);

        await db.SaveChangesAsync(); // Save to get Company ID for accounts

        // ═══════════════════════════════════════════
        // 4. MASTER PERMISSIONS (PERMISSIONS.md §5-15)
        // ═══════════════════════════════════════════
        var permissions = GetAllPermissions();
        foreach (var p in permissions)
        {
            p.Id = Guid.NewGuid();
            p.CreatedAt = DateTime.UtcNow;
        }
        db.Permissions.AddRange(permissions);
        await db.SaveChangesAsync();

        // ═══════════════════════════════════════════
        // 5. ADMIN ROLE (bound to ALL permissions)
        // ═══════════════════════════════════════════
        var adminRole = new Role
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Name = "Admin",
            Description = "System Administrator — full access to all modules",
            IsSystemRole = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Roles.Add(adminRole);

        // Bind all permissions to Admin role
        var rolePermissions = permissions.Select(p => new RolePermission
        {
            Id = Guid.NewGuid(),
            RoleId = adminRole.Id,
            PermissionId = p.Id,
            CreatedAt = DateTime.UtcNow
        }).ToList();
        db.RolePermissions.AddRange(rolePermissions);
        await db.SaveChangesAsync();

        // ═══════════════════════════════════════════
        // 6. SUPER ADMIN USER
        // ═══════════════════════════════════════════
        // Permissions are the ground truth for authorization (PERMISSIONS.md): the admin
        // gets ALL permission names stored directly in PermissionsJson, so the role
        // string is only a UI label/preset and never a source of authorization decisions.
        var allPermissionNames = permissions.Select(p => p.Name).ToList();
        var allPermissionsJson = JsonSerializer.Serialize(allPermissionNames);

        var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
        if (adminUser == null)
        {
            adminUser = new User
            {
                Id = Guid.NewGuid(),
                FullName = "Super Admin",
                Username = "admin",
                PasswordHash = passwordHasher.HashPassword("admin123"),
                Role = "Admin",
                IsActive = true,
                CompanyId = company.Id,
                BranchId = branch.Id,
                PermissionsJson = allPermissionsJson,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(adminUser);
        }
        else
        {
            // Update existing admin user with company and branch
            adminUser.CompanyId = company.Id;
            adminUser.BranchId = branch.Id;
            adminUser.Role = "Admin";
            adminUser.PermissionsJson = allPermissionsJson;
            adminUser.UpdatedAt = DateTime.UtcNow;
        }

        // Bind admin user to admin role (if not already bound)
        var existingUserRole = await db.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == adminUser.Id && ur.RoleId == adminRole.Id);
        if (existingUserRole == null)
        {
            db.UserRoles.Add(new UserRole
            {
                Id = Guid.NewGuid(),
                UserId = adminUser.Id,
                RoleId = adminRole.Id,
                AssignedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();

        // ═══════════════════════════════════════════
        // 7. CHART OF ACCOUNTS (with CompanyId)
        // ═══════════════════════════════════════════
        await SeedChartOfAccountsAsync(db, company.Id, logger);

        // ═══════════════════════════════════════════
        // 8. ACCOUNTING DEFAULTS (ACCOUNTING_RULES §30)
        // ═══════════════════════════════════════════
        var accounts = await db.Accounts.Where(a => a.CompanyId == company.Id).ToListAsync();
        var ar = accounts.FirstOrDefault(a => a.Code == "1130");
        var inventory = accounts.FirstOrDefault(a => a.Code == "1140");
        var ap = accounts.FirstOrDefault(a => a.Code == "2110");
        var salesRevenue = accounts.FirstOrDefault(a => a.Code == "4100");
        var otherIncome = accounts.FirstOrDefault(a => a.Code == "4200");
        var cogs = accounts.FirstOrDefault(a => a.Code == "5100");
        var adminExpense = accounts.FirstOrDefault(a => a.Code == "5500");
        var cash = accounts.FirstOrDefault(a => a.Code == "1110");

        var accountingDefaults = new AccountingDefaults
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            DefaultCustomerArAccountId = ar?.Id,
            DefaultSupplierApAccountId = ap?.Id,
            SalesRevenueAccountId = salesRevenue?.Id,
            SalesCashAccountId = cash?.Id,
            InventoryAccountId = inventory?.Id,
            CogsAccountId = cogs?.Id,
            InventoryGainAccountId = otherIncome?.Id,
            InventoryLossAccountId = adminExpense?.Id,
            CreatedAt = DateTime.UtcNow
        };
        db.AccountingDefaults.Add(accountingDefaults);

        // ═══════════════════════════════════════════
        // 9. DEFAULT WAREHOUSE
        // ═══════════════════════════════════════════
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            BranchId = branch.Id,
            Code = "WH-001",
            Name = "المخزن الرئيسي",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Warehouses.Add(warehouse);

        // ═══════════════════════════════════════════
        // 10. DEFAULT UNITS
        // ═══════════════════════════════════════════
        db.Units.AddRange(
            new Unit { Id = Guid.NewGuid(), Name = "قطعة", Symbol = "pc", CreatedAt = DateTime.UtcNow },
            new Unit { Id = Guid.NewGuid(), Name = "كيلوغرام", Symbol = "kg", CreatedAt = DateTime.UtcNow },
            new Unit { Id = Guid.NewGuid(), Name = "لتر", Symbol = "L", CreatedAt = DateTime.UtcNow },
            new Unit { Id = Guid.NewGuid(), Name = "متر", Symbol = "m", CreatedAt = DateTime.UtcNow },
            new Unit { Id = Guid.NewGuid(), Name = "صندوق", Symbol = "box", CreatedAt = DateTime.UtcNow }
        );

        await db.SaveChangesAsync();
        logger.LogInformation(
            "Comprehensive data seed completed. Company: {CompanyName}, Admin: {AdminUser}",
            company.Name, adminUser.Username);
    }

    /// <summary>
    /// Seeds the standard Chart of Accounts hierarchy with CompanyId.
    /// Based on ACCOUNTING_RULES.md and the existing AccountingService pattern.
    /// </summary>
    private static async Task SeedChartOfAccountsAsync(AppDbContext db, Guid companyId, ILogger logger)
    {
        if (await db.Accounts.AnyAsync(a => a.CompanyId == companyId))
        {
            return;
        }

        logger.LogInformation("Seeding Chart of Accounts for CompanyId={CompanyId}...", companyId);

        // 1000 Assets
        var assetsRoot = new Account { CompanyId = companyId, Code = "1000", Name = "Assets (الأصول)", Type = AccountType.Asset, IsHeader = true, IsActive = true };
        var currentAssets = new Account { CompanyId = companyId, Code = "1100", Name = "Current Assets (الأصول المتداولة)", Type = AccountType.Asset, IsHeader = true, Parent = assetsRoot, IsActive = true };
        var cash = new Account { CompanyId = companyId, Code = "1110", Name = "Cash on Hand (الخزينة النقدية)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };
        var bank = new Account { CompanyId = companyId, Code = "1120", Name = "Bank Accounts (الحسابات المصرفية)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };
        var ar = new Account { CompanyId = companyId, Code = "1130", Name = "Accounts Receivable - Customers (العملاء / المدينون)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };
        var inventory = new Account { CompanyId = companyId, Code = "1140", Name = "Inventory (المخزون السلعي)", Type = AccountType.Asset, IsHeader = false, Parent = currentAssets, IsActive = true };

        var nonCurrentAssets = new Account { CompanyId = companyId, Code = "1200", Name = "Non-Current Assets (الأصول الثابتة)", Type = AccountType.Asset, IsHeader = true, Parent = assetsRoot, IsActive = true };
        var ppe = new Account { CompanyId = companyId, Code = "1210", Name = "Property, Plant & Equipment (الممتلكات والآلات والمعدات)", Type = AccountType.Asset, IsHeader = false, Parent = nonCurrentAssets, IsActive = true };
        var accumDepr = new Account { CompanyId = companyId, Code = "1220", Name = "Accumulated Depreciation (مجمع الإهلاك)", Type = AccountType.Asset, IsHeader = false, Parent = nonCurrentAssets, IsActive = true };

        // 2000 Liabilities
        var liabilitiesRoot = new Account { CompanyId = companyId, Code = "2000", Name = "Liabilities (الالتزامات / الخصوم)", Type = AccountType.Liability, IsHeader = true, IsActive = true };
        var currentLiabilities = new Account { CompanyId = companyId, Code = "2100", Name = "Current Liabilities (الالتزامات المتداولة)", Type = AccountType.Liability, IsHeader = true, Parent = liabilitiesRoot, IsActive = true };
        var ap = new Account { CompanyId = companyId, Code = "2110", Name = "Accounts Payable - Suppliers (الموردون / الدائنون)", Type = AccountType.Liability, IsHeader = false, Parent = currentLiabilities, IsActive = true };
        var accruedExp = new Account { CompanyId = companyId, Code = "2120", Name = "Accrued Expenses (المصروفات المستحقة)", Type = AccountType.Liability, IsHeader = false, Parent = currentLiabilities, IsActive = true };
        var shortTermLoan = new Account { CompanyId = companyId, Code = "2130", Name = "Short-Term Loans (قروض قصيرة الأجل)", Type = AccountType.Liability, IsHeader = false, Parent = currentLiabilities, IsActive = true };

        // 3000 Equity
        var equityRoot = new Account { CompanyId = companyId, Code = "3000", Name = "Equity (حقوق الملكية)", Type = AccountType.Equity, IsHeader = true, IsActive = true };
        var capital = new Account { CompanyId = companyId, Code = "3100", Name = "Owner's Capital (رأس المال)", Type = AccountType.Equity, IsHeader = false, Parent = equityRoot, IsActive = true };
        var retainedEarnings = new Account { CompanyId = companyId, Code = "3200", Name = "Retained Earnings (الأرباح المحتجزة / المدورة)", Type = AccountType.Equity, IsHeader = false, Parent = equityRoot, IsActive = true };

        // 4000 Revenue
        var revenueRoot = new Account { CompanyId = companyId, Code = "4000", Name = "Revenue (الإيرادات)", Type = AccountType.Revenue, IsHeader = true, IsActive = true };
        var salesRevenue = new Account { CompanyId = companyId, Code = "4100", Name = "Sales Revenue (إيرادات المبيعات)", Type = AccountType.Revenue, IsHeader = false, Parent = revenueRoot, IsActive = true };
        var otherIncome = new Account { CompanyId = companyId, Code = "4200", Name = "Other Income (إيرادات أخرى)", Type = AccountType.Revenue, IsHeader = false, Parent = revenueRoot, IsActive = true };

        // 5000 Expenses
        var expensesRoot = new Account { CompanyId = companyId, Code = "5000", Name = "Expenses (المصروفات والتكاليف)", Type = AccountType.Expense, IsHeader = true, IsActive = true };
        var cogsAcc = new Account { CompanyId = companyId, Code = "5100", Name = "Cost of Goods Sold - COGS (تكلفة البضاعة المباعة)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var salaries = new Account { CompanyId = companyId, Code = "5200", Name = "Salaries & Wages (المرتبات والأجور)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var rentUtilities = new Account { CompanyId = companyId, Code = "5300", Name = "Rent & Utilities (الإيجارات والمرافق)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var deprExpense = new Account { CompanyId = companyId, Code = "5400", Name = "Depreciation Expense (مصروف الإهلاك)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };
        var adminExpense = new Account { CompanyId = companyId, Code = "5500", Name = "General & Administrative (المصروفات العمومية والإدارية)", Type = AccountType.Expense, IsHeader = false, Parent = expensesRoot, IsActive = true };

        db.Accounts.AddRange(
            assetsRoot, currentAssets, cash, bank, ar, inventory, nonCurrentAssets, ppe, accumDepr,
            liabilitiesRoot, currentLiabilities, ap, accruedExp, shortTermLoan,
            equityRoot, capital, retainedEarnings,
            revenueRoot, salesRevenue, otherIncome,
            expensesRoot, cogsAcc, salaries, rentUtilities, deprExpense, adminExpense
        );

        await db.SaveChangesAsync();
        logger.LogInformation("Chart of Accounts seeded for CompanyId={CompanyId}.", companyId);
    }

    /// <summary>
    /// Returns all master permissions as defined in PERMISSIONS.md §5-15.
    /// Each permission follows the Module.Category.Action naming convention.
    /// </summary>
    private static List<Permission> GetAllPermissions()
    {
        var perms = new List<Permission>();

        // ─── §5: Sales Permissions ───
        // Sales Invoice
        AddPerms(perms, "Sales", "Invoice", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print",
            "View Cost", "View Profit", "Change Account", "Add Customer From Invoice",
            "Edit Customer From Invoice", "Add Payment From Invoice", "View Options"
        });
        // Sales Return
        AddPerms(perms, "Sales", "Return", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print",
            "View Cost", "View Profit"
        });
        // Price Lists
        AddPerms(perms, "Sales", "Price List", new[] {
            "View", "Add", "Edit", "Delete", "Approve"
        });
        // Discounts
        AddPerms(perms, "Sales", "Discount", new[] {
            "View", "Add", "Edit", "Approve", "Override"
        });

        // ─── §6: Customer Permissions ───
        AddPerms(perms, "Customer", "Customer", new[] {
            "View", "Add", "Edit", "Delete", "View Balance", "View Statement",
            "Print Statement", "View Aging", "Add Payment", "Edit Payment",
            "Cancel Payment", "View Banking Information"
        });

        // ─── §7: Purchase Permissions ───
        // Purchase Invoice
        AddPerms(perms, "Purchase", "Invoice", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print",
            "View Cost", "Edit Cost", "View Options"
        });
        // Purchase Return
        AddPerms(perms, "Purchase", "Return", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print"
        });
        // Additional Costs
        AddPerms(perms, "Purchase", "Additional Cost", new[] {
            "View", "Add", "Edit", "Delete", "Approve"
        });

        // ─── §8: Supplier Permissions ───
        AddPerms(perms, "Supplier", "Supplier", new[] {
            "View", "Add", "Edit", "Delete", "View Balance", "View Statement",
            "Print Statement", "View Aging", "Add Payment", "Edit Payment",
            "Cancel Payment", "View Banking Information"
        });

        // ─── §9: Inventory Permissions ───
        // Items
        AddPerms(perms, "Inventory", "Item", new[] {
            "View", "Add", "Edit", "Delete", "View Cost", "Edit Cost",
            "View Prices", "Edit Prices"
        });
        // Categories
        AddPerms(perms, "Inventory", "Category", new[] {
            "View", "Add", "Edit", "Delete"
        });
        // Units
        AddPerms(perms, "Inventory", "Unit", new[] {
            "View", "Add", "Edit", "Delete", "Manage Item Unit Conversion"
        });
        // Warehouses
        AddPerms(perms, "Inventory", "Warehouse", new[] {
            "View", "Add", "Edit", "Delete"
        });
        // Inventory Movement
        AddPerms(perms, "Inventory", "Movement", new[] {
            "View", "View Item Movement", "View Warehouse Balance",
            "View Cost", "View Valuation"
        });
        // Warehouse Receipt
        AddPerms(perms, "Inventory", "Warehouse Receipt", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print"
        });
        // Warehouse Issue
        AddPerms(perms, "Inventory", "Warehouse Issue", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print"
        });
        // Warehouse Transfer
        AddPerms(perms, "Inventory", "Warehouse Transfer", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print"
        });
        // Stock Count
        AddPerms(perms, "Inventory", "Stock Count", new[] {
            "View", "Add", "Edit", "Delete", "Approve"
        });
        // Stock Adjustment
        AddPerms(perms, "Inventory", "Stock Adjustment", new[] {
            "View", "Add", "Approve", "View Cost"
        });

        // ─── §10: Accounting Permissions ───
        // Chart of Accounts
        AddPerms(perms, "Accounting", "Account", new[] {
            "View", "Add", "Edit", "Delete", "Activate", "Deactivate"
        });
        // Journal Entry
        AddPerms(perms, "Accounting", "Journal Entry", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print"
        });
        // General Ledger
        AddPerms(perms, "Accounting", "General Ledger", new[] {
            "View", "View Account Statement", "Print"
        });
        // Trial Balance
        AddPerms(perms, "Accounting", "Trial Balance", new[] {
            "View", "Print"
        });
        // Closing
        AddPerms(perms, "Accounting", "Closing", new[] {
            "View Status", "Start", "Approve", "Reopen Fiscal Year"
        });

        // ─── §11: Cash & Bank Permissions ───
        // Receipt
        AddPerms(perms, "Cash", "Receipt", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print"
        });
        // Payment
        AddPerms(perms, "Cash", "Payment", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve", "Print"
        });
        // Cash Accounts
        AddPerms(perms, "Cash", "Cash Account", new[] {
            "View", "Add", "Edit", "Delete", "View Balance", "View Transactions"
        });
        // Bank Accounts
        AddPerms(perms, "Cash", "Bank Account", new[] {
            "View", "Add", "Edit", "Delete", "View Balance", "View Transactions"
        });
        // Transfers
        AddPerms(perms, "Cash", "Transfer", new[] {
            "View", "Add", "Edit", "Delete", "Cancel", "Approve"
        });

        // ─── §12: Fixed Assets Permissions ───
        AddPerms(perms, "FixedAsset", "Fixed Asset", new[] {
            "View", "Add", "Edit", "Delete", "Approve Acquisition",
            "Calculate Depreciation", "Approve Depreciation",
            "Transfer", "Improve", "Sell", "Dispose",
            "View Cost", "View Book Value", "Print Report"
        });

        // ─── §13: Cost Center Permissions ───
        AddPerms(perms, "CostCenter", "Cost Center", new[] {
            "View", "Add", "Edit", "Delete", "Assign", "View Reports"
        });

        // ─── §14: Reports Permissions ───
        AddPerms(perms, "Reports", "Reports", new[] {
            "View Sales Reports", "View Purchase Reports", "View Inventory Reports",
            "View Customer Reports", "View Supplier Reports",
            "View Cash Reports", "View Bank Reports", "View Accounting Reports",
            "View Fixed Asset Reports", "View Cost Center Reports",
            "View Profit Reports", "View Cost Reports", "View Aging Reports",
            "Print Reports", "Export Reports"
        });

        // ─── §15: Administration Permissions ───
        // Companies
        AddPerms(perms, "Admin", "Company", new[] { "View", "Add", "Edit", "Delete" });
        // Branches
        AddPerms(perms, "Admin", "Branch", new[] { "View", "Add", "Edit", "Delete" });
        // Fiscal Years
        AddPerms(perms, "Admin", "Fiscal Year", new[] { "View", "Add", "Edit", "Close", "Reopen" });
        // Users
        AddPerms(perms, "Admin", "User", new[] { "View", "Add", "Edit", "Delete", "Activate", "Deactivate", "Reset Credentials" });
        // Roles
        AddPerms(perms, "Admin", "Role", new[] { "View", "Add", "Edit", "Delete", "Assign" });
        // Permissions
        AddPerms(perms, "Admin", "Permission", new[] { "View Matrix", "Modify Role Permissions", "Assign User Permissions" });

        return perms;
    }

    /// <summary>
    /// Renames legacy permission names that had redundant module prefixes in the category.
    /// E.g. "Sales.SalesInvoice.View" → "Sales.Invoice.View".
    /// Runs on every startup; idempotent.
    /// </summary>
    private static async Task FixupPermissionNamesAsync(AppDbContext db, ILogger logger)
    {
        var renames = new (string Old, string New)[]
        {
            ("Sales.SalesInvoice.",     "Sales.Invoice."),
            ("Sales.SalesReturn.",      "Sales.Return."),
            ("Purchase.PurchaseInvoice.", "Purchase.Invoice."),
            ("Purchase.PurchaseReturn.",  "Purchase.Return."),
        };

        var permissions = await db.Permissions.ToListAsync();
        int count = 0;
        foreach (var perm in permissions)
        {
            foreach (var (old, @new) in renames)
            {
                if (perm.Name.StartsWith(old, StringComparison.Ordinal))
                {
                    var fixedName = @new + perm.Name[old.Length..];
                    logger.LogInformation("Fixing permission: {Old} → {New}", perm.Name, fixedName);
                    perm.Name = fixedName;
                    perm.Category = fixedName.Split('.')[1];
                    count++;
                }
            }
        }
        if (count > 0)
        {
            await db.SaveChangesAsync();
            logger.LogInformation("Fixed {Count} permission names.", count);
        }
    }

    /// <summary>
    /// Helper to batch-create Permission entities for a given module and category.
    /// Permission name format: "{Module}.{Category}.{Action}" (e.g. "Sales.Invoice.View")
    /// </summary>
    private static void AddPerms(List<Permission> list, string module, string category, string[] actions)
    {
        // Normalize: remove spaces from category for the permission name
        var catKey = category.Replace(" ", "");
        foreach (var action in actions)
        {
            var actionKey = action.Replace(" ", "");
            list.Add(new Permission
            {
                Name = $"{module}.{catKey}.{actionKey}",
                Module = module,
                Category = category,
                Description = $"{action} {category}"
            });
        }
    }
}
