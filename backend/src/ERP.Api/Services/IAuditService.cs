using ERP.Api.Domain.Entities;

namespace ERP.Api.Services;

public interface IAuditService
{
    Task LogAsync(Guid? userId, string action, string entityName, string? entityId = null, string? details = null, string? ipAddress = null);
    Task<List<AuditLog>> GetLogsAsync(Guid? userId = null, string? action = null, string? entityName = null, DateTime? fromDate = null, DateTime? toDate = null, int skip = 0, int take = 100);
    Task<int> GetLogsCountAsync(Guid? userId = null, string? action = null, string? entityName = null, DateTime? fromDate = null, DateTime? toDate = null);
}
