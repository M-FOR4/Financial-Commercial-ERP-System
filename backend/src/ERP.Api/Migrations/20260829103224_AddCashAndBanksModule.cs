using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ERP.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCashAndBanksModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "treasuries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    balance = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false, defaultValue: 0m),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_treasuries", x => x.id);
                    table.ForeignKey(
                        name: "fk_treasuries_accounts_account_id",
                        column: x => x.account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cash_vouchers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    voucher_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    voucher_type = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    treasury_id = table.Column<Guid>(type: "uuid", nullable: false),
                    party_type = table.Column<int>(type: "integer", nullable: false),
                    party_id = table.Column<Guid>(type: "uuid", nullable: true),
                    target_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    journal_entry_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cash_vouchers", x => x.id);
                    table.ForeignKey(
                        name: "fk_cash_vouchers_accounts_target_account_id",
                        column: x => x.target_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_cash_vouchers_journal_entries_journal_entry_id",
                        column: x => x.journal_entry_id,
                        principalTable: "journal_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_cash_vouchers_treasuries_treasury_id",
                        column: x => x.treasury_id,
                        principalTable: "treasuries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_cash_vouchers_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "transfer_vouchers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    transfer_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    from_treasury_id = table.Column<Guid>(type: "uuid", nullable: false),
                    to_treasury_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    reference = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    journal_entry_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_transfer_vouchers", x => x.id);
                    table.ForeignKey(
                        name: "fk_transfer_vouchers_journal_entries_journal_entry_id",
                        column: x => x.journal_entry_id,
                        principalTable: "journal_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_transfer_vouchers_treasuries_from_treasury_id",
                        column: x => x.from_treasury_id,
                        principalTable: "treasuries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transfer_vouchers_treasuries_to_treasury_id",
                        column: x => x.to_treasury_id,
                        principalTable: "treasuries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transfer_vouchers_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_cash_vouchers_created_by_user_id",
                table: "cash_vouchers",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_cash_vouchers_journal_entry_id",
                table: "cash_vouchers",
                column: "journal_entry_id");

            migrationBuilder.CreateIndex(
                name: "ix_cash_vouchers_target_account_id",
                table: "cash_vouchers",
                column: "target_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_cash_vouchers_treasury_id",
                table: "cash_vouchers",
                column: "treasury_id");

            migrationBuilder.CreateIndex(
                name: "ix_cash_vouchers_voucher_number",
                table: "cash_vouchers",
                column: "voucher_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_transfer_vouchers_created_by_user_id",
                table: "transfer_vouchers",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_transfer_vouchers_from_treasury_id",
                table: "transfer_vouchers",
                column: "from_treasury_id");

            migrationBuilder.CreateIndex(
                name: "ix_transfer_vouchers_journal_entry_id",
                table: "transfer_vouchers",
                column: "journal_entry_id");

            migrationBuilder.CreateIndex(
                name: "ix_transfer_vouchers_to_treasury_id",
                table: "transfer_vouchers",
                column: "to_treasury_id");

            migrationBuilder.CreateIndex(
                name: "ix_transfer_vouchers_transfer_number",
                table: "transfer_vouchers",
                column: "transfer_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_treasuries_account_id",
                table: "treasuries",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "ix_treasuries_code",
                table: "treasuries",
                column: "code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cash_vouchers");

            migrationBuilder.DropTable(
                name: "transfer_vouchers");

            migrationBuilder.DropTable(
                name: "treasuries");
        }
    }
}
