using ERP.Api.Common.Authorization;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IAdminService _adminService;

    public UsersController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HasPermission("Admin.User.View")]
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _adminService.GetAllUsersAsync();
        return Ok(users);
    }

    [HasPermission("Admin.User.View")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUserById(Guid id)
    {
        var user = await _adminService.GetUserByIdAsync(id);
        if (user is null) return NotFound();
        return Ok(user);
    }

    [HasPermission("Admin.User.Add")]
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] RegisterRequest request)
    {
        try
        {
            var user = await _adminService.CreateUserAsync(request);
            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("Admin.User.Edit")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var user = await _adminService.UpdateUserAsync(id, request);
            if (user is null) return NotFound();
            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("Admin.User.Edit")]
    [HttpPost("{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        try
        {
            var result = await _adminService.ToggleUserActiveAsync(id);
            if (!result) return NotFound();
            return Ok(new { message = "User status toggled." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HasPermission("Admin.User.ResetCredentials")]
    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
    {
        var result = await _adminService.ResetPasswordAsync(id, request.NewPassword);
        if (!result) return NotFound();
        return Ok(new { message = "Password reset successfully." });
    }
}
