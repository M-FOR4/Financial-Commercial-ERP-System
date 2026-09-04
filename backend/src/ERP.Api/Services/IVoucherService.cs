using ERP.Api.DTOs;

namespace ERP.Api.Services;

public interface IVoucherService
{
    // Cash Vouchers
    Task<List<CashVoucherResponse>> GetAllCashVouchersAsync();
    Task<CashVoucherResponse?> GetCashVoucherByIdAsync(Guid id);
    Task<CashVoucherResponse> CreateCashVoucherAsync(CashVoucherRequest request, Guid? userId, Guid companyId);
    Task<CashVoucherResponse?> PostCashVoucherAsync(Guid id);
    Task<CashVoucherResponse?> CancelCashVoucherAsync(Guid id);

    // Transfer Vouchers
    Task<List<TransferVoucherResponse>> GetAllTransferVouchersAsync();
    Task<TransferVoucherResponse?> GetTransferVoucherByIdAsync(Guid id);
    Task<TransferVoucherResponse> CreateTransferVoucherAsync(TransferVoucherRequest request, Guid? userId = null);
    Task<TransferVoucherResponse?> PostTransferVoucherAsync(Guid id);
    Task<TransferVoucherResponse?> CancelTransferVoucherAsync(Guid id);
}
