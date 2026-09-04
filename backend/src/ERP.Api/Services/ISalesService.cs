using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface ISalesService
{
    // Sales Invoices
    Task<List<SalesInvoiceDto>> GetSalesInvoicesAsync(JournalEntryStatus? status = null, string? search = null);
    Task<SalesInvoiceDto?> GetSalesInvoiceByIdAsync(Guid id);
    Task<SalesInvoiceDto> CreateSalesInvoiceDraftAsync(CreateSalesInvoiceRequest request, Guid companyId);
    Task<SalesInvoiceDto> PostSalesInvoiceAsync(Guid id, Guid? postedByUserId);
    Task<SalesInvoiceDto> CancelSalesInvoiceAsync(Guid id);

    // Sales Returns
    Task<List<SalesReturnDto>> GetSalesReturnsAsync(JournalEntryStatus? status = null);
    Task<SalesReturnDto?> GetSalesReturnByIdAsync(Guid id);
    Task<SalesReturnDto> CreateSalesReturnDraftAsync(CreateSalesReturnRequest request);
    Task<SalesReturnDto> PostSalesReturnAsync(Guid id, Guid? postedByUserId);
}
