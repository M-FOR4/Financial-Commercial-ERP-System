using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class SupplierService : ISupplierService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SupplierService> _logger;

    public SupplierService(AppDbContext context, ILogger<SupplierService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<SupplierDto>> GetSuppliersAsync(bool? activeOnly = null, string? search = null)
    {
        var query = _context.Suppliers.AsNoTracking().AsQueryable();
        if (activeOnly.HasValue) query = query.Where(s => s.IsActive == activeOnly.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(su => su.Code.ToLower().Contains(term) || su.Name.ToLower().Contains(term));
        }

        var suppliers = await query.OrderBy(s => s.Code).ToListAsync();
        var result = new List<SupplierDto>();
        foreach (var s in suppliers)
        {
            var count = await _context.PurchaseInvoices.CountAsync(pi => pi.SupplierId == s.Id);
            result.Add(new SupplierDto(s.Id, s.Code, s.Name, s.Phone, s.Email, s.TaxNumber, s.Address, s.Balance, s.IsActive, count, s.CreatedAt));
        }
        return result;
    }

    public async Task<SupplierDto?> GetSupplierByIdAsync(Guid id)
    {
        var s = await _context.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return null;
        var count = await _context.PurchaseInvoices.CountAsync(pi => pi.SupplierId == s.Id);
        return new SupplierDto(s.Id, s.Code, s.Name, s.Phone, s.Email, s.TaxNumber, s.Address, s.Balance, s.IsActive, count, s.CreatedAt);
    }

    public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request)
    {
        if (await _context.Suppliers.AnyAsync(s => s.Code == request.Code.Trim()))
            throw new InvalidOperationException($"A supplier with code '{request.Code}' already exists.");

        var supplier = new Supplier
        {
            Code = request.Code.Trim(), Name = request.Name.Trim(),
            Phone = request.Phone?.Trim(), Email = request.Email?.Trim(),
            TaxNumber = request.TaxNumber?.Trim(), Address = request.Address?.Trim(),
            IsActive = request.IsActive, CreatedAt = DateTime.UtcNow
        };
        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return new SupplierDto(supplier.Id, supplier.Code, supplier.Name, supplier.Phone, supplier.Email, supplier.TaxNumber, supplier.Address, supplier.Balance, supplier.IsActive, 0, supplier.CreatedAt);
    }

    public async Task<SupplierDto?> UpdateSupplierAsync(Guid id, CreateSupplierRequest request)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return null;
        supplier.Name = request.Name.Trim();
        supplier.Phone = request.Phone?.Trim(); supplier.Email = request.Email?.Trim();
        supplier.TaxNumber = request.TaxNumber?.Trim(); supplier.Address = request.Address?.Trim();
        supplier.IsActive = request.IsActive; supplier.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        var count = await _context.PurchaseInvoices.CountAsync(pi => pi.SupplierId == supplier.Id);
        return new SupplierDto(supplier.Id, supplier.Code, supplier.Name, supplier.Phone, supplier.Email, supplier.TaxNumber, supplier.Address, supplier.Balance, supplier.IsActive, count, supplier.CreatedAt);
    }
}
