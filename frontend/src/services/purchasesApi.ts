import { api } from './api';

export type JournalEntryStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface SupplierDto {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  address: string | null;
  balance: number;
  isActive: boolean;
  invoiceCount: number;
  createdAt: string;
}

export interface PurchaseInvoiceLineRequest {
  productId: string;
  quantity: number;
  directUnitPrice: number;
  notes: string | null;
}

export interface PurchaseInvoiceLineDto {
  id: string;
  productId: string;
  productSKU: string;
  productName: string;
  quantity: number;
  directUnitPrice: number;
  allocatedAdditionalCost: number;
  effectiveUnitCost: number;
  totalPrice: number;
  notes: string | null;
}

export interface PurchaseInvoiceDto {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  warehouseId: string;
  warehouseName: string;
  invoiceDate: string;
  dueDate: string | null;
  status: JournalEntryStatus;
  statusName: string;
  subTotal: number;
  taxAmount: number;
  additionalCosts: number;
  totalAmount: number;
  notes: string | null;
  journalEntryId: string | null;
  lines: PurchaseInvoiceLineDto[];
  createdAt: string;
}

export interface CreatePurchaseInvoiceRequest {
  supplierId: string;
  warehouseId: string;
  lines: PurchaseInvoiceLineRequest[];
  invoiceDate: string | null;
  dueDate: string | null;
  taxAmount: number;
  additionalCosts: number;
  notes: string | null;
}

export interface PurchaseReturnLineRequest {
  originalInvoiceLineId: string;
  quantity: number;
  notes: string | null;
}

export interface PurchaseReturnLineDto {
  id: string;
  productId: string;
  productSKU: string;
  productName: string;
  originalInvoiceLineId: string;
  quantity: number;
  unitCost: number;
  totalPrice: number;
  notes: string | null;
}

export interface PurchaseReturnDto {
  id: string;
  returnNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  returnDate: string;
  status: JournalEntryStatus;
  statusName: string;
  totalAmount: number;
  notes: string | null;
  journalEntryId: string | null;
  lines: PurchaseReturnLineDto[];
  createdAt: string;
}

export interface CreatePurchaseReturnRequest {
  originalInvoiceId: string;
  notes: string | null;
  lines: PurchaseReturnLineRequest[];
}

export const purchasesApi = {
  // Suppliers
  getSuppliers: (params?: { activeOnly?: boolean; search?: string }) => {
    const qp = new URLSearchParams();
    if (params?.activeOnly !== undefined) qp.set('activeOnly', String(params.activeOnly));
    if (params?.search) qp.set('search', params.search);
    const qs = qp.toString();
    return api.get<SupplierDto[]>(`/api/suppliers${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  createSupplier: (data: { code: string; name: string; phone: string | null; email: string | null; taxNumber: string | null; address: string | null; isActive: boolean }) =>
    api.post<SupplierDto>('/api/suppliers', data).then(r => r.data),
  updateSupplier: (id: string, data: { code: string; name: string; phone: string | null; email: string | null; taxNumber: string | null; address: string | null; isActive: boolean }) =>
    api.put<SupplierDto>(`/api/suppliers/${id}`, data).then(r => r.data),

  // Purchase Invoices
  getInvoices: (params?: { status?: JournalEntryStatus; search?: string }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.search) qp.set('search', params.search);
    const qs = qp.toString();
    return api.get<PurchaseInvoiceDto[]>(`/api/purchases/invoices${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  getInvoiceById: (id: string) => api.get<PurchaseInvoiceDto>(`/api/purchases/invoices/${id}`).then(r => r.data),
  createInvoice: (data: CreatePurchaseInvoiceRequest) => api.post<PurchaseInvoiceDto>('/api/purchases/invoices', data).then(r => r.data),
  postInvoice: (id: string) => api.post<{ success: boolean; message: string; invoice: PurchaseInvoiceDto }>(`/api/purchases/invoices/${id}/post`).then(r => r.data),
  cancelInvoice: (id: string) => api.post<{ success: boolean; message: string; invoice: PurchaseInvoiceDto }>(`/api/purchases/invoices/${id}/cancel`).then(r => r.data),

  // Purchase Returns
  getReturns: (params?: { status?: JournalEntryStatus }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    const qs = qp.toString();
    return api.get<PurchaseReturnDto[]>(`/api/purchases/returns${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  getReturnById: (id: string) => api.get<PurchaseReturnDto>(`/api/purchases/returns/${id}`).then(r => r.data),
  createReturn: (data: CreatePurchaseReturnRequest) => api.post<PurchaseReturnDto>('/api/purchases/returns', data).then(r => r.data),
  postReturn: (id: string) => api.post<{ success: boolean; message: string; purchaseReturn: PurchaseReturnDto }>(`/api/purchases/returns/${id}/post`).then(r => r.data),
};
