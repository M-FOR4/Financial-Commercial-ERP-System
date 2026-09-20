using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

/// <summary>
/// Centralized builder for balanced journal entries.
///
/// Enforces the double-entry invariant Sum(Dr) == Sum(Cr) > 0 before a JE is
/// handed off for persistence. When line amounts are rounded independently
/// (e.g. VAT per line), this helper places the residual on the highest-value
/// line so posted amounts continue to reconcile to the GL.
///
/// Design notes:
///  - Prefer building from fully-rounded, net-of-discount bases so tax bases are
///    consistent between frontend and backend (see ISSUE-7 strategy).
///  - VAT is modeled explicitly as a payable/receivable line so reports never
///    infer tax from generic 2xxx/1xxx balances.
/// </summary>
public static class JournalBuilder
{
    /// <summary>
    /// Resolve the account to debit/credit and mutate Account.Balance using the
    /// ERP's normal-balance rules. This keeps automated postings aligned with
    /// AccountingService.PostJournalEntryAsync (single source of truth for GL).
    /// </summary>
    public static void ApplyPostingToAccountBalance(this JournalEntryLine line, AppDbContext context)
    {
        var account = context.Accounts.Find(line.AccountId);
        if (account == null)
        {
            throw new InvalidOperationException($"Account ID '{line.AccountId}' not found.");
        }

        if (account.IsHeader)
        {
            throw new InvalidOperationException($"Account '{account.Code}' is a Header account and cannot be posted to.");
        }

        AdjustAccountBalance(account, line.Debit, line.Credit);
    }

    /// <summary>
    /// Adjust an account's GL balance by a debit/credit pair using the same rules
    /// as AccountingService.PostJournalEntryAsync / CancelJournalEntryAsync.
    /// </summary>
    public static void AdjustAccountBalance(this Account account, decimal debit, decimal credit)
    {
        if (account.IsHeader)
        {
            throw new InvalidOperationException($"Account '{account.Code}' is a Header account and cannot be posted to.");
        }

        if (account.Type is AccountType.Asset or AccountType.Expense)
        {
            account.Balance += (debit - credit);
        }
        else
        {
            account.Balance += (credit - debit);
        }

        account.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Rounded tax base used across sales/purchase postings.
    /// The ERP uses 4 decimal places for monetary precision (see Account.Balance / JE lines).
    /// </summary>
    public const int MonetaryPrecision = 4;

    /// <summary>
    /// Round a monetary value to <see cref="MonetaryPrecision"/> decimal places using
    /// MidpointRounding.AwayFromZero, consistent with the approved rounding policy.
    /// </summary>
    public static decimal Round(decimal value) =>
        decimal.Round(value, MonetaryPrecision, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Add lines for a VAT amount (output tax on sales or input tax on purchases).
    /// Callers must still ensure total Debits == total Credits after adding all
    /// revenue/inventory/AP/AR lines.
    /// </summary>
    public static void AddVatLine(this List<JournalEntryLine> lines, Guid vatAccountId, decimal vatAmount, bool isPurchase, string description)
    {
        if (vatAccountId == Guid.Empty)
            throw new InvalidOperationException("VAT account is not configured.");

        if (vatAmount < 0)
            throw new InvalidOperationException("VAT amount cannot be negative.");

        vatAmount = Round(vatAmount);

        if (vatAmount == 0m)
            return;

        if (isPurchase)
        {
            // Purchase VAT is a receivable (asset) — debit VAT Receivable
            lines.Add(new JournalEntryLine
            {
                AccountId = vatAccountId,
                Debit = vatAmount,
                Credit = 0m,
                Description = description
            });
        }
        else
        {
            // Sales VAT is a payable (liability) — credit VAT Payable
            lines.Add(new JournalEntryLine
            {
                AccountId = vatAccountId,
                Debit = 0m,
                Credit = vatAmount,
                Description = description
            });
        }
    }

    /// <summary>
    /// Add line items for a discount treated as a contra-revenue line.
    /// Discount reduces revenue, so it is debited to a discount account.
    /// </summary>
    public static void AddDiscountLine(this List<JournalEntryLine> lines, Guid discountAccountId, decimal discountAmount, string description)
    {
        if (discountAccountId == Guid.Empty)
            throw new InvalidOperationException("Discount account is not configured.");

        if (discountAmount < 0)
            throw new InvalidOperationException("Discount amount cannot be negative.");

        discountAmount = Round(discountAmount);

        if (discountAmount == 0m)
            return;

        lines.Add(new JournalEntryLine
        {
            AccountId = discountAccountId,
            Debit = discountAmount,
            Credit = 0m,
            Description = description
        });
    }

    /// <summary>
    /// Place rounding residual on the single highest-value line, keeping the JE balanced.
    ///
    /// This is intended for cases where a computed total (e.g. tax) differs from the
    /// sum of independently-rounded components by a small epsilon in the last decimal place(s).
    /// </summary>
    public static void AssignRoundingResidual(this List<JournalEntryLine> lines, decimal residual)
    {
        if (residual == 0m)
            return;

        var target = lines
            .OrderByDescending(l => Math.Max(l.Debit, l.Credit))
            .FirstOrDefault();

        if (target == null)
            throw new InvalidOperationException("Cannot assign rounding residual: journal has no lines.");

        // Place the residual on the debit or credit side depending on the line's current orientation.
        if (target.Debit >= target.Credit)
            target.Debit = Round(target.Debit + residual);
        else
            target.Credit = Round(target.Credit + residual);
    }

    /// <summary>
    /// Validate that the provided lines satisfy the double-entry invariant.
    /// </summary>
    public static void ValidateBalance(IEnumerable<JournalEntryLine> lines)
    {
        var debit = lines.Sum(l => l.Debit);
        var credit = lines.Sum(l => l.Credit);

        if (debit <= 0m || debit != credit)
        {
            throw new InvalidOperationException(
                $"Unbalanced journal entry: Total Debits ({debit:F4}) must equal Total Credits ({credit:F4}) and be greater than zero. " +
                $"Difference: {(debit - credit):F4}.");
        }
    }

    /// <summary>
    /// Validate and normalize a batch of line amounts by rounding each independently
    /// to monetary precision, then placing any residual on the largest line.
    ///
    /// This is useful for tax computations where rounding line-by-line can drift
    /// from the rounded total.
    /// </summary>
    public static void NormalizeAndBalance(this List<JournalEntryLine> lines)
    {
        foreach (var line in lines)
        {
            line.Debit = Round(line.Debit);
            line.Credit = Round(line.Credit);
        }

        var totalDebit = lines.Sum(l => l.Debit);
        var totalCredit = lines.Sum(l => l.Credit);
        var residual = totalDebit - totalCredit;

        if (residual != 0m)
        {
            AssignRoundingResidual(lines, -residual);
        }

        ValidateBalance(lines);
    }

}

