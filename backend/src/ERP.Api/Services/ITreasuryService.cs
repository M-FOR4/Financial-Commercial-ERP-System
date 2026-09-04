using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface ITreasuryService
{
    Task<List<TreasuryResponse>> GetAllTreasuriesAsync();
    Task<TreasuryResponse?> GetTreasuryByIdAsync(Guid id);
    Task<TreasuryResponse> CreateTreasuryAsync(TreasuryRequest request);
    Task<TreasuryResponse?> UpdateTreasuryAsync(Guid id, TreasuryRequest request);
    Task<bool> DeleteTreasuryAsync(Guid id);
}
