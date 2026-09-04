using ERP.Api.Data;
using ERP.Api.DTOs;
using ERP.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class TreasuryService : ITreasuryService
{
    private readonly AppDbContext _db;

    public TreasuryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TreasuryResponse>> GetAllTreasuriesAsync()
    {
        return await _db.Treasuries
            .Include(t => t.Account)
            .AsNoTracking()
            .OrderBy(t => t.Code)
            .Select(t => MapToResponse(t))
            .ToListAsync();
    }

    public async Task<TreasuryResponse?> GetTreasuryByIdAsync(Guid id)
    {
        var treasury = await _db.Treasuries
            .Include(t => t.Account)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        return treasury is null ? null : MapToResponse(treasury);
    }

    public async Task<TreasuryResponse> CreateTreasuryAsync(TreasuryRequest request)
    {
        // Verify account exists and is not a header
        var account = await _db.Accounts.FindAsync(request.AccountId)
            ?? throw new InvalidOperationException("Account not found.");
        if (account.IsHeader)
            throw new InvalidOperationException("Cannot link treasury to a header account.");

        // Check code uniqueness
        if (await _db.Treasuries.AnyAsync(t => t.Code == request.Code))
            throw new InvalidOperationException($"Treasury code '{request.Code}' already exists.");

        var treasury = new Treasury
        {
            Id = Guid.NewGuid(),
            Code = request.Code,
            Name = request.Name,
            Type = request.Type,
            AccountId = request.AccountId,
            Balance = 0m,
            Currency = request.Currency,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Treasuries.Add(treasury);
        await _db.SaveChangesAsync();

        return await GetTreasuryByIdAsync(treasury.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created treasury.");
    }

    public async Task<TreasuryResponse?> UpdateTreasuryAsync(Guid id, TreasuryRequest request)
    {
        var treasury = await _db.Treasuries.FindAsync(id);
        if (treasury is null) return null;

        // Verify account exists
        var account = await _db.Accounts.FindAsync(request.AccountId)
            ?? throw new InvalidOperationException("Account not found.");
        if (account.IsHeader)
            throw new InvalidOperationException("Cannot link treasury to a header account.");

        // Check code uniqueness (exclude self)
        if (await _db.Treasuries.AnyAsync(t => t.Code == request.Code && t.Id != id))
            throw new InvalidOperationException($"Treasury code '{request.Code}' already exists.");

        treasury.Code = request.Code;
        treasury.Name = request.Name;
        treasury.Type = request.Type;
        treasury.AccountId = request.AccountId;
        treasury.Currency = request.Currency;

        await _db.SaveChangesAsync();

        return await GetTreasuryByIdAsync(id);
    }

    public async Task<bool> DeleteTreasuryAsync(Guid id)
    {
        var treasury = await _db.Treasuries.FindAsync(id);
        if (treasury is null) return false;

        // Soft-delete
        treasury.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    private static TreasuryResponse MapToResponse(Treasury t) => new(
        t.Id,
        t.Code,
        t.Name,
        t.Type,
        t.AccountId,
        t.Account.Name,
        t.Balance,
        t.Currency,
        t.IsActive,
        t.CreatedAt
    );
}
