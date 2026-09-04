using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ERP.Api.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace ERP.Api.Services;

public interface ITokenService
{
    (string Token, int ExpiresIn) GenerateAccessToken(User user, List<string> effectivePermissions = null);
    RefreshToken GenerateRefreshToken(User user, string? ipAddress = null);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, int ExpiresIn) GenerateAccessToken(User user, List<string> effectivePermissions = null)
    {
        var jwtSecret = _configuration["Jwt:Secret"] ?? "SuperSecretKeyForERP12345678901234567890!";
        var issuer = _configuration["Jwt:Issuer"] ?? "ERP.Api";
        var audience = _configuration["Jwt:Audience"] ?? "ERP.Client";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryInMinutes"], out var exp) ? exp : 30;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Name, user.FullName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role)
        };

        if (effectivePermissions != null && effectivePermissions.Count > 0)
    {
        claims.Add(new Claim("permissions", string.Join(",", effectivePermissions)));
    }

    var expires = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expires,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        return (tokenString, (int)TimeSpan.FromMinutes(expiryMinutes).TotalSeconds);
    }

    public RefreshToken GenerateRefreshToken(User user, string? ipAddress = null)
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);

        var token = Convert.ToBase64String(randomBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");

        return new RefreshToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ipAddress
        };
    }
}
