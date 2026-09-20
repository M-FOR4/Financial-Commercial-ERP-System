using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _context;
    private readonly ILogger<CustomerService> _logger;
    private readonly ICodeGeneratorService _codeGenerator;
    private readonly IAccountingService _accountingService;

    public CustomerService(
        AppDbContext context,
        ILogger<CustomerService> logger,
        ICodeGeneratorService codeGenerator,
        IAccountingService accountingService)
    {
        _context = context;
        _logger = logger;
        _codeGenerator = codeGenerator;
        _accountingService = accountingService;
    }

    public async Task<List<CustomerDto>> GetCustomersAsync(bool? activeOnly = null, string? search = null)
    {
        var query = _context.Customers.AsNoTracking().AsQueryable();

        if (activeOnly.HasValue)
            query = query.Where(c => c.IsActive == activeOnly.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c => c.Code.ToLower().Contains(s) || c.Name.ToLower().Contains(s));
        }

        var customers = await query.OrderBy(c => c.Code).ToListAsync();

        var result = new List<CustomerDto>();
        foreach (var c in customers)
        {
            var invoiceCount = await _context.SalesInvoices.CountAsync(si => si.CustomerId == c.Id);
            result.Add(new CustomerDto(
                c.Id, c.Code, c.Name, c.Phone, c.Email, c.TaxNumber, c.Address,
                c.Balance, c.IsActive, invoiceCount, c.CreatedAt
            ));
        }
        return result;
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id)
    {
        var c = await _context.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (c == null) return null;

        var invoiceCount = await _context.SalesInvoices.CountAsync(si => si.CustomerId == c.Id);
        return new CustomerDto(
            c.Id, c.Code, c.Name, c.Phone, c.Email, c.TaxNumber, c.Address,
            c.Balance, c.IsActive, invoiceCount, c.CreatedAt
        );
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request)
    {
        var name = request.Name.Trim();
        var companyId = ResolveCompanyId();

        // Auto-generate the code when the caller omits it (auto-gen policy).
        var code = request.Code?.Trim();
        if (string.IsNullOrEmpty(code))
            code = await _codeGenerator.NextCustomerCodeAsync(companyId);
        else if (await _context.Customers.AnyAsync(c => c.Code == code))
            throw new InvalidOperationException($"A customer with code '{request.Code}' already exists.");

        var customer = new Customer
        {
            CompanyId = companyId,
            Code = code,
            Name = name,
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            TaxNumber = request.TaxNumber?.Trim(),
            Address = request.Address?.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        // BUSINESS_LOGIC §3: "Customer له بطاقة مستقلة وحساب محاسبي مرتبط" —
        // automatically create the customer's sub-account under AR (1130).
        try
        {
            customer.AccountId = await _accountingService.GetOrCreateCustomerAccountAsync(
                customer.CompanyId, name);
            await _context.SaveChangesAsync();
        }
        catch (InvalidOperationException ex)
        {
            // Chart of Accounts not seeded / control account missing: keep the
            // customer usable, surface the linkage problem in logs.
            _logger.LogWarning(ex,
                "Customer '{Code}' created without linked AR sub-account: {Message}",
                customer.Code, ex.Message);
        }

        return new CustomerDto(
            customer.Id, customer.Code, customer.Name, customer.Phone, customer.Email,
            customer.TaxNumber, customer.Address, customer.Balance, customer.IsActive,
            0, customer.CreatedAt
        );
    }

    /// <summary>
    /// Customer rows are company-scoped (CompanyId is required by the entity); the
    /// create flow currently runs in the single-company context, so resolve it
    /// from the first company. Kept local so the auto-code path stays testable.
    /// </summary>
    private Guid ResolveCompanyId() =>
        _context.Companies.Select(c => c.Id).FirstOrDefault();

    public async Task<CustomerDto?> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return null;

        customer.Name = request.Name.Trim();
        customer.Phone = request.Phone?.Trim();
        customer.Email = request.Email?.Trim();
        customer.TaxNumber = request.TaxNumber?.Trim();
        customer.Address = request.Address?.Trim();
        customer.IsActive = request.IsActive;
        customer.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var invoiceCount = await _context.SalesInvoices.CountAsync(si => si.CustomerId == customer.Id);
        return new CustomerDto(
            customer.Id, customer.Code, customer.Name, customer.Phone, customer.Email,
            customer.TaxNumber, customer.Address, customer.Balance, customer.IsActive,
            invoiceCount, customer.CreatedAt
        );
    }
}
