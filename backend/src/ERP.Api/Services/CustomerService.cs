using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _context;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(AppDbContext context, ILogger<CustomerService> logger)
    {
        _context = context;
        _logger = logger;
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
        if (await _context.Customers.AnyAsync(c => c.Code == request.Code.Trim()))
            throw new InvalidOperationException($"A customer with code '{request.Code}' already exists.");

        var customer = new Customer
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            TaxNumber = request.TaxNumber?.Trim(),
            Address = request.Address?.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return new CustomerDto(
            customer.Id, customer.Code, customer.Name, customer.Phone, customer.Email,
            customer.TaxNumber, customer.Address, customer.Balance, customer.IsActive,
            0, customer.CreatedAt
        );
    }

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
