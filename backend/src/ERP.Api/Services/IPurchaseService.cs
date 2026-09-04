using ERP.Api.Domain.Enums;
using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface IPurchaseService
{
    Task<List<PurchaseInvoiceDto>> GetPurchaseInvoicesAsync(JournalEntryStatus? status = null, string? search = null);
    Task<PurchaseInvoiceDto?> GetPurchaseInvoiceByIdAsync(Guid id);
    Task<PurchaseInvoiceDto> CreatePurchaseInvoiceDraftAsync(CreatePurchaseInvoiceRequest request, Guid companyId);
    Task<PurchaseInvoiceDto> PostPurchaseInvoiceAsync(Guid id, Guid? postedByUserId);
    Task<PurchaseInvoiceDto> CancelPurchaseInvoiceAsync(Guid id);

    Task<List<PurchaseReturnDto>> GetPurchaseReturnsAsync(JournalEntryStatus? status = null);
    Task<PurchaseReturnDto?> GetPurchaseReturnByIdAsync(Guid id);
    Task<PurchaseReturnDto> CreatePurchaseReturnDraftAsync(CreatePurchaseReturnRequest request);
    Task<PurchaseReturnDto> PostPurchaseReturnAsync(Guid id, Guid? postedByUserId);
}
