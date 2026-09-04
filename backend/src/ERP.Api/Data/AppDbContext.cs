using ERP.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<FiscalYear> FiscalYears => Set<FiscalYear>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<AccountingDefaults> AccountingDefaults => Set<AccountingDefaults>();
    public DbSet<CostCenter> CostCenters => Set<CostCenter>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ItemUnitConversion> ItemUnitConversions => Set<ItemUnitConversion>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();
    public DbSet<SalesInvoiceLine> SalesInvoiceLines => Set<SalesInvoiceLine>();
    public DbSet<SalesReturn> SalesReturns => Set<SalesReturn>();
    public DbSet<SalesReturnLine> SalesReturnLines => Set<SalesReturnLine>();
    public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();
    public DbSet<PurchaseInvoiceLine> PurchaseInvoiceLines => Set<PurchaseInvoiceLine>();
    public DbSet<PurchaseReturn> PurchaseReturns => Set<PurchaseReturn>();
    public DbSet<PurchaseReturnLine> PurchaseReturnLines => Set<PurchaseReturnLine>();
    public DbSet<Treasury> Treasuries => Set<Treasury>();
    public DbSet<CashVoucher> CashVouchers => Set<CashVoucher>();
    public DbSet<TransferVoucher> TransferVouchers => Set<TransferVoucher>();
    public DbSet<AssetCategory> AssetCategories => Set<AssetCategory>();
    public DbSet<FixedAsset> FixedAssets => Set<FixedAsset>();
    public DbSet<DepreciationEntry> DepreciationEntries => Set<DepreciationEntry>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

modelBuilder.Entity<Company>(e => {
        e.HasKey(c => c.Id);
        e.Property(c => c.Name).IsRequired().HasMaxLength(200);
        e.Property(c => c.DefaultCurrency).IsRequired().HasMaxLength(10).HasDefaultValue("LYD");
        });
modelBuilder.Entity<Branch>(e => {
        e.HasKey(b => b.Id);
        e.HasIndex(b => new { b.CompanyId, b.Code }).IsUnique();
        e.Property(b => b.Code).IsRequired().HasMaxLength(50);
        e.Property(b => b.Name).IsRequired().HasMaxLength(200);
        e.HasOne(b => b.Company).WithMany(c => c.Branches).HasForeignKey(b => b.CompanyId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<FiscalYear>(e => {
        e.HasKey(fy => fy.Id);
        e.HasIndex(fy => new { fy.CompanyId, fy.Name }).IsUnique();
        e.Property(fy => fy.Name).IsRequired().HasMaxLength(100);
        e.HasOne(fy => fy.Company).WithMany(c => c.FiscalYears).HasForeignKey(fy => fy.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(fy => fy.ClosedByUser).WithMany().HasForeignKey(fy => fy.ClosedByUserId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<User>(e => {
        e.HasKey(u => u.Id);
        e.HasIndex(u => u.Username).IsUnique();
        e.Property(u => u.FullName).IsRequired().HasMaxLength(200);
        e.Property(u => u.Username).IsRequired().HasMaxLength(100);
        e.Property(u => u.PasswordHash).IsRequired();
        e.Property(u => u.Role).HasMaxLength(50);
        e.Property(u => u.PermissionsJson).HasMaxLength(4000).HasDefaultValue("[]");
        e.Property(u => u.IsActive).HasDefaultValue(true);
        e.HasOne(u => u.Company).WithMany(c => c.Users).HasForeignKey(u => u.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(u => u.Branch).WithMany().HasForeignKey(u => u.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasMany(u => u.RefreshTokens).WithOne(rt => rt.User).HasForeignKey(rt => rt.UserId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<RefreshToken>(e => {
        e.HasKey(rt => rt.Id);
        e.HasIndex(rt => rt.Token).IsUnique();
        e.Property(rt => rt.Token).IsRequired().HasMaxLength(500);
        e.Property(rt => rt.CreatedByIp).HasMaxLength(100);
        });
modelBuilder.Entity<Permission>(e => {
        e.HasKey(p => p.Id);
        e.HasIndex(p => p.Name).IsUnique();
        e.Property(p => p.Name).IsRequired().HasMaxLength(200);
        e.Property(p => p.Module).IsRequired().HasMaxLength(50);
        e.Property(p => p.Category).IsRequired().HasMaxLength(100);
        e.Property(p => p.Description).HasMaxLength(500);
        });
modelBuilder.Entity<Role>(e => {
        e.HasKey(r => r.Id);
        e.HasIndex(r => new { r.CompanyId, r.Name }).IsUnique();
        e.Property(r => r.Name).IsRequired().HasMaxLength(100);
        e.Property(r => r.Description).HasMaxLength(500);
        e.HasOne(r => r.Company).WithMany().HasForeignKey(r => r.CompanyId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<RolePermission>(e => {
        e.HasKey(rp => rp.Id);
        e.HasIndex(rp => new { rp.RoleId, rp.PermissionId }).IsUnique();
        e.HasOne(rp => rp.Role).WithMany(r => r.RolePermissions).HasForeignKey(rp => rp.RoleId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(rp => rp.Permission).WithMany().HasForeignKey(rp => rp.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<UserRole>(e => {
        e.HasKey(ur => ur.Id);
        e.HasIndex(ur => new { ur.UserId, ur.RoleId }).IsUnique();
        e.HasOne(ur => ur.User).WithMany(u => u.UserRoles).HasForeignKey(ur => ur.UserId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(ur => ur.Role).WithMany(r => r.UserRoles).HasForeignKey(ur => ur.RoleId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<Unit>(e => {
        e.HasKey(u => u.Id);
        e.HasIndex(u => u.Name).IsUnique();
        e.Property(u => u.Name).IsRequired().HasMaxLength(100);
        e.Property(u => u.Symbol).HasMaxLength(20);
        });
modelBuilder.Entity<Account>(e => {
        e.HasKey(a => a.Id);
        e.HasIndex(a => new { a.CompanyId, a.Code }).IsUnique();
        e.Property(a => a.Code).IsRequired().HasMaxLength(50);
        e.Property(a => a.Name).IsRequired().HasMaxLength(200);
        e.Property(a => a.Type).IsRequired();
        e.Property(a => a.IsActive).HasDefaultValue(true);
        e.Property(a => a.IsHeader).HasDefaultValue(false);
        e.Property(a => a.Balance).HasPrecision(18, 4).HasDefaultValue(0m);
        e.HasOne(a => a.Company).WithMany(c => c.Accounts).HasForeignKey(a => a.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(a => a.Parent).WithMany(a => a.Children).HasForeignKey(a => a.ParentId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<CostCenter>(e => {
        e.HasKey(cc => cc.Id);
        e.HasIndex(cc => new { cc.CompanyId, cc.Code }).IsUnique();
        e.Property(cc => cc.Code).IsRequired().HasMaxLength(50);
        e.Property(cc => cc.Name).IsRequired().HasMaxLength(200);
        e.HasOne(cc => cc.Company).WithMany().HasForeignKey(cc => cc.CompanyId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<AccountingDefaults>(e => {
        e.HasKey(ad => ad.Id);
        e.HasIndex(ad => ad.CompanyId).IsUnique();
        e.HasOne(ad => ad.Company).WithMany().HasForeignKey(ad => ad.CompanyId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<JournalEntry>(e => {
        e.HasKey(je => je.Id);
        e.HasIndex(je => je.EntryNumber).IsUnique();
        e.Property(je => je.EntryNumber).IsRequired().HasMaxLength(50);
        e.Property(je => je.Description).IsRequired().HasMaxLength(500);
        e.Property(je => je.Status).IsRequired();
        e.HasOne(je => je.Company).WithMany(c => c.JournalEntries).HasForeignKey(je => je.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(je => je.Branch).WithMany().HasForeignKey(je => je.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(je => je.FiscalYear).WithMany(fy => fy.JournalEntries).HasForeignKey(je => je.FiscalYearId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(je => je.PostedByUser).WithMany().HasForeignKey(je => je.PostedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasMany(je => je.Lines).WithOne(jel => jel.JournalEntry).HasForeignKey(jel => jel.JournalEntryId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<JournalEntryLine>(e => {
        e.HasKey(jel => jel.Id);
        e.Property(jel => jel.Debit).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(jel => jel.Credit).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(jel => jel.Description).HasMaxLength(300);
        e.HasOne(jel => jel.Account).WithMany(a => a.JournalEntryLines).HasForeignKey(jel => jel.AccountId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(jel => jel.CostCenter).WithMany().HasForeignKey(jel => jel.CostCenterId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(jel => jel.Customer).WithMany().HasForeignKey(jel => jel.CustomerId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(jel => jel.Supplier).WithMany().HasForeignKey(jel => jel.SupplierId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<Category>(e => {
        e.HasKey(c => c.Id);
        e.HasIndex(c => new { c.CompanyId, c.Code }).IsUnique();
        e.Property(c => c.Code).IsRequired().HasMaxLength(50);
        e.Property(c => c.Name).IsRequired().HasMaxLength(200);
        e.Property(c => c.Description).HasMaxLength(500);
        e.Property(c => c.IsActive).HasDefaultValue(true);
        e.HasOne(c => c.Company).WithMany(co => co.Categories).HasForeignKey(c => c.CompanyId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<Warehouse>(e => {
        e.HasKey(w => w.Id);
        e.HasIndex(w => new { w.CompanyId, w.Code }).IsUnique();
        e.Property(w => w.Code).IsRequired().HasMaxLength(50);
        e.Property(w => w.Name).IsRequired().HasMaxLength(200);
        e.Property(w => w.Location).HasMaxLength(500);
        e.Property(w => w.IsActive).HasDefaultValue(true);
        e.HasOne(w => w.Company).WithMany(co => co.Warehouses).HasForeignKey(w => w.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(w => w.Branch).WithMany().HasForeignKey(w => w.BranchId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<Product>(e => {
        e.HasKey(p => p.Id);
        e.HasIndex(p => new { p.CompanyId, p.SKU }).IsUnique();
        e.Property(p => p.SKU).IsRequired().HasMaxLength(100);
        e.Property(p => p.Name).IsRequired().HasMaxLength(300);
        e.Property(p => p.Description).HasMaxLength(1000);
        e.Property(p => p.PurchasePrice).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(p => p.SellingPrice).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(p => p.CurrentStock).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(p => p.MinStockLevel).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(p => p.IsActive).HasDefaultValue(true);
        e.HasOne(p => p.Company).WithMany(co => co.Products).HasForeignKey(p => p.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(p => p.Category).WithMany(c => c.Products).HasForeignKey(p => p.CategoryId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(p => p.BaseUnit).WithMany().HasForeignKey(p => p.BaseUnitId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<ItemUnitConversion>(e => {
        e.HasKey(iuc => iuc.Id);
        e.HasIndex(iuc => new { iuc.ProductId, iuc.SourceUnitId }).IsUnique();
        e.Property(iuc => iuc.ConversionFactor).HasPrecision(18, 6);
        e.HasOne(iuc => iuc.Product).WithMany(p => p.UnitConversions).HasForeignKey(iuc => iuc.ProductId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(iuc => iuc.SourceUnit).WithMany().HasForeignKey(iuc => iuc.SourceUnitId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(iuc => iuc.BaseUnit).WithMany().HasForeignKey(iuc => iuc.BaseUnitId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<StockMovement>(e => {
        e.HasKey(sm => sm.Id);
        e.Property(sm => sm.MovementType).IsRequired();
        e.Property(sm => sm.Quantity).HasPrecision(18, 4);
        e.Property(sm => sm.UnitCost).HasPrecision(18, 4);
        e.Property(sm => sm.ReferenceDocument).HasMaxLength(200);
        e.Property(sm => sm.Notes).HasMaxLength(500);
        e.HasOne(sm => sm.Company).WithMany().HasForeignKey(sm => sm.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(sm => sm.Product).WithMany(p => p.StockMovements).HasForeignKey(sm => sm.ProductId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(sm => sm.Warehouse).WithMany(w => w.StockMovements).HasForeignKey(sm => sm.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(sm => sm.CreatedByUser).WithMany().HasForeignKey(sm => sm.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasIndex(sm => new { sm.ProductId, sm.WarehouseId });
        });
modelBuilder.Entity<Customer>(e => {
        e.HasKey(c => c.Id);
        e.HasIndex(c => new { c.CompanyId, c.Code }).IsUnique();
        e.Property(c => c.Code).IsRequired().HasMaxLength(50);
        e.Property(c => c.Name).IsRequired().HasMaxLength(300);
        e.Property(c => c.Phone).HasMaxLength(50);
        e.Property(c => c.Email).HasMaxLength(200);
        e.Property(c => c.TaxNumber).HasMaxLength(50);
        e.Property(c => c.Address).HasMaxLength(500);
        e.Property(c => c.Balance).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(c => c.IsActive).HasDefaultValue(true);
        e.HasOne(c => c.Company).WithMany(co => co.Customers).HasForeignKey(c => c.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(c => c.Branch).WithMany().HasForeignKey(c => c.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(c => c.Account).WithMany().HasForeignKey(c => c.AccountId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<Supplier>(e => {
        e.HasKey(s => s.Id);
        e.HasIndex(s => new { s.CompanyId, s.Code }).IsUnique();
        e.Property(s => s.Code).IsRequired().HasMaxLength(50);
        e.Property(s => s.Name).IsRequired().HasMaxLength(300);
        e.Property(s => s.Phone).HasMaxLength(50);
        e.Property(s => s.Email).HasMaxLength(200);
        e.Property(s => s.TaxNumber).HasMaxLength(50);
        e.Property(s => s.Address).HasMaxLength(500);
        e.Property(s => s.Balance).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(s => s.IsActive).HasDefaultValue(true);
        e.HasOne(s => s.Company).WithMany(co => co.Suppliers).HasForeignKey(s => s.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(s => s.Branch).WithMany().HasForeignKey(s => s.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(s => s.Account).WithMany().HasForeignKey(s => s.AccountId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<SalesInvoice>(e => {
        e.HasKey(si => si.Id);
        e.HasIndex(si => si.InvoiceNumber).IsUnique();
        e.Property(si => si.InvoiceNumber).IsRequired().HasMaxLength(50);
        e.Property(si => si.Status).IsRequired();
        e.Property(si => si.SubTotal).HasPrecision(18, 4);
        e.Property(si => si.TaxAmount).HasPrecision(18, 4);
        e.Property(si => si.DiscountAmount).HasPrecision(18, 4);
        e.Property(si => si.TotalAmount).HasPrecision(18, 4);
        e.Property(si => si.Notes).HasMaxLength(500);
        e.HasOne(si => si.Company).WithMany().HasForeignKey(si => si.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(si => si.Branch).WithMany().HasForeignKey(si => si.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(si => si.Customer).WithMany(c => c.SalesInvoices).HasForeignKey(si => si.CustomerId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(si => si.Warehouse).WithMany().HasForeignKey(si => si.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(si => si.JournalEntry).WithMany().HasForeignKey(si => si.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(si => si.CreatedByUser).WithMany().HasForeignKey(si => si.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(si => si.PostedByUser).WithMany().HasForeignKey(si => si.PostedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasMany(si => si.Lines).WithOne(l => l.SalesInvoice).HasForeignKey(l => l.SalesInvoiceId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<SalesInvoiceLine>(e => {
        e.HasKey(l => l.Id);
        e.Property(l => l.Quantity).HasPrecision(18, 4);
        e.Property(l => l.UnitPrice).HasPrecision(18, 4);
        e.Property(l => l.UnitCostAtSale).HasPrecision(18, 4);
        e.Property(l => l.TotalPrice).HasPrecision(18, 4);
        e.Property(l => l.Notes).HasMaxLength(300);
        e.HasOne(l => l.Product).WithMany().HasForeignKey(l => l.ProductId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<SalesReturn>(e => {
        e.HasKey(sr => sr.Id);
        e.HasIndex(sr => sr.ReturnNumber).IsUnique();
        e.Property(sr => sr.ReturnNumber).IsRequired().HasMaxLength(50);
        e.Property(sr => sr.Status).IsRequired();
        e.Property(sr => sr.TotalAmount).HasPrecision(18, 4);
        e.Property(sr => sr.Notes).HasMaxLength(500);
        e.HasOne(sr => sr.Company).WithMany().HasForeignKey(sr => sr.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(sr => sr.Branch).WithMany().HasForeignKey(sr => sr.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(sr => sr.OriginalInvoice).WithMany().HasForeignKey(sr => sr.OriginalInvoiceId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(sr => sr.Customer).WithMany(c => c.SalesReturns).HasForeignKey(sr => sr.CustomerId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(sr => sr.Warehouse).WithMany().HasForeignKey(sr => sr.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(sr => sr.JournalEntry).WithMany().HasForeignKey(sr => sr.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(sr => sr.CreatedByUser).WithMany().HasForeignKey(sr => sr.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(sr => sr.PostedByUser).WithMany().HasForeignKey(sr => sr.PostedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasMany(sr => sr.Lines).WithOne(l => l.SalesReturn).HasForeignKey(l => l.SalesReturnId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<SalesReturnLine>(e => {
        e.HasKey(l => l.Id);
        e.Property(l => l.Quantity).HasPrecision(18, 4);
        e.Property(l => l.RestockUnitCost).HasPrecision(18, 4);
        e.Property(l => l.TotalPrice).HasPrecision(18, 4);
        e.Property(l => l.Notes).HasMaxLength(300);
        e.HasOne(l => l.Product).WithMany().HasForeignKey(l => l.ProductId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(l => l.OriginalInvoiceLine).WithMany().HasForeignKey(l => l.OriginalInvoiceLineId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<PurchaseInvoice>(e => {
        e.HasKey(pi => pi.Id);
        e.HasIndex(pi => pi.InvoiceNumber).IsUnique();
        e.Property(pi => pi.InvoiceNumber).IsRequired().HasMaxLength(50);
        e.Property(pi => pi.Status).IsRequired();
        e.Property(pi => pi.SubTotal).HasPrecision(18, 4);
        e.Property(pi => pi.TaxAmount).HasPrecision(18, 4);
        e.Property(pi => pi.AdditionalCosts).HasPrecision(18, 4);
        e.Property(pi => pi.TotalAmount).HasPrecision(18, 4);
        e.Property(pi => pi.Notes).HasMaxLength(500);
        e.HasOne(pi => pi.Company).WithMany().HasForeignKey(pi => pi.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(pi => pi.Branch).WithMany().HasForeignKey(pi => pi.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(pi => pi.Supplier).WithMany(s => s.PurchaseInvoices).HasForeignKey(pi => pi.SupplierId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(pi => pi.Warehouse).WithMany().HasForeignKey(pi => pi.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(pi => pi.JournalEntry).WithMany().HasForeignKey(pi => pi.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(pi => pi.CreatedByUser).WithMany().HasForeignKey(pi => pi.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(pi => pi.PostedByUser).WithMany().HasForeignKey(pi => pi.PostedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasMany(pi => pi.Lines).WithOne(l => l.PurchaseInvoice).HasForeignKey(l => l.PurchaseInvoiceId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<PurchaseInvoiceLine>(e => {
        e.HasKey(l => l.Id);
        e.Property(l => l.Quantity).HasPrecision(18, 4);
        e.Property(l => l.DirectUnitPrice).HasPrecision(18, 4);
        e.Property(l => l.AllocatedAdditionalCost).HasPrecision(18, 4);
        e.Property(l => l.EffectiveUnitCost).HasPrecision(18, 4);
        e.Property(l => l.TotalPrice).HasPrecision(18, 4);
        e.Property(l => l.Notes).HasMaxLength(300);
        e.HasOne(l => l.Product).WithMany().HasForeignKey(l => l.ProductId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<PurchaseReturn>(e => {
        e.HasKey(pr => pr.Id);
        e.HasIndex(pr => pr.ReturnNumber).IsUnique();
        e.Property(pr => pr.ReturnNumber).IsRequired().HasMaxLength(50);
        e.Property(pr => pr.Status).IsRequired();
        e.Property(pr => pr.TotalAmount).HasPrecision(18, 4);
        e.Property(pr => pr.Notes).HasMaxLength(500);
        e.HasOne(pr => pr.Company).WithMany().HasForeignKey(pr => pr.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(pr => pr.Branch).WithMany().HasForeignKey(pr => pr.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(pr => pr.OriginalInvoice).WithMany().HasForeignKey(pr => pr.OriginalInvoiceId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(pr => pr.Supplier).WithMany(s => s.PurchaseReturns).HasForeignKey(pr => pr.SupplierId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(pr => pr.Warehouse).WithMany().HasForeignKey(pr => pr.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(pr => pr.JournalEntry).WithMany().HasForeignKey(pr => pr.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(pr => pr.CreatedByUser).WithMany().HasForeignKey(pr => pr.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(pr => pr.PostedByUser).WithMany().HasForeignKey(pr => pr.PostedByUserId).OnDelete(DeleteBehavior.SetNull);
        e.HasMany(pr => pr.Lines).WithOne(l => l.PurchaseReturn).HasForeignKey(l => l.PurchaseReturnId).OnDelete(DeleteBehavior.Cascade);
        });
modelBuilder.Entity<PurchaseReturnLine>(e => {
        e.HasKey(l => l.Id);
        e.Property(l => l.Quantity).HasPrecision(18, 4);
        e.Property(l => l.UnitCost).HasPrecision(18, 4);
        e.Property(l => l.TotalPrice).HasPrecision(18, 4);
        e.Property(l => l.Notes).HasMaxLength(300);
        e.HasOne(l => l.Product).WithMany().HasForeignKey(l => l.ProductId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(l => l.OriginalInvoiceLine).WithMany().HasForeignKey(l => l.OriginalInvoiceLineId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<Treasury>(e => {
        e.HasKey(t => t.Id);
        e.HasIndex(t => new { t.CompanyId, t.Code }).IsUnique();
        e.Property(t => t.Code).IsRequired().HasMaxLength(50);
        e.Property(t => t.Name).IsRequired().HasMaxLength(200);
        e.Property(t => t.Type).IsRequired();
        e.Property(t => t.Balance).HasPrecision(18, 4).HasDefaultValue(0m);
        e.Property(t => t.Currency).IsRequired().HasMaxLength(10);
        e.Property(t => t.IsActive).HasDefaultValue(true);
        e.HasOne(t => t.Company).WithMany(co => co.Treasuries).HasForeignKey(t => t.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(t => t.Branch).WithMany().HasForeignKey(t => t.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(t => t.Account).WithMany().HasForeignKey(t => t.AccountId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<CashVoucher>(e => {
        e.HasKey(cv => cv.Id);
        e.HasIndex(cv => cv.VoucherNumber).IsUnique();
        e.Property(cv => cv.VoucherNumber).IsRequired().HasMaxLength(50);
        e.Property(cv => cv.VoucherType).IsRequired();
        e.Property(cv => cv.PartyType).IsRequired();
        e.Property(cv => cv.Amount).HasPrecision(18, 4);
        e.Property(cv => cv.Description).HasMaxLength(500);
        e.Property(cv => cv.Status).IsRequired();
        e.HasOne(cv => cv.Company).WithMany().HasForeignKey(cv => cv.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(cv => cv.Branch).WithMany().HasForeignKey(cv => cv.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(cv => cv.Treasury).WithMany(t => t.CashVouchers).HasForeignKey(cv => cv.TreasuryId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(cv => cv.TargetAccount).WithMany().HasForeignKey(cv => cv.TargetAccountId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(cv => cv.JournalEntry).WithMany().HasForeignKey(cv => cv.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(cv => cv.CreatedByUser).WithMany().HasForeignKey(cv => cv.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<TransferVoucher>(e => {
        e.HasKey(tv => tv.Id);
        e.HasIndex(tv => tv.TransferNumber).IsUnique();
        e.Property(tv => tv.TransferNumber).IsRequired().HasMaxLength(50);
        e.Property(tv => tv.Amount).HasPrecision(18, 4);
        e.Property(tv => tv.Reference).HasMaxLength(500);
        e.Property(tv => tv.Status).IsRequired();
        e.HasOne(tv => tv.Company).WithMany().HasForeignKey(tv => tv.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(tv => tv.Branch).WithMany().HasForeignKey(tv => tv.BranchId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(tv => tv.FromTreasury).WithMany(t => t.FromTransfers).HasForeignKey(tv => tv.FromTreasuryId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(tv => tv.ToTreasury).WithMany(t => t.ToTransfers).HasForeignKey(tv => tv.ToTreasuryId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(tv => tv.JournalEntry).WithMany().HasForeignKey(tv => tv.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(tv => tv.CreatedByUser).WithMany().HasForeignKey(tv => tv.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<AssetCategory>(e => {
        e.HasKey(ac => ac.Id);
        e.HasIndex(ac => new { ac.CompanyId, ac.Code }).IsUnique();
        e.Property(ac => ac.Code).IsRequired().HasMaxLength(50);
        e.Property(ac => ac.Name).IsRequired().HasMaxLength(200);
        e.Property(ac => ac.IsActive).HasDefaultValue(true);
        e.HasOne(ac => ac.Company).WithMany(co => co.AssetCategories).HasForeignKey(ac => ac.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(ac => ac.AssetAccount).WithMany().HasForeignKey(ac => ac.AssetAccountId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(ac => ac.AccumulatedDepreciationAccount).WithMany().HasForeignKey(ac => ac.AccumulatedDepreciationAccountId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(ac => ac.DepreciationExpenseAccount).WithMany().HasForeignKey(ac => ac.DepreciationExpenseAccountId).OnDelete(DeleteBehavior.Restrict);
        });
modelBuilder.Entity<FixedAsset>(e => {
        e.HasKey(fa => fa.Id);
        e.HasIndex(fa => new { fa.CompanyId, fa.AssetCode }).IsUnique();
        e.Property(fa => fa.AssetCode).IsRequired().HasMaxLength(50);
        e.Property(fa => fa.Name).IsRequired().HasMaxLength(300);
        e.Property(fa => fa.PurchaseCost).HasPrecision(18, 4);
        e.Property(fa => fa.SalvageValue).HasPrecision(18, 4);
        e.Property(fa => fa.CurrentBookValue).HasPrecision(18, 4);
        e.Property(fa => fa.AccumulatedDepreciation).HasPrecision(18, 4);
        e.Property(fa => fa.Status).IsRequired();
        e.HasOne(fa => fa.Company).WithMany().HasForeignKey(fa => fa.CompanyId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(fa => fa.Category).WithMany(ac => ac.FixedAssets).HasForeignKey(fa => fa.CategoryId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(fa => fa.CostCenter).WithMany().HasForeignKey(fa => fa.CostCenterId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(fa => fa.JournalEntry).WithMany().HasForeignKey(fa => fa.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<DepreciationEntry>(e => {
        e.HasKey(de => de.Id);
        e.Property(de => de.DepreciationAmount).HasPrecision(18, 4);
        e.Property(de => de.BookValueAfter).HasPrecision(18, 4);
        e.HasOne(de => de.Asset).WithMany(fa => fa.DepreciationEntries).HasForeignKey(de => de.AssetId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(de => de.JournalEntry).WithMany().HasForeignKey(de => de.JournalEntryId).OnDelete(DeleteBehavior.SetNull);
        });
modelBuilder.Entity<AuditLog>(e => {
        e.HasKey(al => al.Id);
        e.Property(al => al.Action).IsRequired().HasMaxLength(50);
        e.Property(al => al.EntityName).IsRequired().HasMaxLength(100);
        e.Property(al => al.EntityId).HasMaxLength(50);
        e.Property(al => al.Details).HasMaxLength(4000);
        e.Property(al => al.IPAddress).HasMaxLength(50);
        e.HasOne(al => al.Company).WithMany().HasForeignKey(al => al.CompanyId).OnDelete(DeleteBehavior.SetNull);
        e.HasOne(al => al.User).WithMany().HasForeignKey(al => al.UserId).OnDelete(DeleteBehavior.SetNull);
        e.HasIndex(al => al.Timestamp);
        e.HasIndex(al => new { al.EntityName, al.EntityId });
        e.HasIndex(al => al.UserId);
        });
    }
}
