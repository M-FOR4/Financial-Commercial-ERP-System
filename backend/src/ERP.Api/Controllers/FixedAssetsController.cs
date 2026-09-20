using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Common.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/assets")]
[Authorize]
public class FixedAssetsController : ControllerBase
{
    private readonly IFixedAssetService _assetService;

    public FixedAssetsController(IFixedAssetService assetService)
    {
        _assetService = assetService;
    }

    // ═══════════════════════════════════
    //  ASSET CATEGORIES
    // ═══════════════════════════════════

    [HasPermission("FixedAsset.FixedAsset.View")]
    [HttpGet("categories")]
    public async Task<IActionResult> GetAllCategories()
    {
        var categories = await _assetService.GetAllAssetCategoriesAsync();
        return Ok(categories);
    }

    [HasPermission("FixedAsset.FixedAsset.View")]
    [HttpGet("categories/{id:guid}")]
    public async Task<IActionResult> GetCategoryById(Guid id)
    {
        var category = await _assetService.GetAssetCategoryByIdAsync(id);
        if (category is null) return NotFound();
        return Ok(category);
    }

    [HasPermission("FixedAsset.FixedAsset.Add")]
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] AssetCategoryRequest request)
    {
        try
        {
            var category = await _assetService.CreateAssetCategoryAsync(request);
            return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id }, category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("FixedAsset.FixedAsset.Edit")]
    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] AssetCategoryRequest request)
    {
        try
        {
            var category = await _assetService.UpdateAssetCategoryAsync(id, request);
            if (category is null) return NotFound();
            return Ok(category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("FixedAsset.FixedAsset.Delete")]
    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var result = await _assetService.DeleteAssetCategoryAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    // ═══════════════════════════════════
    //  FIXED ASSETS
    // ═══════════════════════════════════

    [HasPermission("FixedAsset.FixedAsset.View")]
    [HttpGet]
    public async Task<IActionResult> GetAllAssets()
    {
        var assets = await _assetService.GetAllFixedAssetsAsync();
        return Ok(assets);
    }

    [HasPermission("FixedAsset.FixedAsset.View")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAssetById(Guid id)
    {
        var asset = await _assetService.GetFixedAssetByIdAsync(id);
        if (asset is null) return NotFound();
        return Ok(asset);
    }

    [HasPermission("FixedAsset.FixedAsset.Add")]
    [HttpPost]
    public async Task<IActionResult> CreateAsset([FromBody] FixedAssetRequest request)
    {
        try
        {
            var asset = await _assetService.CreateFixedAssetAsync(request);
            return CreatedAtAction(nameof(GetAssetById), new { id = asset.Id }, asset);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("FixedAsset.FixedAsset.Edit")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAsset(Guid id, [FromBody] FixedAssetRequest request)
    {
        try
        {
            var asset = await _assetService.UpdateFixedAssetAsync(id, request);
            if (asset is null) return NotFound();
            return Ok(asset);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ═══════════════════════════════════
    //  DEPRECIATION
    // ═══════════════════════════════════

    [HasPermission("FixedAsset.FixedAsset.CalculateDepreciation")]
    [HttpPost("depreciate")]
    public async Task<IActionResult> RunDepreciation([FromBody] DepreciationRunRequest request)
    {
        try
        {
            var result = await _assetService.RunDepreciationAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("FixedAsset.FixedAsset.View")]
    [HttpGet("depreciation-entries")]
    public async Task<IActionResult> GetDepreciationEntries([FromQuery] Guid? assetId)
    {
        var entries = await _assetService.GetDepreciationEntriesAsync(assetId);
        return Ok(entries);
    }

    // ═══════════════════════════════════
    //  DISPOSAL
    // ═══════════════════════════════════

    [HasPermission("FixedAsset.FixedAsset.Dispose")]
    [HttpPost("{id:guid}/dispose")]
    public async Task<IActionResult> DisposeAsset(Guid id, [FromBody] AssetDisposalRequest request)
    {
        try
        {
            var result = await _assetService.DisposeAssetAsync(id, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
