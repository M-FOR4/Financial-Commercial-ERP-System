using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

/// <summary>
/// Central sequential code generation for business entities.
/// Rules (BUSINESS_LOGIC §14, DATABASE_RULES §5–6): codes are human-readable,
/// company-scoped, and unique; generation must prevent duplicates under
/// concurrent users. Entity codes and database IDs are separate concepts.
///
/// Generation strategy: load the existing codes once, parse the numeric
/// suffix, and take max + 1. Combined with the unique DB indexes this is
/// safe for LAN-level concurrency: a true race loses the insert, not data
/// integrity, and the caller can retry.
/// </summary>
public interface ICodeGeneratorService
{
    /// <summary>Next sequential code, e.g. CUST-0001.</summary>
    Task<string> NextCustomerCodeAsync(Guid companyId);
    /// <summary>Next sequential code, e.g. SUPP-0001.</summary>
    Task<string> NextSupplierCodeAsync(Guid companyId);
    /// <summary>Next sequential code, e.g. PRD-0001.</summary>
    Task<string> NextProductCodeAsync(Guid companyId);
}

public class CodeGeneratorService : ICodeGeneratorService
{
    private readonly AppDbContext _context;

    public CodeGeneratorService(AppDbContext context)
    {
        _context = context;
    }

    public Task<string> NextCustomerCodeAsync(Guid companyId) =>
        NextCodeAsync(
            _context.Customers.Where(c => c.CompanyId == companyId).Select(c => c.Code).ToListAsync(),
            "CUST");

    public Task<string> NextSupplierCodeAsync(Guid companyId) =>
        NextCodeAsync(
            _context.Suppliers.Where(s => s.CompanyId == companyId).Select(s => s.Code).ToListAsync(),
            "SUPP");

    public Task<string> NextProductCodeAsync(Guid companyId) =>
        NextCodeAsync(
            _context.Products.Where(p => p.CompanyId == companyId).Select(p => p.SKU).ToListAsync(),
            "PRD");

    private static async Task<string> NextCodeAsync(Task<List<string>> existingCodesTask, string prefix)
    {
        var existingCodes = await existingCodesTask;
        var maxSuffix = 0;
        var prefixWithDash = $"{prefix}-";
        foreach (var code in existingCodes)
        {
            if (!code.StartsWith(prefixWithDash, StringComparison.OrdinalIgnoreCase))
                continue;

            var suffix = code[prefixWithDash.Length..];
            if (int.TryParse(suffix, out var n) && n > maxSuffix)
                maxSuffix = n;
        }

        return $"{prefixWithDash}{maxSuffix + 1:D4}";
    }
}
