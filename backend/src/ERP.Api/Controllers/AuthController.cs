using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Common.Authorization;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _logger = logger;
    }

    [HttpPost("register")]
    [HasPermission("Admin.User.Add")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower()))
        {
            return Conflict(new { success = false, message = "A user with this username already exists." });
        }

        // Roles are UI presets only; fall back to the role preset when no explicit
        // permission list is provided. Stored permissions are the ground truth.
        var permissions = request.Permissions is { Count: > 0 }
            ? request.Permissions
            : RolePresets.For(request.Role)?.ToList() ?? new List<string>();

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Username = request.Username.Trim().ToLowerInvariant(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = request.Role ?? "Accountant",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            PermissionsJson = JsonSerializer.Serialize(permissions)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User created by Admin: {Username} with role {Role}", user.Username, user.Role);

        var regPerms = await GetEffectivePermissionsAsync(user);
        var regDto = new UserDto(user.Id, user.FullName, user.Username, user.Role, user.IsActive, user.CreatedAt, regPerms);
        return Ok(regDto);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (request?.Username == null)
            {
                return BadRequest(new { success = false, message = "يرجى إدخال اسم المستخدم." });
            }

            var username = request.Username.Trim().ToLowerInvariant();
            var user = await _context.Users
                .Include(u => u.RefreshTokens)
                .Include(u => u.Company)
                .Include(u => u.Branch)
                .FirstOrDefaultAsync(u => u.Username.ToLower() == username);

            if (user == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { success = false, message = "اسم المستخدم أو كلمة المرور غير صحيحة." });
            }

            if (!user.IsActive)
            {
                return Unauthorized(new { success = false, message = "هذا الحساب معطّل. يرجى التواصل مع المسؤول." });
            }

            var effectivePerms = await GetEffectivePermissionsAsync(user);
            var (accessToken, expiresIn) = _tokenService.GenerateAccessToken(user, effectivePerms);
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var refreshToken = _tokenService.GenerateRefreshToken(user, ipAddress);

            _context.RefreshTokens.Add(refreshToken);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User logged in: {Username}", user.Username);

            var loginDto = new UserDto(user.Id, user.FullName, user.Username, user.Role, user.IsActive, user.CreatedAt, effectivePerms, user.Company?.Name, user.Branch?.Name);
            return Ok(new AuthResponse(accessToken, refreshToken.Token, expiresIn, loginDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login failed for username '{Username}'", request?.Username);
            return StatusCode(500, new { success = false, message = "حدث خطأ داخلي. يرجى المحاولة مرة أخرى." });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        var existingToken = await _context.RefreshTokens
            .Include(rt => rt.User).ThenInclude(u => u.Company)
            .Include(rt => rt.User).ThenInclude(u => u.Branch)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (existingToken == null || !existingToken.IsActive || !existingToken.User.IsActive)
        {
            return Unauthorized(new { success = false, message = "Invalid or expired refresh token." });
        }

        // Revoke the current refresh token (rotation)
        existingToken.RevokedAt = DateTime.UtcNow;

        var user = existingToken.User;
        var refreshPerms = await GetEffectivePermissionsAsync(user);
        var (accessToken, expiresIn) = _tokenService.GenerateAccessToken(user, refreshPerms);
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var newRefreshToken = _tokenService.GenerateRefreshToken(user, ipAddress);

        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Token refreshed successfully for user: {Username}", user.Username);

        var refreshDto = new UserDto(user.Id, user.FullName, user.Username, user.Role, user.IsActive, user.CreatedAt, refreshPerms, user.Company?.Name, user.Branch?.Name);
        return Ok(new AuthResponse(accessToken, newRefreshToken.Token, expiresIn, refreshDto));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RevokeTokenRequest request)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (token != null && token.IsActive)
        {
            token.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Refresh token revoked on logout: {TokenId}", token.Id);
        }

        return Ok(new { success = true, message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { success = false, message = "Invalid authentication claims." });
        }

        var user = await _context.Users
            .Include(u => u.Company)
            .Include(u => u.Branch)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !user.IsActive)
        {
            return NotFound(new { success = false, message = "User not found or inactive." });
        }

        var mePerms = await GetEffectivePermissionsAsync(user);
        var meDto = new UserDto(user.Id, user.FullName, user.Username, user.Role, user.IsActive, user.CreatedAt, mePerms, user.Company?.Name, user.Branch?.Name);
        return Ok(new { success = true, user = meDto });
    }

    private async Task<List<string>> GetEffectivePermissionsAsync(User user)
    {
        var directPerms = JsonSerializer.Deserialize<List<string>>(user.PermissionsJson) ?? new List<string>();
        var rolePerms = new List<string>();

        var userRoles = await _context.UserRoles
            .Include(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Where(ur => ur.UserId == user.Id)
            .ToListAsync();

        foreach (var ur in userRoles)
        {
            if (ur.Role?.RolePermissions != null)
            {
                rolePerms.AddRange(ur.Role.RolePermissions
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission!.Name));
            }
        }

        return directPerms.Concat(rolePerms).Distinct().ToList();
    }

}
