using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERP.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAvgCostToProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "destination_warehouse_id",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "source_movement_id",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "avg_cost",
                table: "products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "barcode",
                table: "products",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "row_version",
                table: "products",
                type: "bytea",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<Guid>(
                name: "purchase_discount_account_id",
                table: "accounting_defaults",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "sales_discount_account_id",
                table: "accounting_defaults",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "vat_payable_account_id",
                table: "accounting_defaults",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "vat_receivable_account_id",
                table: "accounting_defaults",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "stock_transfers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    branch_id = table.Column<Guid>(type: "uuid", nullable: true),
                    transfer_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    transfer_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    source_warehouse_id = table.Column<Guid>(type: "uuid", nullable: false),
                    destination_warehouse_id = table.Column<Guid>(type: "uuid", nullable: false),
                    journal_entry_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    posted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stock_transfers", x => x.id);
                    table.ForeignKey(
                        name: "fk_stock_transfers_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_stock_transfers_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_stock_transfers_journal_entries_journal_entry_id",
                        column: x => x.journal_entry_id,
                        principalTable: "journal_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_stock_transfers_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_stock_transfers_users_posted_by_user_id",
                        column: x => x.posted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_stock_transfers_warehouses_destination_warehouse_id",
                        column: x => x.destination_warehouse_id,
                        principalTable: "warehouses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_stock_transfers_warehouses_source_warehouse_id",
                        column: x => x.source_warehouse_id,
                        principalTable: "warehouses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_transfer_lines",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_transfer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    unit_cost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    notes = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stock_transfer_lines", x => x.id);
                    table.ForeignKey(
                        name: "fk_stock_transfer_lines_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_stock_transfer_lines_stock_transfers_stock_transfer_id",
                        column: x => x.stock_transfer_id,
                        principalTable: "stock_transfers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_stock_movements_destination_warehouse_id",
                table: "stock_movements",
                column: "destination_warehouse_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_movements_source_movement_id",
                table: "stock_movements",
                column: "source_movement_id");

            migrationBuilder.CreateIndex(
                name: "ix_products_company_id_barcode",
                table: "products",
                columns: new[] { "company_id", "barcode" });

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_purchase_discount_account_id",
                table: "accounting_defaults",
                column: "purchase_discount_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_sales_discount_account_id",
                table: "accounting_defaults",
                column: "sales_discount_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_vat_payable_account_id",
                table: "accounting_defaults",
                column: "vat_payable_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_defaults_vat_receivable_account_id",
                table: "accounting_defaults",
                column: "vat_receivable_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfer_lines_product_id",
                table: "stock_transfer_lines",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfer_lines_stock_transfer_id",
                table: "stock_transfer_lines",
                column: "stock_transfer_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_branch_id",
                table: "stock_transfers",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_company_id",
                table: "stock_transfers",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_created_by_user_id",
                table: "stock_transfers",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_destination_warehouse_id",
                table: "stock_transfers",
                column: "destination_warehouse_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_journal_entry_id",
                table: "stock_transfers",
                column: "journal_entry_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_posted_by_user_id",
                table: "stock_transfers",
                column: "posted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_source_warehouse_id",
                table: "stock_transfers",
                column: "source_warehouse_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_transfers_transfer_number",
                table: "stock_transfers",
                column: "transfer_number",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_accounting_defaults_accounts_purchase_discount_account_id",
                table: "accounting_defaults",
                column: "purchase_discount_account_id",
                principalTable: "accounts",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_accounting_defaults_accounts_sales_discount_account_id",
                table: "accounting_defaults",
                column: "sales_discount_account_id",
                principalTable: "accounts",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_accounting_defaults_accounts_vat_payable_account_id",
                table: "accounting_defaults",
                column: "vat_payable_account_id",
                principalTable: "accounts",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_accounting_defaults_accounts_vat_receivable_account_id",
                table: "accounting_defaults",
                column: "vat_receivable_account_id",
                principalTable: "accounts",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_stock_movements_source_movement_id",
                table: "stock_movements",
                column: "source_movement_id",
                principalTable: "stock_movements",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_warehouses_destination_warehouse_id",
                table: "stock_movements",
                column: "destination_warehouse_id",
                principalTable: "warehouses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_accounting_defaults_accounts_purchase_discount_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropForeignKey(
                name: "fk_accounting_defaults_accounts_sales_discount_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropForeignKey(
                name: "fk_accounting_defaults_accounts_vat_payable_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropForeignKey(
                name: "fk_accounting_defaults_accounts_vat_receivable_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_stock_movements_source_movement_id",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_warehouses_destination_warehouse_id",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "stock_transfer_lines");

            migrationBuilder.DropTable(
                name: "stock_transfers");

            migrationBuilder.DropIndex(
                name: "ix_stock_movements_destination_warehouse_id",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "ix_stock_movements_source_movement_id",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "ix_products_company_id_barcode",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_accounting_defaults_purchase_discount_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropIndex(
                name: "ix_accounting_defaults_sales_discount_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropIndex(
                name: "ix_accounting_defaults_vat_payable_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropIndex(
                name: "ix_accounting_defaults_vat_receivable_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropColumn(
                name: "destination_warehouse_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "source_movement_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "avg_cost",
                table: "products");

            migrationBuilder.DropColumn(
                name: "barcode",
                table: "products");

            migrationBuilder.DropColumn(
                name: "row_version",
                table: "products");

            migrationBuilder.DropColumn(
                name: "purchase_discount_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropColumn(
                name: "sales_discount_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropColumn(
                name: "vat_payable_account_id",
                table: "accounting_defaults");

            migrationBuilder.DropColumn(
                name: "vat_receivable_account_id",
                table: "accounting_defaults");
        }
    }
}
