using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERP.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenancyAndPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_warehouses_code",
                table: "warehouses");

            migrationBuilder.DropIndex(
                name: "ix_users_email",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_treasuries_code",
                table: "treasuries");

            migrationBuilder.DropIndex(
                name: "ix_suppliers_code",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "ix_products_sku",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_fixed_assets_asset_code",
                table: "fixed_assets");

            migrationBuilder.DropIndex(
                name: "ix_customers_code",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_categories_code",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "ix_asset_categories_code",
                table: "asset_categories");

            migrationBuilder.DropIndex(
                name: "ix_accounts_code",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "email",
                table: "users");

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "warehouses",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "warehouses",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AlterColumn<string>(
                name: "role",
                table: "users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "users",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "permissions_json",
                table: "users",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "treasuries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "treasuries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AlterColumn<string>(
                name: "reference",
                table: "transfer_vouchers",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "transfer_vouchers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "transfer_vouchers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "transfer_vouchers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "account_id",
                table: "suppliers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "suppliers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "suppliers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "stock_movements",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "sales_returns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "sales_returns",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "sales_returns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "posted_by_user_id",
                table: "sales_returns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "original_invoice_line_id",
                table: "sales_return_lines",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "sales_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "sales_invoices",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "sales_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "posted_by_user_id",
                table: "sales_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "purchase_returns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "purchase_returns",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "purchase_returns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "posted_by_user_id",
                table: "purchase_returns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "original_invoice_line_id",
                table: "purchase_return_lines",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "purchase_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "purchase_invoices",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "purchase_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "posted_by_user_id",
                table: "purchase_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "unit_of_measure",
                table: "products",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<Guid>(
                name: "base_unit_id",
                table: "products",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "products",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "cost_center_id",
                table: "journal_entry_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "customer_id",
                table: "journal_entry_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "supplier_id",
                table: "journal_entry_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "journal_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "journal_entries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "fiscal_year_id",
                table: "journal_entries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "source_document_id",
                table: "journal_entries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source_document_type",
                table: "journal_entries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "acquisition_date",
                table: "fixed_assets",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "fixed_assets",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "cost_center_id",
                table: "fixed_assets",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "fixed_assets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "monthly_depreciation",
                table: "fixed_assets",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "useful_life_months",
                table: "fixed_assets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "is_posted",
                table: "depreciation_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "period_end",
                table: "depreciation_entries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "period_start",
                table: "depreciation_entries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "account_id",
                table: "customers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "customers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "customers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "categories",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AlterColumn<string>(
                name: "description",
                table: "cash_vouchers",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                table: "cash_vouchers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "cash_vouchers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "cash_vouchers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "audit_logs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "new_value",
                table: "audit_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "old_value",
                table: "audit_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reason",
                table: "audit_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "asset_categories",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "company_id",
                table: "accounts",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "companies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    legal_name = table.Column<string>(type: "text", nullable: true),
                    tax_number = table.Column<string>(type: "text", nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    default_currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "LYD"),
                    country = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_companies", x => x.id);
                });

            // Seed default company immediately so all FK constraints referencing companies(id) resolve
            // All company_id columns default to this GUID
            migrationBuilder.Sql(@"
                INSERT INTO companies (id, name, legal_name, default_currency, country, is_active, created_at)
                VALUES (
                    '00000000-0000-0000-0000-000000000000',
                    N'الشركة الرئيسية',
                    'Main Company LLC',
                    'LYD',
                    'Libya',
                    true,
                    NOW()
                ) ON CONFLICT (id) DO NOTHING;
            ");

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    module = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_permissions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "units",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_units", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "accounting_defaults",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_revenue_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    sales_cash_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    sales_returns_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    purchases_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    inventory_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cogs_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    inventory_gain_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    inventory_loss_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    default_customer_ar_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    default_supplier_ap_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_accounting_defaults", x => x.id);
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_cogs_account_id",
                        column: x => x.cogs_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_default_customer_ar_account_id",
                        column: x => x.default_customer_ar_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_default_supplier_ap_account_id",
                        column: x => x.default_supplier_ap_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_inventory_account_id",
                        column: x => x.inventory_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_inventory_gain_account_id",
                        column: x => x.inventory_gain_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_inventory_loss_account_id",
                        column: x => x.inventory_loss_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_purchases_account_id",
                        column: x => x.purchases_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_sales_cash_account_id",
                        column: x => x.sales_cash_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_sales_returns_account_id",
                        column: x => x.sales_returns_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_accounts_sales_revenue_account_id",
                        column: x => x.sales_revenue_account_id,
                        principalTable: "accounts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_accounting_defaults_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "branches",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    address = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    manager = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_branches", x => x.id);
                    table.ForeignKey(
                        name: "fk_branches_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cost_centers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cost_centers", x => x.id);
                    table.ForeignKey(
                        name: "fk_cost_centers_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "fiscal_years",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_closed = table.Column<bool>(type: "boolean", nullable: false),
                    closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fiscal_years", x => x.id);
                    table.ForeignKey(
                        name: "fk_fiscal_years_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_fiscal_years_users_closed_by_user_id",
                        column: x => x.closed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_system_role = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roles", x => x.id);
                    table.ForeignKey(
                        name: "fk_roles_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "item_unit_conversions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    base_unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    conversion_factor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_item_unit_conversions", x => x.id);
                    table.ForeignKey(
                        name: "fk_item_unit_conversions_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_item_unit_conversions_units_base_unit_id",
                        column: x => x.base_unit_id,
                        principalTable: "units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_item_unit_conversions_units_source_unit_id",
                        column: x => x.source_unit_id,
                        principalTable: "units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    permission_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_role_permissions", x => x.id);
                    table.ForeignKey(
                        name: "fk_role_permissions_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_role_permissions_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_roles", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_roles_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_roles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_warehouses_branch_id",
                table: "warehouses",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_warehouses_company_id_code",
                table: "warehouses",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_branch_id",
                table: "users",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_company_id",
                table: "users",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_treasuries_branch_id",
                table: "treasuries",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_treasuries_company_id_code",
                table: "treasuries",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_transfer_vouchers_branch_id",
                table: "transfer_vouchers",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_transfer_vouchers_company_id",
                table: "transfer_vouchers",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_suppliers_account_id",
                table: "suppliers",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "ix_suppliers_branch_id",
                table: "suppliers",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_suppliers_company_id_code",
                table: "suppliers",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_stock_movements_company_id",
                table: "stock_movements",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_returns_branch_id",
                table: "sales_returns",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_returns_company_id",
                table: "sales_returns",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_returns_created_by_user_id",
                table: "sales_returns",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_returns_posted_by_user_id",
                table: "sales_returns",
                column: "posted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoices_branch_id",
                table: "sales_invoices",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoices_company_id",
                table: "sales_invoices",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoices_created_by_user_id",
                table: "sales_invoices",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_sales_invoices_posted_by_user_id",
                table: "sales_invoices",
                column: "posted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_returns_branch_id",
                table: "purchase_returns",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_returns_company_id",
                table: "purchase_returns",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_returns_created_by_user_id",
                table: "purchase_returns",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_returns_posted_by_user_id",
                table: "purchase_returns",
                column: "posted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoices_branch_id",
                table: "purchase_invoices",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoices_company_id",
                table: "purchase_invoices",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoices_created_by_user_id",
                table: "purchase_invoices",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoices_posted_by_user_id",
                table: "purchase_invoices",
                column: "posted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_products_base_unit_id",
                table: "products",
                column: "base_unit_id");

            migrationBuilder.CreateIndex(
                name: "ix_products_company_id_sku",
                table: "products",
                columns: new[] { "company_id", "sku" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_journal_entry_lines_cost_center_id",
                table: "journal_entry_lines",
                column: "cost_center_id");

            migrationBuilder.CreateIndex(
                name: "ix_journal_entry_lines_customer_id",
                table: "journal_entry_lines",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_journal_entry_lines_supplier_id",
                table: "journal_entry_lines",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "ix_journal_entries_branch_id",
                table: "journal_entries",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_journal_entries_company_id",
                table: "journal_entries",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_journal_entries_fiscal_year_id",
                table: "journal_entries",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "ix_fixed_assets_company_id_asset_code",
                table: "fixed_assets",
                columns: new[] { "company_id", "asset_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_fixed_assets_cost_center_id",
                table: "fixed_assets",
                column: "cost_center_id");

            migrationBuilder.CreateIndex(
                name: "ix_customers_account_id",
                table: "customers",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "ix_customers_branch_id",
                table: "customers",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_customers_company_id_code",
                table: "customers",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_categories_company_id_code",
                table: "categories",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cash_vouchers_branch_id",
                table: "cash_vouchers",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_cash_vouchers_company_id",
                table: "cash_vouchers",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_company_id",
                table: "audit_logs",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_categories_company_id_code",
                table: "asset_categories",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_accounts_company_id_code",
                table: "accounts",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_cogs_account_id",
                table: "accounting_defaults",
                column: "cogs_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_company_id",
                table: "accounting_defaults",
                column: "company_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_default_customer_ar_account_id",
                table: "accounting_defaults",
                column: "default_customer_ar_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_default_supplier_ap_account_id",
                table: "accounting_defaults",
                column: "default_supplier_ap_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_inventory_account_id",
                table: "accounting_defaults",
                column: "inventory_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_inventory_gain_account_id",
                table: "accounting_defaults",
                column: "inventory_gain_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_inventory_loss_account_id",
                table: "accounting_defaults",
                column: "inventory_loss_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_purchases_account_id",
                table: "accounting_defaults",
                column: "purchases_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_sales_cash_account_id",
                table: "accounting_defaults",
                column: "sales_cash_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_sales_returns_account_id",
                table: "accounting_defaults",
                column: "sales_returns_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_sales_revenue_account_id",
                table: "accounting_defaults",
                column: "sales_revenue_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_branches_company_id_code",
                table: "branches",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cost_centers_company_id_code",
                table: "cost_centers",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_fiscal_years_closed_by_user_id",
                table: "fiscal_years",
                column: "closed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_fiscal_years_company_id_name",
                table: "fiscal_years",
                columns: new[] { "company_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_item_unit_conversions_base_unit_id",
                table: "item_unit_conversions",
                column: "base_unit_id");

            migrationBuilder.CreateIndex(
                name: "ix_item_unit_conversions_product_id_source_unit_id",
                table: "item_unit_conversions",
                columns: new[] { "product_id", "source_unit_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_item_unit_conversions_source_unit_id",
                table: "item_unit_conversions",
                column: "source_unit_id");

            migrationBuilder.CreateIndex(
                name: "ix_permissions_name",
                table: "permissions",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_role_permissions_permission_id",
                table: "role_permissions",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "ix_role_permissions_role_id_permission_id",
                table: "role_permissions",
                columns: new[] { "role_id", "permission_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_roles_company_id_name",
                table: "roles",
                columns: new[] { "company_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_units_name",
                table: "units",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_roles_role_id",
                table: "user_roles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_roles_user_id_role_id",
                table: "user_roles",
                columns: new[] { "user_id", "role_id" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_accounts_companies_company_id",
                table: "accounts",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_asset_categories_companies_company_id",
                table: "asset_categories",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_audit_logs_companies_company_id",
                table: "audit_logs",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_cash_vouchers_branches_branch_id",
                table: "cash_vouchers",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_cash_vouchers_companies_company_id",
                table: "cash_vouchers",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_categories_companies_company_id",
                table: "categories",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_customers_accounts_account_id",
                table: "customers",
                column: "account_id",
                principalTable: "accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_customers_branches_branch_id",
                table: "customers",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_customers_companies_company_id",
                table: "customers",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_fixed_assets_companies_company_id",
                table: "fixed_assets",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_fixed_assets_cost_centers_cost_center_id",
                table: "fixed_assets",
                column: "cost_center_id",
                principalTable: "cost_centers",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_journal_entries_branches_branch_id",
                table: "journal_entries",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_journal_entries_companies_company_id",
                table: "journal_entries",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_journal_entries_fiscal_years_fiscal_year_id",
                table: "journal_entries",
                column: "fiscal_year_id",
                principalTable: "fiscal_years",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_journal_entry_lines_cost_centers_cost_center_id",
                table: "journal_entry_lines",
                column: "cost_center_id",
                principalTable: "cost_centers",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_journal_entry_lines_customers_customer_id",
                table: "journal_entry_lines",
                column: "customer_id",
                principalTable: "customers",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_journal_entry_lines_suppliers_supplier_id",
                table: "journal_entry_lines",
                column: "supplier_id",
                principalTable: "suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_products_companies_company_id",
                table: "products",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_products_units_base_unit_id",
                table: "products",
                column: "base_unit_id",
                principalTable: "units",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_invoices_branches_branch_id",
                table: "purchase_invoices",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_invoices_companies_company_id",
                table: "purchase_invoices",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_invoices_users_created_by_user_id",
                table: "purchase_invoices",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_invoices_users_posted_by_user_id",
                table: "purchase_invoices",
                column: "posted_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_returns_branches_branch_id",
                table: "purchase_returns",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_returns_companies_company_id",
                table: "purchase_returns",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_returns_users_created_by_user_id",
                table: "purchase_returns",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_purchase_returns_users_posted_by_user_id",
                table: "purchase_returns",
                column: "posted_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_invoices_branches_branch_id",
                table: "sales_invoices",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_invoices_companies_company_id",
                table: "sales_invoices",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_invoices_users_created_by_user_id",
                table: "sales_invoices",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_invoices_users_posted_by_user_id",
                table: "sales_invoices",
                column: "posted_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_returns_branches_branch_id",
                table: "sales_returns",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_returns_companies_company_id",
                table: "sales_returns",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_returns_users_created_by_user_id",
                table: "sales_returns",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_sales_returns_users_posted_by_user_id",
                table: "sales_returns",
                column: "posted_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_companies_company_id",
                table: "stock_movements",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_suppliers_accounts_account_id",
                table: "suppliers",
                column: "account_id",
                principalTable: "accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_suppliers_branches_branch_id",
                table: "suppliers",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_suppliers_companies_company_id",
                table: "suppliers",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_transfer_vouchers_branches_branch_id",
                table: "transfer_vouchers",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_transfer_vouchers_companies_company_id",
                table: "transfer_vouchers",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_treasuries_branches_branch_id",
                table: "treasuries",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_treasuries_companies_company_id",
                table: "treasuries",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_users_branches_branch_id",
                table: "users",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_users_companies_company_id",
                table: "users",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_warehouses_branches_branch_id",
                table: "warehouses",
                column: "branch_id",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_warehouses_companies_company_id",
                table: "warehouses",
                column: "company_id",
                principalTable: "companies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_accounts_companies_company_id",
                table: "accounts");

            migrationBuilder.DropForeignKey(
                name: "fk_asset_categories_companies_company_id",
                table: "asset_categories");

            migrationBuilder.DropForeignKey(
                name: "fk_audit_logs_companies_company_id",
                table: "audit_logs");

            migrationBuilder.DropForeignKey(
                name: "fk_cash_vouchers_branches_branch_id",
                table: "cash_vouchers");

            migrationBuilder.DropForeignKey(
                name: "fk_cash_vouchers_companies_company_id",
                table: "cash_vouchers");

            migrationBuilder.DropForeignKey(
                name: "fk_categories_companies_company_id",
                table: "categories");

            migrationBuilder.DropForeignKey(
                name: "fk_customers_accounts_account_id",
                table: "customers");

            migrationBuilder.DropForeignKey(
                name: "fk_customers_branches_branch_id",
                table: "customers");

            migrationBuilder.DropForeignKey(
                name: "fk_customers_companies_company_id",
                table: "customers");

            migrationBuilder.DropForeignKey(
                name: "fk_fixed_assets_companies_company_id",
                table: "fixed_assets");

            migrationBuilder.DropForeignKey(
                name: "fk_fixed_assets_cost_centers_cost_center_id",
                table: "fixed_assets");

            migrationBuilder.DropForeignKey(
                name: "fk_journal_entries_branches_branch_id",
                table: "journal_entries");

            migrationBuilder.DropForeignKey(
                name: "fk_journal_entries_companies_company_id",
                table: "journal_entries");

            migrationBuilder.DropForeignKey(
                name: "fk_journal_entries_fiscal_years_fiscal_year_id",
                table: "journal_entries");

            migrationBuilder.DropForeignKey(
                name: "fk_journal_entry_lines_cost_centers_cost_center_id",
                table: "journal_entry_lines");

            migrationBuilder.DropForeignKey(
                name: "fk_journal_entry_lines_customers_customer_id",
                table: "journal_entry_lines");

            migrationBuilder.DropForeignKey(
                name: "fk_journal_entry_lines_suppliers_supplier_id",
                table: "journal_entry_lines");

            migrationBuilder.DropForeignKey(
                name: "fk_products_companies_company_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "fk_products_units_base_unit_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_invoices_branches_branch_id",
                table: "purchase_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_invoices_companies_company_id",
                table: "purchase_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_invoices_users_created_by_user_id",
                table: "purchase_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_invoices_users_posted_by_user_id",
                table: "purchase_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_returns_branches_branch_id",
                table: "purchase_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_returns_companies_company_id",
                table: "purchase_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_returns_users_created_by_user_id",
                table: "purchase_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_purchase_returns_users_posted_by_user_id",
                table: "purchase_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_invoices_branches_branch_id",
                table: "sales_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_invoices_companies_company_id",
                table: "sales_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_invoices_users_created_by_user_id",
                table: "sales_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_invoices_users_posted_by_user_id",
                table: "sales_invoices");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_returns_branches_branch_id",
                table: "sales_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_returns_companies_company_id",
                table: "sales_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_returns_users_created_by_user_id",
                table: "sales_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_sales_returns_users_posted_by_user_id",
                table: "sales_returns");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_companies_company_id",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "fk_suppliers_accounts_account_id",
                table: "suppliers");

            migrationBuilder.DropForeignKey(
                name: "fk_suppliers_branches_branch_id",
                table: "suppliers");

            migrationBuilder.DropForeignKey(
                name: "fk_suppliers_companies_company_id",
                table: "suppliers");

            migrationBuilder.DropForeignKey(
                name: "fk_transfer_vouchers_branches_branch_id",
                table: "transfer_vouchers");

            migrationBuilder.DropForeignKey(
                name: "fk_transfer_vouchers_companies_company_id",
                table: "transfer_vouchers");

            migrationBuilder.DropForeignKey(
                name: "fk_treasuries_branches_branch_id",
                table: "treasuries");

            migrationBuilder.DropForeignKey(
                name: "fk_treasuries_companies_company_id",
                table: "treasuries");

            migrationBuilder.DropForeignKey(
                name: "fk_users_branches_branch_id",
                table: "users");

            migrationBuilder.DropForeignKey(
                name: "fk_users_companies_company_id",
                table: "users");

            migrationBuilder.DropForeignKey(
                name: "fk_warehouses_branches_branch_id",
                table: "warehouses");

            migrationBuilder.DropForeignKey(
                name: "fk_warehouses_companies_company_id",
                table: "warehouses");

            migrationBuilder.DropTable(
                name: "accounting_defaults");

            migrationBuilder.DropTable(
                name: "branches");

            migrationBuilder.DropTable(
                name: "cost_centers");

            migrationBuilder.DropTable(
                name: "fiscal_years");

            migrationBuilder.DropTable(
                name: "item_unit_conversions");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "user_roles");

            migrationBuilder.DropTable(
                name: "units");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "companies");

            migrationBuilder.DropIndex(
                name: "ix_warehouses_branch_id",
                table: "warehouses");

            migrationBuilder.DropIndex(
                name: "ix_warehouses_company_id_code",
                table: "warehouses");

            migrationBuilder.DropIndex(
                name: "ix_users_branch_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_users_company_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_treasuries_branch_id",
                table: "treasuries");

            migrationBuilder.DropIndex(
                name: "ix_treasuries_company_id_code",
                table: "treasuries");

            migrationBuilder.DropIndex(
                name: "ix_transfer_vouchers_branch_id",
                table: "transfer_vouchers");

            migrationBuilder.DropIndex(
                name: "ix_transfer_vouchers_company_id",
                table: "transfer_vouchers");

            migrationBuilder.DropIndex(
                name: "ix_suppliers_account_id",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "ix_suppliers_branch_id",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "ix_suppliers_company_id_code",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "ix_stock_movements_company_id",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "ix_sales_returns_branch_id",
                table: "sales_returns");

            migrationBuilder.DropIndex(
                name: "ix_sales_returns_company_id",
                table: "sales_returns");

            migrationBuilder.DropIndex(
                name: "ix_sales_returns_created_by_user_id",
                table: "sales_returns");

            migrationBuilder.DropIndex(
                name: "ix_sales_returns_posted_by_user_id",
                table: "sales_returns");

            migrationBuilder.DropIndex(
                name: "ix_sales_invoices_branch_id",
                table: "sales_invoices");

            migrationBuilder.DropIndex(
                name: "ix_sales_invoices_company_id",
                table: "sales_invoices");

            migrationBuilder.DropIndex(
                name: "ix_sales_invoices_created_by_user_id",
                table: "sales_invoices");

            migrationBuilder.DropIndex(
                name: "ix_sales_invoices_posted_by_user_id",
                table: "sales_invoices");

            migrationBuilder.DropIndex(
                name: "ix_purchase_returns_branch_id",
                table: "purchase_returns");

            migrationBuilder.DropIndex(
                name: "ix_purchase_returns_company_id",
                table: "purchase_returns");

            migrationBuilder.DropIndex(
                name: "ix_purchase_returns_created_by_user_id",
                table: "purchase_returns");

            migrationBuilder.DropIndex(
                name: "ix_purchase_returns_posted_by_user_id",
                table: "purchase_returns");

            migrationBuilder.DropIndex(
                name: "ix_purchase_invoices_branch_id",
                table: "purchase_invoices");

            migrationBuilder.DropIndex(
                name: "ix_purchase_invoices_company_id",
                table: "purchase_invoices");

            migrationBuilder.DropIndex(
                name: "ix_purchase_invoices_created_by_user_id",
                table: "purchase_invoices");

            migrationBuilder.DropIndex(
                name: "ix_purchase_invoices_posted_by_user_id",
                table: "purchase_invoices");

            migrationBuilder.DropIndex(
                name: "ix_products_base_unit_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_products_company_id_sku",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_journal_entry_lines_cost_center_id",
                table: "journal_entry_lines");

            migrationBuilder.DropIndex(
                name: "ix_journal_entry_lines_customer_id",
                table: "journal_entry_lines");

            migrationBuilder.DropIndex(
                name: "ix_journal_entry_lines_supplier_id",
                table: "journal_entry_lines");

            migrationBuilder.DropIndex(
                name: "ix_journal_entries_branch_id",
                table: "journal_entries");

            migrationBuilder.DropIndex(
                name: "ix_journal_entries_company_id",
                table: "journal_entries");

            migrationBuilder.DropIndex(
                name: "ix_journal_entries_fiscal_year_id",
                table: "journal_entries");

            migrationBuilder.DropIndex(
                name: "ix_fixed_assets_company_id_asset_code",
                table: "fixed_assets");

            migrationBuilder.DropIndex(
                name: "ix_fixed_assets_cost_center_id",
                table: "fixed_assets");

            migrationBuilder.DropIndex(
                name: "ix_customers_account_id",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_customers_branch_id",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_customers_company_id_code",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_categories_company_id_code",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "ix_cash_vouchers_branch_id",
                table: "cash_vouchers");

            migrationBuilder.DropIndex(
                name: "ix_cash_vouchers_company_id",
                table: "cash_vouchers");

            migrationBuilder.DropIndex(
                name: "ix_audit_logs_company_id",
                table: "audit_logs");

            migrationBuilder.DropIndex(
                name: "ix_asset_categories_company_id_code",
                table: "asset_categories");

            migrationBuilder.DropIndex(
                name: "ix_accounts_company_id_code",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "warehouses");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "warehouses");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "permissions_json",
                table: "users");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "treasuries");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "treasuries");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "transfer_vouchers");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "transfer_vouchers");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "transfer_vouchers");

            migrationBuilder.DropColumn(
                name: "account_id",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "sales_returns");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "sales_returns");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "sales_returns");

            migrationBuilder.DropColumn(
                name: "posted_by_user_id",
                table: "sales_returns");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "posted_by_user_id",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "purchase_returns");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "purchase_returns");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "purchase_returns");

            migrationBuilder.DropColumn(
                name: "posted_by_user_id",
                table: "purchase_returns");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "purchase_invoices");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "purchase_invoices");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "purchase_invoices");

            migrationBuilder.DropColumn(
                name: "posted_by_user_id",
                table: "purchase_invoices");

            migrationBuilder.DropColumn(
                name: "base_unit_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "cost_center_id",
                table: "journal_entry_lines");

            migrationBuilder.DropColumn(
                name: "customer_id",
                table: "journal_entry_lines");

            migrationBuilder.DropColumn(
                name: "supplier_id",
                table: "journal_entry_lines");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "fiscal_year_id",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "source_document_id",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "source_document_type",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "acquisition_date",
                table: "fixed_assets");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "fixed_assets");

            migrationBuilder.DropColumn(
                name: "cost_center_id",
                table: "fixed_assets");

            migrationBuilder.DropColumn(
                name: "description",
                table: "fixed_assets");

            migrationBuilder.DropColumn(
                name: "monthly_depreciation",
                table: "fixed_assets");

            migrationBuilder.DropColumn(
                name: "useful_life_months",
                table: "fixed_assets");

            migrationBuilder.DropColumn(
                name: "is_posted",
                table: "depreciation_entries");

            migrationBuilder.DropColumn(
                name: "period_end",
                table: "depreciation_entries");

            migrationBuilder.DropColumn(
                name: "period_start",
                table: "depreciation_entries");

            migrationBuilder.DropColumn(
                name: "account_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "branch_id",
                table: "cash_vouchers");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "cash_vouchers");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "cash_vouchers");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "new_value",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "old_value",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "reason",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "asset_categories");

            migrationBuilder.DropColumn(
                name: "company_id",
                table: "accounts");

            migrationBuilder.AlterColumn<string>(
                name: "role",
                table: "users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "reference",
                table: "transfer_vouchers",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "original_invoice_line_id",
                table: "sales_return_lines",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "original_invoice_line_id",
                table: "purchase_return_lines",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "unit_of_measure",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "description",
                table: "cash_vouchers",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_warehouses_code",
                table: "warehouses",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_treasuries_code",
                table: "treasuries",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_suppliers_code",
                table: "suppliers",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_products_sku",
                table: "products",
                column: "sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_fixed_assets_asset_code",
                table: "fixed_assets",
                column: "asset_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customers_code",
                table: "customers",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_categories_code",
                table: "categories",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_asset_categories_code",
                table: "asset_categories",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_accounts_code",
                table: "accounts",
                column: "code",
                unique: true);
        }
    }
}
