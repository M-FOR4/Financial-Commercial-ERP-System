using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(Guid? userId, string action, string entityName, string? entityId = null, string? details = null, string? ipAddress = null)
    {
        var log = new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            Details = details,
            IPAddress = ipAddress,
            Timestamp = DateTime.UtcNow
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task<List<AuditLog>> GetLogsAsync(Guid? userId = null, string? action = null, string? entityName = null, DateTime? fromDate = null, DateTime? toDate = null, int skip = 0, int take = 100)
    {
        var query = _db.AuditLogs
            .Include(al => al.User)
            .AsNoTracking()
            .AsQueryable();

        if (userId.HasValue)
            query = query.Where(al => al.UserId == userId.Value);
        if (!string.IsNullOrEmpty(action))
            query = query.Where(al => al.Action == action);
        if (!string.IsNullOrEmpty(entityName))
            query = query.Where(al => al.EntityName == entityName);
        if (fromDate.HasValue)
            query = query.Where(al => al.Timestamp >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(al => al.Timestamp <= toDate.Value);

        return await query
            .OrderByDescending(al => al.Timestamp)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<int> GetLogsCountAsync(Guid? userId = null, string? action = null, string? entityName = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _db.AuditLogs.AsNoTracking().AsQueryable();

        if (userId.HasValue)
            query = query.Where(al => al.UserId == userId.Value);
        if (!string.IsNullOrEmpty(action))
            query = query.Where(al => al.Action == action);
        if (!string.IsNullOrEmpty(entityName))
            query = query.Where(al => al.EntityName == entityName);
        if (fromDate.HasValue)
            query = query.Where(al => al.Timestamp >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(al => al.Timestamp <= toDate.Value);

        return await query.CountAsync();
    }
}
