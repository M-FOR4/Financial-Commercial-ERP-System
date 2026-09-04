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

    [HttpGet("categories")]
    public async Task<IActionResult> GetAllCategories()
    {
        var categories = await _assetService.GetAllAssetCategoriesAsync();
        return Ok(categories);
    }

    [HttpGet("categories/{id:guid}")]
    public async Task<IActionResult> GetCategoryById(Guid id)
    {
        var category = await _assetService.GetAssetCategoryByIdAsync(id);
        if (category is null) return NotFound();
        return Ok(category);
    }

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

    [HttpGet]
    public async Task<IActionResult> GetAllAssets()
    {
        var assets = await _assetService.GetAllFixedAssetsAsync();
        return Ok(assets);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAssetById(Guid id)
    {
        var asset = await _assetService.GetFixedAssetByIdAsync(id);
        if (asset is null) return NotFound();
        return Ok(asset);
    }

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

    [HttpGet("depreciation-entries")]
    public async Task<IActionResult> GetDepreciationEntries([FromQuery] Guid? assetId)
    {
        var entries = await _assetService.GetDepreciationEntriesAsync(assetId);
        return Ok(entries);
    }

    // ═══════════════════════════════════
    //  DISPOSAL
    // ═══════════════════════════════════

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
