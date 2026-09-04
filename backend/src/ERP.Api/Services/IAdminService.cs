using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface IAdminService
{
    Task<List<UserDto>> GetAllUsersAsync();
    Task<UserDto?> GetUserByIdAsync(Guid id);
    Task<UserDto> CreateUserAsync(RegisterRequest request);
    Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserRequest request);
    Task<bool> ToggleUserActiveAsync(Guid id);
    Task<bool> ResetPasswordAsync(Guid id, string newPassword);
}
