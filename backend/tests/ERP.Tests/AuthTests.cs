using ERP.Api.Domain.Entities;
using ERP.Api.Services;
using Microsoft.Extensions.Configuration;

namespace ERP.Tests;

public class AuthTests
{
    [Fact]
    public void PasswordHasher_ShouldHashAndVerifyPasswordCorrectly()
    {
        // Arrange
        var hasher = new PasswordHasher();
        var rawPassword = "SecretPassword123!";

        // Act
        var hash = hasher.HashPassword(rawPassword);
        var isValid = hasher.VerifyPassword(rawPassword, hash);
        var isInvalid = hasher.VerifyPassword("WrongPassword", hash);

        // Assert
        Assert.NotNull(hash);
        Assert.NotEqual(rawPassword, hash);
        Assert.True(isValid);
        Assert.False(isInvalid);
    }

    [Fact]
    public void TokenService_ShouldGenerateValidAccessTokenAndRefreshToken()
    {
        // Arrange
        var configData = new Dictionary<string, string?>
        {
            { "Jwt:Secret", "TestSuperSecretKeyForERP12345678901234567890!" },
            { "Jwt:Issuer", "ERP.Api" },
            { "Jwt:Audience", "ERP.Client" },
            { "Jwt:ExpiryInMinutes", "30" }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        var tokenService = new TokenService(configuration);

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Administrator User",
                        Role = "Admin",
            IsActive = true
        };

        // Act
        var (token, expiresIn) = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken(user, "127.0.0.1");

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(1800, expiresIn); // 30 mins = 1800s
        Assert.NotNull(refreshToken);
        Assert.False(string.IsNullOrWhiteSpace(refreshToken.Token));
        Assert.Equal(user.Id, refreshToken.UserId);
        Assert.True(refreshToken.IsActive);
        Assert.False(refreshToken.IsExpired);
        Assert.False(refreshToken.IsRevoked);
    }
}
