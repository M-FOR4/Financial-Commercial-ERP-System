using ERP.Api.Common;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class PurchaseService : IPurchaseService
{
    private readonly AppDbContext _context;
    private readonly ILogger<PurchaseService> _logger;

    public PurchaseService(AppDbContext context, ILogger<PurchaseService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ═══════════════════════════════════════════
    //  Purchase Invoices
    // ═══════════════════════════════════════════

    public async Task<List<PurchaseInvoiceDto>> GetPurchaseInvoicesAsync(JournalEntryStatus? status = null, string? search = null)
    {
        var query = _context.PurchaseInvoices
            .Include(pi => pi.Supplier).Include(pi => pi.Warehouse)
            .Include(pi => pi.Lines).ThenInclude(l => l.Product)
            .AsNoTracking().AsQueryable();

        if (status.HasValue) query = query.Where(pi => pi.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(pi => pi.InvoiceNumber.ToLower().Contains(s) || pi.Supplier.Name.ToLower().Contains(s));
        }
        var invoices = await query.OrderByDescending(pi => pi.InvoiceDate).ToListAsync();
        return invoices.Select(MapToInvoiceDto).ToList();
    }

    public async Task<PurchaseInvoiceDto?> GetPurchaseInvoiceByIdAsync(Guid id)
    {
        var pi = await _context.PurchaseInvoices
            .Include(x => x.Supplier).Include(x => x.Warehouse)
            .Include(x => x.Lines).ThenInclude(l => l.Product)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return pi == null ? null : MapToInvoiceDto(pi);
    }

    public async Task<PurchaseInvoiceDto> CreatePurchaseInvoiceDraftAsync(CreatePurchaseInvoiceRequest request, Guid companyId)
    {
        var supplier = await _context.Suppliers.FindAsync(request.SupplierId)
            ?? throw new InvalidOperationException("Supplier does not exist.");
        var warehouse = await _context.Warehouses.FindAsync(request.WarehouseId)
            ?? throw new InvalidOperationException("Warehouse does not exist.");
        if (request.Lines == null || request.Lines.Count == 0)
            throw new InvalidOperationException("At least one invoice line is required.");

        var count = await _context.PurchaseInvoices.CountAsync();
        var invoiceNumber = $"PINV-{DateTime.UtcNow:yyyyMM}-{count + 1:D4}";

        var invoice = new PurchaseInvoice
        {
            CompanyId = companyId,
            InvoiceNumber = invoiceNumber,
            SupplierId = request.SupplierId, WarehouseId = request.WarehouseId,
            InvoiceDate = request.InvoiceDate.ToUtc() ?? DateTime.UtcNow, DueDate = request.DueDate.ToUtc(),
            TaxAmount = request.TaxAmount, AdditionalCosts = request.AdditionalCosts,
            Notes = request.Notes?.Trim(), Status = JournalEntryStatus.Draft, CreatedAt = DateTime.UtcNow
        };

        foreach (var lineReq in request.Lines)
        {
            var product = await _context.Products.FindAsync(lineReq.ProductId)
                ?? throw new InvalidOperationException($"Product ID '{lineReq.ProductId}' does not exist.");
            var totalPrice = lineReq.Quantity * lineReq.DirectUnitPrice;
            invoice.Lines.Add(new PurchaseInvoiceLine
            {
                ProductId = lineReq.ProductId, Quantity = lineReq.Quantity,
                DirectUnitPrice = lineReq.DirectUnitPrice,
                TotalPrice = totalPrice, Notes = lineReq.Notes?.Trim()
            });
        }

        // Calculate subtotal and D-030 proportional allocation
        var subTotal = invoice.Lines.Sum(l => l.TotalPrice);
        invoice.SubTotal = subTotal;
        invoice.TotalAmount = subTotal + invoice.TaxAmount + invoice.AdditionalCosts;

        // D-030: Allocate AdditionalCosts proportionally by line value
        if (invoice.AdditionalCosts > 0 && subTotal > 0)
        {
            foreach (var line in invoice.Lines)
            {
                var proportion = line.TotalPrice / subTotal;
                line.AllocatedAdditionalCost = invoice.AdditionalCosts * proportion;
                line.EffectiveUnitCost = line.DirectUnitPrice + (line.AllocatedAdditionalCost / line.Quantity);
            }
        }
        else
        {
            foreach (var line in invoice.Lines)
            {
                line.EffectiveUnitCost = line.DirectUnitPrice;
            }
        }

        _context.PurchaseInvoices.Add(invoice);
        await _context.SaveChangesAsync();
        return await GetPurchaseInvoiceByIdAsync(invoice.Id) ?? throw new InvalidOperationException("Failed to load created invoice.");
    }

    public async Task<PurchaseInvoiceDto> PostPurchaseInvoiceAsync(Guid id, Guid? postedByUserId)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var invoice = await _context.PurchaseInvoices
                .Include(pi => pi.Supplier).Include(pi => pi.Warehouse)
                .Include(pi => pi.Lines).ThenInclude(l => l.Product)
                .FirstOrDefaultAsync(pi => pi.Id == id)
                ?? throw new KeyNotFoundException($"Purchase Invoice '{id}' not found.");

            if (invoice.Status != JournalEntryStatus.Draft)
                throw new InvalidOperationException($"Only Draft invoices can be posted. Current status: '{invoice.Status}'.");

            // 1. Journal Entry: Debit Inventory, Credit Accounts Payable
            // Resolve accounts from AccountingDefaults per company (ACCOUNTING_RULES §30)
            var (inventoryAccount, apAccount) =
                await AccountResolutionHelper.ResolvePurchaseAccountsAsync(_context, invoice.CompanyId);

            var jeCount = await _context.JournalEntries.CountAsync();
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(fy => fy.CompanyId == invoice.CompanyId && fy.IsActive);
            if (fiscalYear == null)
                throw new InvalidOperationException("No active fiscal year found for this company.");

            var journalEntry = new JournalEntry
            {
                CompanyId = invoice.CompanyId,
                FiscalYearId = fiscalYear.Id,
                EntryNumber = $"JE-PI-{DateTime.UtcNow:yyyyMM}-{jeCount + 1:D4}",
                EntryDate = invoice.InvoiceDate,
                Description = $"Purchase Invoice {invoice.InvoiceNumber} — {invoice.Supplier.Name}",
                Status = JournalEntryStatus.Posted, PostedAt = DateTime.UtcNow,
                PostedByUserId = postedByUserId,
                SourceDocumentType = "PurchaseInvoice",
                SourceDocumentId = invoice.Id.ToString(),
                CreatedAt = DateTime.UtcNow
            };

            // Debit Inventory (at EffectiveUnitCost * Quantity for each line)
            decimal totalInventoryCost = invoice.Lines.Sum(l => l.EffectiveUnitCost * l.Quantity);
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = inventoryAccount.Id, Debit = totalInventoryCost, Credit = 0m,
                Description = $"Inventory — {invoice.InvoiceNumber}"
            });

            // Credit AP (total amount owed)
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = apAccount.Id, Debit = 0m, Credit = invoice.TotalAmount,
                Description = $"AP — {invoice.Supplier.Name}"
            });

            _context.JournalEntries.Add(journalEntry);
            await _context.SaveChangesAsync();

            // Update account balances
            inventoryAccount.Balance += totalInventoryCost;
            inventoryAccount.UpdatedAt = DateTime.UtcNow;
            apAccount.Balance += invoice.TotalAmount;
            apAccount.UpdatedAt = DateTime.UtcNow;

            // 2. Inbound Stock Movements (at EffectiveUnitCost)
            foreach (var line in invoice.Lines)
            {
                var stockMovement = new StockMovement
                {
                    CompanyId = invoice.CompanyId,
                    ProductId = line.ProductId, WarehouseId = invoice.WarehouseId,
                    MovementType = MovementType.In, Quantity = line.Quantity,
                    UnitCost = line.EffectiveUnitCost, ReferenceDocument = invoice.InvoiceNumber,
                    Notes = $"Purchase — {invoice.InvoiceNumber}",
                    MovementDate = invoice.InvoiceDate, CreatedByUserId = postedByUserId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.StockMovements.Add(stockMovement);

                var product = line.Product;
                product.CurrentStock += line.Quantity;
                product.UpdatedAt = DateTime.UtcNow;
            }

            // 3. Update supplier balance
            invoice.Supplier.Balance += invoice.TotalAmount;
            invoice.Supplier.UpdatedAt = DateTime.UtcNow;

            // 4. Update invoice status
            invoice.JournalEntryId = journalEntry.Id;
            invoice.Status = JournalEntryStatus.Posted;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            _logger.LogInformation("Purchase Invoice '{InvoiceNumber}' posted. Total: {Total:F4}, Inventory cost: {InvCost:F4}",
                invoice.InvoiceNumber, invoice.TotalAmount, totalInventoryCost);

            return await GetPurchaseInvoiceByIdAsync(invoice.Id) ?? throw new InvalidOperationException("Failed to reload posted invoice.");
        }
        catch
        {
            if (transaction != null) await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<PurchaseInvoiceDto> CancelPurchaseInvoiceAsync(Guid id)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var invoice = await _context.PurchaseInvoices
                .Include(pi => pi.Supplier).Include(pi => pi.Warehouse)
                .Include(pi => pi.Lines).ThenInclude(l => l.Product)
                .FirstOrDefaultAsync(pi => pi.Id == id)
                ?? throw new KeyNotFoundException($"Purchase Invoice '{id}' not found.");

            if (invoice.Status != JournalEntryStatus.Posted)
                throw new InvalidOperationException($"Only Posted invoices can be cancelled. Current status: '{invoice.Status}'.");

            // Resolve accounts from AccountingDefaults per company (ACCOUNTING_RULES §30)
            var (inventoryAccount, apAccount) =
                await AccountResolutionHelper.ResolvePurchaseAccountsAsync(_context, invoice.CompanyId);

            var jeCount = await _context.JournalEntries.CountAsync();
            var reversalEntry = new JournalEntry
            {
                EntryNumber = $"JE-PIC-{DateTime.UtcNow:yyyyMM}-{jeCount + 1:D4}",
                EntryDate = DateTime.UtcNow,
                Description = $"Reversal — Purchase Invoice {invoice.InvoiceNumber}",
                Status = JournalEntryStatus.Posted, PostedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            decimal totalInventoryCost = invoice.Lines.Sum(l => l.EffectiveUnitCost * l.Quantity);

            // Reverse: Credit Inventory, Debit AP
            reversalEntry.Lines.Add(new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = 0m, Credit = totalInventoryCost, Description = $"Reversal Inventory — {invoice.InvoiceNumber}" });
            reversalEntry.Lines.Add(new JournalEntryLine { AccountId = apAccount.Id, Debit = invoice.TotalAmount, Credit = 0m, Description = $"Reversal AP — {invoice.InvoiceNumber}" });

            _context.JournalEntries.Add(reversalEntry);
            await _context.SaveChangesAsync();

            inventoryAccount.Balance -= totalInventoryCost; inventoryAccount.UpdatedAt = DateTime.UtcNow;
            apAccount.Balance -= invoice.TotalAmount; apAccount.UpdatedAt = DateTime.UtcNow;

            // Outbound Stock Movements to reverse
            foreach (var line in invoice.Lines)
            {
                _context.StockMovements.Add(new StockMovement
                {
                    ProductId = line.ProductId, WarehouseId = invoice.WarehouseId,
                    MovementType = MovementType.Out, Quantity = line.Quantity,
                    UnitCost = line.EffectiveUnitCost,
                    ReferenceDocument = $"CANCEL-{invoice.InvoiceNumber}",
                    Notes = $"Cancellation — {invoice.InvoiceNumber}",
                    MovementDate = DateTime.UtcNow, CreatedAt = DateTime.UtcNow
                });
                line.Product.CurrentStock -= line.Quantity;
                line.Product.UpdatedAt = DateTime.UtcNow;
            }

            invoice.Supplier.Balance -= invoice.TotalAmount;
            invoice.Supplier.UpdatedAt = DateTime.UtcNow;
            invoice.Status = JournalEntryStatus.Cancelled;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();
            _logger.LogInformation("Purchase Invoice '{InvoiceNumber}' cancelled.", invoice.InvoiceNumber);
            return await GetPurchaseInvoiceByIdAsync(invoice.Id) ?? throw new InvalidOperationException("Failed to reload cancelled invoice.");
        }
        catch
        {
            if (transaction != null) await transaction.RollbackAsync();
            throw;
        }
    }

    // ═══════════════════════════════════════════
    //  Purchase Returns
    // ═══════════════════════════════════════════

    public async Task<List<PurchaseReturnDto>> GetPurchaseReturnsAsync(JournalEntryStatus? status = null)
    {
        var query = _context.PurchaseReturns
            .Include(pr => pr.OriginalInvoice).Include(pr => pr.Supplier).Include(pr => pr.Warehouse)
            .Include(pr => pr.Lines).ThenInclude(l => l.Product)
            .Include(pr => pr.Lines).ThenInclude(l => l.OriginalInvoiceLine)
            .AsNoTracking().AsQueryable();
        if (status.HasValue) query = query.Where(pr => pr.Status == status.Value);
        var returns = await query.OrderByDescending(pr => pr.ReturnDate).ToListAsync();
        return returns.Select(MapToReturnDto).ToList();
    }

    public async Task<PurchaseReturnDto?> GetPurchaseReturnByIdAsync(Guid id)
    {
        var pr = await _context.PurchaseReturns
            .Include(x => x.OriginalInvoice).Include(x => x.Supplier).Include(x => x.Warehouse)
            .Include(x => x.Lines).ThenInclude(l => l.Product)
            .Include(x => x.Lines).ThenInclude(l => l.OriginalInvoiceLine)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return pr == null ? null : MapToReturnDto(pr);
    }

    public async Task<PurchaseReturnDto> CreatePurchaseReturnDraftAsync(CreatePurchaseReturnRequest request)
    {
        var originalInvoice = await _context.PurchaseInvoices
            .Include(pi => pi.Supplier).Include(pi => pi.Warehouse).Include(pi => pi.Lines)
            .FirstOrDefaultAsync(pi => pi.Id == request.OriginalInvoiceId)
            ?? throw new InvalidOperationException("Original invoice does not exist.");
        if (originalInvoice.Status != JournalEntryStatus.Posted)
            throw new InvalidOperationException("Returns can only be created against Posted invoices.");
        if (request.Lines == null || request.Lines.Count == 0)
            throw new InvalidOperationException("At least one return line is required.");

        var returnCount = await _context.PurchaseReturns.CountAsync();
        var returnNumber = $"PRET-{DateTime.UtcNow:yyyyMM}-{returnCount + 1:D4}";

        var purchaseReturn = new PurchaseReturn
        {
            ReturnNumber = returnNumber, OriginalInvoiceId = request.OriginalInvoiceId,
            SupplierId = originalInvoice.SupplierId, WarehouseId = originalInvoice.WarehouseId,
            ReturnDate = DateTime.UtcNow, Status = JournalEntryStatus.Draft,
            Notes = request.Notes?.Trim(), CreatedAt = DateTime.UtcNow
        };

        decimal totalReturn = 0m;
        foreach (var lineReq in request.Lines)
        {
            var originalLine = await _context.PurchaseInvoiceLines
                .Include(l => l.Product).FirstOrDefaultAsync(l => l.Id == lineReq.OriginalInvoiceLineId)
                ?? throw new InvalidOperationException($"Original invoice line '{lineReq.OriginalInvoiceLineId}' not found.");
            if (originalLine.PurchaseInvoiceId != request.OriginalInvoiceId)
                throw new InvalidOperationException("Return line references an invoice line from a different invoice.");
            if (lineReq.Quantity > originalLine.Quantity)
                throw new InvalidOperationException($"Return quantity ({lineReq.Quantity}) cannot exceed original ({originalLine.Quantity}).");

            // Return at the EffectiveUnitCost from the original purchase line
            var unitCost = originalLine.EffectiveUnitCost;
            var totalPrice = lineReq.Quantity * unitCost;

            purchaseReturn.Lines.Add(new PurchaseReturnLine
            {
                ProductId = originalLine.ProductId, OriginalInvoiceLineId = lineReq.OriginalInvoiceLineId,
                Quantity = lineReq.Quantity, UnitCost = unitCost,
                TotalPrice = totalPrice, Notes = lineReq.Notes?.Trim()
            });
            totalReturn += totalPrice;
        }
        purchaseReturn.TotalAmount = totalReturn;

        _context.PurchaseReturns.Add(purchaseReturn);
        await _context.SaveChangesAsync();
        return await GetPurchaseReturnByIdAsync(purchaseReturn.Id) ?? throw new InvalidOperationException("Failed to load created return.");
    }

    public async Task<PurchaseReturnDto> PostPurchaseReturnAsync(Guid id, Guid? postedByUserId)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var purchaseReturn = await _context.PurchaseReturns
                .Include(pr => pr.OriginalInvoice).Include(pr => pr.Supplier).Include(pr => pr.Warehouse)
                .Include(pr => pr.Lines).ThenInclude(l => l.Product)
                .FirstOrDefaultAsync(pr => pr.Id == id)
                ?? throw new KeyNotFoundException($"Purchase Return '{id}' not found.");
            if (purchaseReturn.Status != JournalEntryStatus.Draft)
                throw new InvalidOperationException($"Only Draft returns can be posted. Current status: '{purchaseReturn.Status}'.");

            // Resolve accounts from AccountingDefaults per company (ACCOUNTING_RULES §30)
            var (inventoryAccount, apAccount) =
                await AccountResolutionHelper.ResolvePurchaseAccountsAsync(_context, purchaseReturn.CompanyId);

            var jeCount = await _context.JournalEntries.CountAsync();
            var journalEntry = new JournalEntry
            {
                EntryNumber = $"JE-PR-{DateTime.UtcNow:yyyyMM}-{jeCount + 1:D4}",
                EntryDate = purchaseReturn.ReturnDate,
                Description = $"Purchase Return {purchaseReturn.ReturnNumber} — {purchaseReturn.Supplier.Name}",
                Status = JournalEntryStatus.Posted, PostedAt = DateTime.UtcNow,
                PostedByUserId = postedByUserId, CreatedAt = DateTime.UtcNow
            };

            decimal totalReturnCost = purchaseReturn.Lines.Sum(l => l.Quantity * l.UnitCost);

            // Debit AP (reduce what we owe), Credit Inventory (reduce inventory value)
            journalEntry.Lines.Add(new JournalEntryLine { AccountId = apAccount.Id, Debit = purchaseReturn.TotalAmount, Credit = 0m, Description = $"Return AP — {purchaseReturn.Supplier.Name}" });
            journalEntry.Lines.Add(new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = 0m, Credit = totalReturnCost, Description = $"Return Inventory — {purchaseReturn.ReturnNumber}" });

            _context.JournalEntries.Add(journalEntry);
            await _context.SaveChangesAsync();

            apAccount.Balance -= purchaseReturn.TotalAmount; apAccount.UpdatedAt = DateTime.UtcNow;
            inventoryAccount.Balance -= totalReturnCost; inventoryAccount.UpdatedAt = DateTime.UtcNow;

            // Outbound stock movements
            foreach (var line in purchaseReturn.Lines)
            {
                _context.StockMovements.Add(new StockMovement
                {
                    ProductId = line.ProductId, WarehouseId = purchaseReturn.WarehouseId,
                    MovementType = MovementType.Out, Quantity = line.Quantity,
                    UnitCost = line.UnitCost, ReferenceDocument = purchaseReturn.ReturnNumber,
                    Notes = $"Purchase Return — {purchaseReturn.ReturnNumber}",
                    MovementDate = purchaseReturn.ReturnDate, CreatedByUserId = postedByUserId,
                    CreatedAt = DateTime.UtcNow
                });
                line.Product.CurrentStock -= line.Quantity;
                line.Product.UpdatedAt = DateTime.UtcNow;
            }

            purchaseReturn.Supplier.Balance -= purchaseReturn.TotalAmount;
            purchaseReturn.Supplier.UpdatedAt = DateTime.UtcNow;
            purchaseReturn.JournalEntryId = journalEntry.Id;
            purchaseReturn.Status = JournalEntryStatus.Posted;
            purchaseReturn.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();
            _logger.LogInformation("Purchase Return '{ReturnNumber}' posted.", purchaseReturn.ReturnNumber);
            return await GetPurchaseReturnByIdAsync(purchaseReturn.Id) ?? throw new InvalidOperationException("Failed to reload posted return.");
        }
        catch
        {
            if (transaction != null) await transaction.RollbackAsync();
            throw;
        }
    }

    // ── Mappers ──
    private static PurchaseInvoiceDto MapToInvoiceDto(PurchaseInvoice pi)
    {
        var lines = pi.Lines.Select(l => new PurchaseInvoiceLineDto(
            l.Id, l.ProductId, l.Product?.SKU ?? "", l.Product?.Name ?? "",
            l.Quantity, l.DirectUnitPrice, l.AllocatedAdditionalCost, l.EffectiveUnitCost, l.TotalPrice, l.Notes
        )).ToList();
        return new PurchaseInvoiceDto(
            pi.Id, pi.InvoiceNumber, pi.SupplierId, pi.Supplier?.Name ?? "", pi.Supplier?.Code ?? "",
            pi.WarehouseId, pi.Warehouse?.Name ?? "", pi.InvoiceDate, pi.DueDate,
            pi.Status, pi.Status.ToString(), pi.SubTotal, pi.TaxAmount, pi.AdditionalCosts,
            pi.TotalAmount, pi.Notes, pi.JournalEntryId, lines, pi.CreatedAt
        );
    }

    private static PurchaseReturnDto MapToReturnDto(PurchaseReturn pr)
    {
        var lines = pr.Lines.Select(l => new PurchaseReturnLineDto(
            l.Id, l.ProductId, l.Product?.SKU ?? "", l.Product?.Name ?? "",
            (l.OriginalInvoiceLineId ?? Guid.Empty), l.Quantity, l.UnitCost, l.TotalPrice, l.Notes
        )).ToList();
        return new PurchaseReturnDto(
            pr.Id, pr.ReturnNumber, pr.OriginalInvoiceId, pr.OriginalInvoice?.InvoiceNumber ?? "",
            pr.SupplierId, pr.Supplier?.Name ?? "", pr.WarehouseId, pr.Warehouse?.Name ?? "",
            pr.ReturnDate, pr.Status, pr.Status.ToString(), pr.TotalAmount, pr.Notes, pr.JournalEntryId, lines, pr.CreatedAt
        );
    }
}
