using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services;

public class SalesService : ISalesService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SalesService> _logger;

    public SalesService(AppDbContext context, ILogger<SalesService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ═══════════════════════════════════════════
    //  Sales Invoices
    // ═══════════════════════════════════════════

    public async Task<List<SalesInvoiceDto>> GetSalesInvoicesAsync(JournalEntryStatus? status = null, string? search = null)
    {
        var query = _context.SalesInvoices
            .Include(si => si.Customer)
            .Include(si => si.Warehouse)
            .Include(si => si.Lines).ThenInclude(l => l.Product)
            .AsNoTracking()
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(si => si.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(si => si.InvoiceNumber.ToLower().Contains(s) || si.Customer.Name.ToLower().Contains(s));
        }

        var invoices = await query.OrderByDescending(si => si.InvoiceDate).ToListAsync();
        return invoices.Select(MapToInvoiceDto).ToList();
    }

    public async Task<SalesInvoiceDto?> GetSalesInvoiceByIdAsync(Guid id)
    {
        var si = await _context.SalesInvoices
            .Include(x => x.Customer)
            .Include(x => x.Warehouse)
            .Include(x => x.Lines).ThenInclude(l => l.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        return si == null ? null : MapToInvoiceDto(si);
    }

    public async Task<SalesInvoiceDto> CreateSalesInvoiceDraftAsync(CreateSalesInvoiceRequest request, Guid companyId)
    {
        var customer = await _context.Customers.FindAsync(request.CustomerId);
        if (customer == null)
            throw new InvalidOperationException("Customer does not exist.");

        var warehouse = await _context.Warehouses.FindAsync(request.WarehouseId);
        if (warehouse == null)
            throw new InvalidOperationException("Warehouse does not exist.");

        if (request.Lines == null || request.Lines.Count == 0)
            throw new InvalidOperationException("At least one invoice line is required.");

        // Generate invoice number
        var count = await _context.SalesInvoices.CountAsync();
        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMM}-{count + 1:D4}";

        var invoice = new SalesInvoice
        {
            CompanyId = companyId,
            InvoiceNumber = invoiceNumber,
            CustomerId = request.CustomerId,
            WarehouseId = request.WarehouseId,
            InvoiceDate = request.InvoiceDate ?? DateTime.UtcNow,
            DueDate = request.DueDate,
            DiscountAmount = request.DiscountAmount,
            Notes = request.Notes?.Trim(),
            Status = JournalEntryStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var lineReq in request.Lines)
        {
            var product = await _context.Products.FindAsync(lineReq.ProductId);
            if (product == null)
                throw new InvalidOperationException($"Product ID '{lineReq.ProductId}' does not exist.");

            // D-029: Snapshot current purchase price as UnitCostAtSale at time of invoice creation
            var unitCostAtSale = product.PurchasePrice;

            var totalPrice = lineReq.Quantity * lineReq.UnitPrice;

            invoice.Lines.Add(new SalesInvoiceLine
            {
                ProductId = lineReq.ProductId,
                Quantity = lineReq.Quantity,
                UnitPrice = lineReq.UnitPrice,
                UnitCostAtSale = unitCostAtSale,
                TotalPrice = totalPrice,
                Notes = lineReq.Notes?.Trim()
            });
        }

        // Calculate totals
        var subTotal = invoice.Lines.Sum(l => l.TotalPrice);
        var taxAmount = subTotal * (request.TaxRate / 100m);
        invoice.SubTotal = subTotal;
        invoice.TaxAmount = taxAmount;
        invoice.TotalAmount = subTotal + taxAmount - invoice.DiscountAmount;

        _context.SalesInvoices.Add(invoice);
        await _context.SaveChangesAsync();

        return await GetSalesInvoiceByIdAsync(invoice.Id)
            ?? throw new InvalidOperationException("Failed to load created invoice.");
    }

    public async Task<SalesInvoiceDto> PostSalesInvoiceAsync(Guid id, Guid? postedByUserId)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var invoice = await _context.SalesInvoices
                .Include(si => si.Customer)
                .Include(si => si.Warehouse)
                .Include(si => si.Lines).ThenInclude(l => l.Product)
                .FirstOrDefaultAsync(si => si.Id == id);

            if (invoice == null)
                throw new KeyNotFoundException($"Sales Invoice with ID '{id}' not found.");

            if (invoice.Status != JournalEntryStatus.Draft)
                throw new InvalidOperationException($"Only Draft invoices can be posted. Current status: '{invoice.Status}'.");

            // Validate stock availability for each line using Product.CurrentStock
            foreach (var line in invoice.Lines)
            {
                if (line.Product.CurrentStock < line.Quantity)
                    throw new InvalidOperationException(
                        $"Insufficient stock for '{line.Product?.Name ?? line.ProductId.ToString()}'. " +
                        $"Available: {line.Product.CurrentStock}, Requested: {line.Quantity}.");
            }

            // 1. Create Journal Entry: Debit AR, Credit Sales Revenue, Debit COGS, Credit Inventory
            // Resolve accounts from AccountingDefaults per company (ACCOUNTING_RULES §30)
            var (arAccount, salesRevenueAccount, cogsAccount, inventoryAccount) =
                await AccountResolutionHelper.ResolveSalesAccountsAsync(_context, invoice.CompanyId);

            var jeCount = await _context.JournalEntries.CountAsync();
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(fy => fy.CompanyId == invoice.CompanyId && fy.IsActive);
            if (fiscalYear == null)
                throw new InvalidOperationException("No active fiscal year found for this company.");

            var journalEntry = new JournalEntry
            {
                CompanyId = invoice.CompanyId,
                FiscalYearId = fiscalYear.Id,
                EntryNumber = $"JE-SI-{DateTime.UtcNow:yyyyMM}-{jeCount + 1:D4}",
                EntryDate = invoice.InvoiceDate,
                Description = $"Sales Invoice {invoice.InvoiceNumber} — {invoice.Customer.Name}",
                Status = JournalEntryStatus.Posted,
                PostedAt = DateTime.UtcNow,
                PostedByUserId = postedByUserId,
                SourceDocumentType = "SalesInvoice",
                SourceDocumentId = invoice.Id.ToString(),
                CreatedAt = DateTime.UtcNow
            };

            // Debit Accounts Receivable
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = arAccount.Id,
                Debit = invoice.TotalAmount,
                Credit = 0m,
                Description = $"AR — {invoice.Customer.Name}"
            });

            // Credit Sales Revenue
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = salesRevenueAccount.Id,
                Debit = 0m,
                Credit = invoice.SubTotal,
                Description = $"Sales Revenue — {invoice.InvoiceNumber}"
            });

            // Calculate total COGS and Debit COGS / Credit Inventory for each line
            decimal totalCogs = 0m;
            foreach (var line in invoice.Lines)
            {
                var cogsAmount = line.Quantity * line.UnitCostAtSale;
                totalCogs += cogsAmount;

                // Debit COGS
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    AccountId = cogsAccount.Id,
                    Debit = cogsAmount,
                    Credit = 0m,
                    Description = $"COGS — {line.Product.Name} ({line.Quantity} × {line.UnitCostAtSale})"
                });

                // Credit Inventory
                journalEntry.Lines.Add(new JournalEntryLine
                {
                    AccountId = inventoryAccount.Id,
                    Debit = 0m,
                    Credit = cogsAmount,
                    Description = $"Inventory — {line.Product.Name}"
                });
            }

            _context.JournalEntries.Add(journalEntry);
            await _context.SaveChangesAsync(); // Save JE to get its ID

            // Update account balances
            arAccount.Balance += invoice.TotalAmount;
            arAccount.UpdatedAt = DateTime.UtcNow;
            salesRevenueAccount.Balance += invoice.SubTotal;
            salesRevenueAccount.UpdatedAt = DateTime.UtcNow;
            cogsAccount.Balance += totalCogs;
            cogsAccount.UpdatedAt = DateTime.UtcNow;
            inventoryAccount.Balance -= totalCogs;
            inventoryAccount.UpdatedAt = DateTime.UtcNow;

            // 2. Create outbound Stock Movements and update product stock
            foreach (var line in invoice.Lines)
            {
                var stockMovement = new StockMovement
                {
                    CompanyId = invoice.CompanyId,
                    ProductId = line.ProductId,
                    WarehouseId = invoice.WarehouseId,
                    MovementType = MovementType.Out,
                    Quantity = line.Quantity,
                    UnitCost = line.UnitCostAtSale,
                    ReferenceDocument = invoice.InvoiceNumber,
                    Notes = $"Sale — {invoice.InvoiceNumber}",
                    MovementDate = invoice.InvoiceDate,
                    CreatedByUserId = postedByUserId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.StockMovements.Add(stockMovement);

                // Update product stock
                var product = line.Product;
                product.CurrentStock -= line.Quantity;
                product.UpdatedAt = DateTime.UtcNow;
            }

            // 3. Update customer balance
            invoice.Customer.Balance += invoice.TotalAmount;
            invoice.Customer.UpdatedAt = DateTime.UtcNow;

            // 4. Update invoice status
            invoice.JournalEntryId = journalEntry.Id;
            invoice.Status = JournalEntryStatus.Posted;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            _logger.LogInformation("Sales Invoice '{InvoiceNumber}' posted successfully. Total: {Total:F4}, COGS: {Cogs:F4}",
                invoice.InvoiceNumber, invoice.TotalAmount, totalCogs);

            return await GetSalesInvoiceByIdAsync(invoice.Id)
                ?? throw new InvalidOperationException("Failed to reload posted invoice.");
        }
        catch
        {
            if (transaction != null) await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<SalesInvoiceDto> CancelSalesInvoiceAsync(Guid id)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var invoice = await _context.SalesInvoices
                .Include(si => si.Customer)
                .Include(si => si.Warehouse)
                .Include(si => si.Lines).ThenInclude(l => l.Product)
                .FirstOrDefaultAsync(si => si.Id == id);

            if (invoice == null)
                throw new KeyNotFoundException($"Sales Invoice with ID '{id}' not found.");

            if (invoice.Status != JournalEntryStatus.Posted)
                throw new InvalidOperationException($"Only Posted invoices can be cancelled. Current status: '{invoice.Status}'.");

            // 1. Reverse the Journal Entry
            // Resolve accounts from AccountingDefaults per company (ACCOUNTING_RULES §30)
            var (arAccount, salesRevenueAccount, cogsAccount, inventoryAccount) =
                await AccountResolutionHelper.ResolveSalesAccountsAsync(_context, invoice.CompanyId);

            var jeCount = await _context.JournalEntries.CountAsync();
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(fy => fy.CompanyId == invoice.CompanyId && fy.IsActive);
            if (fiscalYear == null)
                throw new InvalidOperationException("No active fiscal year found for this company.");

            var reversalEntry = new JournalEntry
            {
                CompanyId = invoice.CompanyId,
                FiscalYearId = fiscalYear.Id,
                EntryNumber = $"JE-SIC-{DateTime.UtcNow:yyyyMM}-{jeCount + 1:D4}",
                EntryDate = DateTime.UtcNow,
                Description = $"Reversal — Sales Invoice {invoice.InvoiceNumber}",
                Status = JournalEntryStatus.Posted,
                PostedAt = DateTime.UtcNow,
                PostedByUserId = null,
                SourceDocumentType = "SalesInvoiceCancel",
                SourceDocumentId = invoice.Id.ToString(),
                CreatedAt = DateTime.UtcNow
            };

            decimal totalCogs = 0m;
            foreach (var line in invoice.Lines)
            {
                var cogsAmount = line.Quantity * line.UnitCostAtSale;
                totalCogs += cogsAmount;
            }

            // Reverse: Credit AR, Debit Sales Revenue, Credit COGS, Debit Inventory
            reversalEntry.Lines.Add(new JournalEntryLine { AccountId = arAccount.Id, Debit = 0m, Credit = invoice.TotalAmount, Description = $"Reversal AR — {invoice.InvoiceNumber}" });
            reversalEntry.Lines.Add(new JournalEntryLine { AccountId = salesRevenueAccount.Id, Debit = invoice.SubTotal, Credit = 0m, Description = $"Reversal Revenue — {invoice.InvoiceNumber}" });
            reversalEntry.Lines.Add(new JournalEntryLine { AccountId = cogsAccount.Id, Debit = 0m, Credit = totalCogs, Description = $"Reversal COGS — {invoice.InvoiceNumber}" });
            reversalEntry.Lines.Add(new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = totalCogs, Credit = 0m, Description = $"Reversal Inventory — {invoice.InvoiceNumber}" });

            _context.JournalEntries.Add(reversalEntry);
            await _context.SaveChangesAsync();

            // Update account balances (reversal)
            arAccount.Balance -= invoice.TotalAmount;
            arAccount.UpdatedAt = DateTime.UtcNow;
            salesRevenueAccount.Balance -= invoice.SubTotal;
            salesRevenueAccount.UpdatedAt = DateTime.UtcNow;
            cogsAccount.Balance -= totalCogs;
            cogsAccount.UpdatedAt = DateTime.UtcNow;
            inventoryAccount.Balance += totalCogs;
            inventoryAccount.UpdatedAt = DateTime.UtcNow;

            // 2. Create inbound stock movements to restore inventory
            foreach (var line in invoice.Lines)
            {
                var stockMovement = new StockMovement
                {
                    CompanyId = invoice.CompanyId,
                    ProductId = line.ProductId,
                    WarehouseId = invoice.WarehouseId,
                    MovementType = MovementType.In,
                    Quantity = line.Quantity,
                    UnitCost = line.UnitCostAtSale,
                    ReferenceDocument = $"CANCEL-{invoice.InvoiceNumber}",
                    Notes = $"Cancellation reversal — {invoice.InvoiceNumber}",
                    MovementDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _context.StockMovements.Add(stockMovement);

                var product = line.Product;
                product.CurrentStock += line.Quantity;
                product.UpdatedAt = DateTime.UtcNow;
            }

            // 3. Reverse customer balance
            invoice.Customer.Balance -= invoice.TotalAmount;
            invoice.Customer.UpdatedAt = DateTime.UtcNow;

            // 4. Update invoice status
            invoice.Status = JournalEntryStatus.Cancelled;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            _logger.LogInformation("Sales Invoice '{InvoiceNumber}' cancelled. Ledger balances reversed.", invoice.InvoiceNumber);

            return await GetSalesInvoiceByIdAsync(invoice.Id)
                ?? throw new InvalidOperationException("Failed to reload cancelled invoice.");
        }
        catch
        {
            if (transaction != null) await transaction.RollbackAsync();
            throw;
        }
    }

    // ═══════════════════════════════════════════
    //  Sales Returns
    // ═══════════════════════════════════════════

    public async Task<List<SalesReturnDto>> GetSalesReturnsAsync(JournalEntryStatus? status = null)
    {
        var query = _context.SalesReturns
            .Include(sr => sr.OriginalInvoice)
            .Include(sr => sr.Customer)
            .Include(sr => sr.Warehouse)
            .Include(sr => sr.Lines).ThenInclude(l => l.Product)
            .Include(sr => sr.Lines).ThenInclude(l => l.OriginalInvoiceLine)
            .AsNoTracking()
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(sr => sr.Status == status.Value);

        var returns = await query.OrderByDescending(sr => sr.ReturnDate).ToListAsync();
        return returns.Select(MapToReturnDto).ToList();
    }

    public async Task<SalesReturnDto?> GetSalesReturnByIdAsync(Guid id)
    {
        var sr = await _context.SalesReturns
            .Include(x => x.OriginalInvoice)
            .Include(x => x.Customer)
            .Include(x => x.Warehouse)
            .Include(x => x.Lines).ThenInclude(l => l.Product)
            .Include(x => x.Lines).ThenInclude(l => l.OriginalInvoiceLine)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        return sr == null ? null : MapToReturnDto(sr);
    }

    public async Task<SalesReturnDto> CreateSalesReturnDraftAsync(CreateSalesReturnRequest request)
    {
        var originalInvoice = await _context.SalesInvoices
            .Include(si => si.Customer)
            .Include(si => si.Warehouse)
            .Include(si => si.Lines)
            .FirstOrDefaultAsync(si => si.Id == request.OriginalInvoiceId);

        if (originalInvoice == null)
            throw new InvalidOperationException("Original invoice does not exist.");

        if (originalInvoice.Status != JournalEntryStatus.Posted)
            throw new InvalidOperationException("Returns can only be created against Posted invoices.");

        if (request.Lines == null || request.Lines.Count == 0)
            throw new InvalidOperationException("At least one return line is required.");

        var returnCount = await _context.SalesReturns.CountAsync();
        var returnNumber = $"RET-{DateTime.UtcNow:yyyyMM}-{returnCount + 1:D4}";

        var salesReturn = new SalesReturn
        {
            ReturnNumber = returnNumber,
            OriginalInvoiceId = request.OriginalInvoiceId,
            CustomerId = originalInvoice.CustomerId,
            WarehouseId = originalInvoice.WarehouseId,
            ReturnDate = DateTime.UtcNow,
            Status = JournalEntryStatus.Draft,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        decimal totalReturn = 0m;
        foreach (var lineReq in request.Lines)
        {
            var originalLine = await _context.SalesInvoiceLines
                .Include(l => l.Product)
                .FirstOrDefaultAsync(l => l.Id == lineReq.OriginalInvoiceLineId);

            if (originalLine == null)
                throw new InvalidOperationException($"Original invoice line '{lineReq.OriginalInvoiceLineId}' not found.");

            if (originalLine.SalesInvoiceId != request.OriginalInvoiceId)
                throw new InvalidOperationException("Return line references an invoice line from a different invoice.");

            if (lineReq.Quantity > originalLine.Quantity)
                throw new InvalidOperationException(
                    $"Return quantity ({lineReq.Quantity}) cannot exceed original quantity ({originalLine.Quantity}).");

            // D-029: Lock RestockUnitCost to original UnitCostAtSale
            var restockUnitCost = originalLine.UnitCostAtSale;
            var totalPrice = lineReq.Quantity * originalLine.UnitPrice;

            salesReturn.Lines.Add(new SalesReturnLine
            {
                ProductId = originalLine.ProductId,
                OriginalInvoiceLineId = lineReq.OriginalInvoiceLineId,
                Quantity = lineReq.Quantity,
                RestockUnitCost = restockUnitCost,
                TotalPrice = totalPrice,
                Notes = lineReq.Notes?.Trim()
            });

            totalReturn += totalPrice;
        }

        salesReturn.TotalAmount = totalReturn;

        _context.SalesReturns.Add(salesReturn);
        await _context.SaveChangesAsync();

        return await GetSalesReturnByIdAsync(salesReturn.Id)
            ?? throw new InvalidOperationException("Failed to load created return.");
    }

    public async Task<SalesReturnDto> PostSalesReturnAsync(Guid id, Guid? postedByUserId)
    {
        var isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var salesReturn = await _context.SalesReturns
                .Include(sr => sr.OriginalInvoice)
                .Include(sr => sr.Customer)
                .Include(sr => sr.Warehouse)
                .Include(sr => sr.Lines).ThenInclude(l => l.Product)
                .Include(sr => sr.Lines).ThenInclude(l => l.OriginalInvoiceLine)
                .FirstOrDefaultAsync(sr => sr.Id == id);

            if (salesReturn == null)
                throw new KeyNotFoundException($"Sales Return with ID '{id}' not found.");

            if (salesReturn.Status != JournalEntryStatus.Draft)
                throw new InvalidOperationException($"Only Draft returns can be posted. Current status: '{salesReturn.Status}'.");

            // 1. Create Journal Entry: Reverse original sale (Credit AR, Debit Sales Returns, Debit Inventory, Credit COGS)
            // Resolve accounts from AccountingDefaults per company (ACCOUNTING_RULES §30)
            var (arAccount, salesRevenueAccount, cogsAccount, inventoryAccount) =
                await AccountResolutionHelper.ResolveSalesAccountsAsync(_context, salesReturn.CompanyId);

            var jeCount = await _context.JournalEntries.CountAsync();
            var journalEntry = new JournalEntry
            {
                EntryNumber = $"JE-SR-{DateTime.UtcNow:yyyyMM}-{jeCount + 1:D4}",
                EntryDate = salesReturn.ReturnDate,
                Description = $"Sales Return {salesReturn.ReturnNumber} — {salesReturn.Customer.Name}",
                Status = JournalEntryStatus.Posted,
                PostedAt = DateTime.UtcNow,
                PostedByUserId = postedByUserId,
                CreatedAt = DateTime.UtcNow
            };

            decimal totalCogs = 0m;
            foreach (var line in salesReturn.Lines)
            {
                // D-029: Use RestockUnitCost (locked to original UnitCostAtSale)
                var cogsAmount = line.Quantity * line.RestockUnitCost;
                totalCogs += cogsAmount;
            }

            // Credit AR (reduce customer balance)
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = arAccount.Id, Debit = 0m, Credit = salesReturn.TotalAmount,
                Description = $"Return AR — {salesReturn.Customer.Name}"
            });

            // Debit Sales Revenue (reduce revenue)
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = salesRevenueAccount.Id, Debit = salesReturn.TotalAmount, Credit = 0m,
                Description = $"Return Revenue — {salesReturn.ReturnNumber}"
            });

            // Debit Inventory (restore inventory value at original cost)
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = inventoryAccount.Id, Debit = totalCogs, Credit = 0m,
                Description = $"Return Inventory — {salesReturn.ReturnNumber}"
            });

            // Credit COGS (reverse COGS)
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = cogsAccount.Id, Debit = 0m, Credit = totalCogs,
                Description = $"Return COGS — {salesReturn.ReturnNumber}"
            });

            _context.JournalEntries.Add(journalEntry);
            await _context.SaveChangesAsync();

            // Update account balances
            arAccount.Balance -= salesReturn.TotalAmount;
            arAccount.UpdatedAt = DateTime.UtcNow;
            salesRevenueAccount.Balance -= salesReturn.TotalAmount;
            salesRevenueAccount.UpdatedAt = DateTime.UtcNow;
            inventoryAccount.Balance += totalCogs;
            inventoryAccount.UpdatedAt = DateTime.UtcNow;
            cogsAccount.Balance -= totalCogs;
            cogsAccount.UpdatedAt = DateTime.UtcNow;

            // 2. Create inbound stock movements (D-029: restock at original cost)
            foreach (var line in salesReturn.Lines)
            {
                var stockMovement = new StockMovement
                {
                    ProductId = line.ProductId,
                    WarehouseId = salesReturn.WarehouseId,
                    MovementType = MovementType.In,
                    Quantity = line.Quantity,
                    UnitCost = line.RestockUnitCost, // D-029: locked cost at sale
                    ReferenceDocument = salesReturn.ReturnNumber,
                    Notes = $"Return — {salesReturn.ReturnNumber}",
                    MovementDate = salesReturn.ReturnDate,
                    CreatedByUserId = postedByUserId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.StockMovements.Add(stockMovement);

                // Update product stock
                var product = line.Product;
                product.CurrentStock += line.Quantity;
                product.UpdatedAt = DateTime.UtcNow;
            }

            // 3. Update customer balance
            salesReturn.Customer.Balance -= salesReturn.TotalAmount;
            salesReturn.Customer.UpdatedAt = DateTime.UtcNow;

            // 4. Update return status
            salesReturn.JournalEntryId = journalEntry.Id;
            salesReturn.Status = JournalEntryStatus.Posted;
            salesReturn.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            _logger.LogInformation("Sales Return '{ReturnNumber}' posted. Total: {Total:F4}, Restock cost: {Cogs:F4}",
                salesReturn.ReturnNumber, salesReturn.TotalAmount, totalCogs);

            return await GetSalesReturnByIdAsync(salesReturn.Id)
                ?? throw new InvalidOperationException("Failed to reload posted return.");
        }
        catch
        {
            if (transaction != null) await transaction.RollbackAsync();
            throw;
        }
    }

    // ═══════════════════════════════════════════
    //  Private Mappers
    // ═══════════════════════════════════════════

    private static SalesInvoiceDto MapToInvoiceDto(SalesInvoice si)
    {
        var lines = si.Lines.Select(l => new SalesInvoiceLineDto(
            l.Id, l.ProductId, l.Product?.SKU ?? "", l.Product?.Name ?? "",
            l.Quantity, l.UnitPrice, l.UnitCostAtSale, l.TotalPrice, l.Notes
        )).ToList();

        return new SalesInvoiceDto(
            si.Id, si.InvoiceNumber,
            si.CustomerId, si.Customer?.Name ?? "", si.Customer?.Code ?? "",
            si.WarehouseId, si.Warehouse?.Name ?? "",
            si.InvoiceDate, si.DueDate,
            si.Status, si.Status.ToString(),
            si.SubTotal, si.TaxAmount, si.DiscountAmount, si.TotalAmount,
            si.Notes, si.JournalEntryId, lines, si.CreatedAt
        );
    }

    private static SalesReturnDto MapToReturnDto(SalesReturn sr)
    {
        var lines = sr.Lines.Select(l => new SalesReturnLineDto(
            l.Id, l.ProductId, l.Product?.SKU ?? "", l.Product?.Name ?? "",
            (l.OriginalInvoiceLineId ?? Guid.Empty), l.Quantity, l.RestockUnitCost, l.TotalPrice, l.Notes
        )).ToList();

        return new SalesReturnDto(
            sr.Id, sr.ReturnNumber,
            sr.OriginalInvoiceId, sr.OriginalInvoice?.InvoiceNumber ?? "",
            sr.CustomerId, sr.Customer?.Name ?? "",
            sr.WarehouseId, sr.Warehouse?.Name ?? "",
            sr.ReturnDate, sr.Status, sr.Status.ToString(),
            sr.TotalAmount, sr.Notes, sr.JournalEntryId, lines, sr.CreatedAt
        );
    }
}
