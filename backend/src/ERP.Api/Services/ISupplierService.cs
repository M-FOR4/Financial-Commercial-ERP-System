using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface ISupplierService
{
    Task<List<SupplierDto>> GetSuppliersAsync(bool? activeOnly = null, string? search = null);
    Task<SupplierDto?> GetSupplierByIdAsync(Guid id);
    Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request);
    Task<SupplierDto?> UpdateSupplierAsync(Guid id, CreateSupplierRequest request);
}
