using System.Text.Json;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;

    public AdminService(AppDbContext db, IPasswordHasher passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var users = await _db.Users
            .AsNoTracking()
            .OrderBy(u => u.Username)
            .ToListAsync();
        var dtos = new List<UserDto>();
        foreach (var u in users)
        {
            dtos.Add(await MapToDtoAsync(u));
        }
        return dtos;
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        return user is null ? null : await MapToDtoAsync(user);
    }

    public async Task<UserDto> CreateUserAsync(RegisterRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower()))
            throw new InvalidOperationException($"Username '{request.Username}' already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Username = request.Username.Trim().ToLowerInvariant(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = request.Role ?? "Accountant",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            PermissionsJson = JsonSerializer.Serialize(request.Permissions ?? new List<string>())
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return await MapToDtoAsync(user);
    }

    public async Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return null;

        // Protect Super Admin: block role change and deactivation
        if (user.Username == "admin")
        {
            if (user.Role != request.Role)
                throw new InvalidOperationException("لا يمكن تغيير دور حساب مدير النظام الرئيسي.");
            if (!request.IsActive)
                throw new InvalidOperationException("لا يمكن تعطيل حساب مدير النظام الرئيسي.");
        }

        user.FullName = request.FullName.Trim();
        user.Role = request.Role;
        user.IsActive = request.IsActive;
        user.PermissionsJson = JsonSerializer.Serialize(request.Permissions ?? new List<string>());
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await MapToDtoAsync(user);
    }

    public async Task<bool> ToggleUserActiveAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;

        // Protect Super Admin from deactivation
        if (user.Username == "admin" && user.IsActive)
            throw new InvalidOperationException("لا يمكن تعطيل حساب مدير النظام الرئيسي.");

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ResetPasswordAsync(Guid id, string newPassword)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;

        user.PasswordHash = _passwordHasher.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<UserDto> MapToDtoAsync(User u)
    {
        var directPerms = JsonSerializer.Deserialize<List<string>>(u.PermissionsJson) ?? new List<string>();
        var rolePerms = await _db.UserRoles
            .Include(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Where(ur => ur.UserId == u.Id)
            .SelectMany(ur => ur.Role!.RolePermissions.Select(rp => rp.Permission!.Name))
            .ToListAsync();
        var effectivePerms = directPerms.Concat(rolePerms).Distinct().ToList();
        return new(u.Id, u.FullName, u.Username, u.Role, u.IsActive, u.CreatedAt, effectivePerms);
    }
}
