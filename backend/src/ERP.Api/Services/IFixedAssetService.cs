using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface IFixedAssetService
{
    // Asset Categories
    Task<List<AssetCategoryResponse>> GetAllAssetCategoriesAsync();
    Task<AssetCategoryResponse?> GetAssetCategoryByIdAsync(Guid id);
    Task<AssetCategoryResponse> CreateAssetCategoryAsync(AssetCategoryRequest request);
    Task<AssetCategoryResponse?> UpdateAssetCategoryAsync(Guid id, AssetCategoryRequest request);
    Task<bool> DeleteAssetCategoryAsync(Guid id);

    // Fixed Assets
    Task<List<FixedAssetResponse>> GetAllFixedAssetsAsync();
    Task<FixedAssetResponse?> GetFixedAssetByIdAsync(Guid id);
    Task<FixedAssetResponse> CreateFixedAssetAsync(FixedAssetRequest request);
    Task<FixedAssetResponse?> UpdateFixedAssetAsync(Guid id, FixedAssetRequest request);

    // Depreciation
    Task<DepreciationRunResponse> RunDepreciationAsync(DepreciationRunRequest request);
    Task<List<DepreciationEntryResponse>> GetDepreciationEntriesAsync(Guid? assetId = null);

    // Disposal
    Task<AssetDisposalResponse> DisposeAssetAsync(Guid assetId, AssetDisposalRequest request);
}
