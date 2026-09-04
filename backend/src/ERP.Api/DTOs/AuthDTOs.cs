using System.ComponentModel.DataAnnotations;

namespace ERP.Api.DTOs;

public record RegisterRequest(
    [Required, MaxLength(200)] string FullName,
    [Required, MaxLength(100)] string Username,
    [Required, MinLength(6)] string Password,
    string? Role,
    List<string>? Permissions
);

public record LoginRequest(
    [Required, MaxLength(100)] string Username,
    [Required] string Password
);

public record RefreshTokenRequest(
    [Required] string RefreshToken
);

public record RevokeTokenRequest(
    [Required] string RefreshToken
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    UserDto User
);

public record UserDto(
    Guid Id,
    string FullName,
    string Username,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    List<string> Permissions,
    string? CompanyName = null,
    string? BranchName = null
);

public record UpdateUserRequest(
    string FullName,
    string Role,
    bool IsActive,
    List<string>? Permissions
);

public record ResetPasswordRequest(
    [Required, MinLength(6)] string NewPassword
);
