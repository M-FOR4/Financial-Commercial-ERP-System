using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ERP.Tests;

public class AdminTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task SeedAdminUser(AppDbContext db)
    {
        var hasher = new PasswordHasher();
        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            FullName = "Test Admin",
            Username = "admin",
                    PasswordHash = hasher.HashPassword("admin123"),
            Role = "Admin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task UsernameLogin_ShouldAuthenticateCorrectly()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        await SeedAdminUser(db);
        var hasher = new PasswordHasher();

        var user = await db.Users.FirstAsync(u => u.Username == "admin");
        Assert.NotNull(user);
        Assert.True(hasher.VerifyPassword("admin123", user.PasswordHash));
    }

    [Fact]
    public async Task UsernameLogin_ShouldRejectWrongPassword()
    {
        using var db = CreateInMemoryDbContext();
        await SeedAdminUser(db);
        var hasher = new PasswordHasher();

        var user = await db.Users.FirstAsync(u => u.Username == "admin");
        Assert.False(hasher.VerifyPassword("wrongpassword", user.PasswordHash));
    }

    [Fact]
    public async Task AdminService_CreateUser_ShouldWork()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var adminService = new AdminService(db, new PasswordHasher());

        // Act
        var result = await adminService.CreateUserAsync(new RegisterRequest(
            FullName: "Test Accountant",
            Username: "accountant1",
            Password: "pass123",
            Role: "Accountant", Permissions: null));

        // Assert
        Assert.Equal("accountant1", result.Username);
        Assert.Equal("Accountant", result.Role);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task AdminService_CreateUser_DuplicateUsername_ShouldThrow()
    {
        using var db = CreateInMemoryDbContext();
        await SeedAdminUser(db);
        var adminService = new AdminService(db, new PasswordHasher());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            adminService.CreateUserAsync(new RegisterRequest(
                FullName: "Duplicate", Username: "admin", Password: "pass123", Role: "Admin", Permissions: null)));
    }

    [Fact]
    public async Task AdminService_ToggleActive_ShouldWork()
    {
        using var db = CreateInMemoryDbContext();
        await SeedAdminUser(db);
        var adminService = new AdminService(db, new PasswordHasher());

        // Create a non-admin user to test toggle
        var accountant = await adminService.CreateUserAsync(new RegisterRequest(
            FullName: "Test Accountant", Username: "accountant1", Password: "pass123", Role: "Accountant", Permissions: null));

        var result = await adminService.ToggleUserActiveAsync(accountant.Id);
        Assert.True(result);

        var user = await db.Users.FindAsync(accountant.Id);
        Assert.False(user!.IsActive);
    }

    [Fact]
    public async Task AdminService_ToggleActive_Admin_ShouldThrow()
    {
        using var db = CreateInMemoryDbContext();
        await SeedAdminUser(db);
        var adminService = new AdminService(db, new PasswordHasher());

        var userId = (await db.Users.FirstAsync(u => u.Username == "admin")).Id;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            adminService.ToggleUserActiveAsync(userId));
    }

    [Fact]
    public async Task AdminService_ResetPassword_ShouldWork()
    {
        using var db = CreateInMemoryDbContext();
        await SeedAdminUser(db);
        var hasher = new PasswordHasher();
        var adminService = new AdminService(db, hasher);

        var userId = (await db.Users.FirstAsync(u => u.Username == "admin")).Id;

        var result = await adminService.ResetPasswordAsync(userId, "newpass123");
        Assert.True(result);

        var user = await db.Users.FindAsync(userId);
        Assert.True(hasher.VerifyPassword("newpass123", user!.PasswordHash));
    }

    [Fact]
    public async Task AuditService_ShouldLogAndQuery()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var auditService = new AuditService(db);
        var userId = Guid.NewGuid();

        // Act
        await auditService.LogAsync(userId, "CREATE", "SalesInvoice", "INV-001", "{\"total\":5000}");
        await auditService.LogAsync(userId, "POST_DOCUMENT", "SalesInvoice", "INV-001");
        await auditService.LogAsync(userId, "CREATE", "Customer", "C-001");

        // Assert
        var allLogs = await auditService.GetLogsAsync();
        Assert.Equal(3, allLogs.Count);

        var invoiceLogs = await auditService.GetLogsAsync(entityName: "SalesInvoice");
        Assert.Equal(2, invoiceLogs.Count);

        var createLogs = await auditService.GetLogsAsync(action: "CREATE");
        Assert.Equal(2, createLogs.Count);

        var count = await auditService.GetLogsCountAsync();
        Assert.Equal(3, count);
    }
}
