using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface ICustomerService
{
    Task<List<CustomerDto>> GetCustomersAsync(bool? activeOnly = null, string? search = null);
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request);
    Task<CustomerDto?> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request);
}
