import { api } from './api';

export type JournalEntryStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface CustomerDto {
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

export interface CreateCustomerRequest {
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  address: string | null;
  isActive: boolean;
}

export interface SalesInvoiceLineRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
}

export interface SalesInvoiceLineDto {
  id: string;
  productId: string;
  productSKU: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCostAtSale: number;
  totalPrice: number;
  notes: string | null;
}

export interface SalesInvoiceDto {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  warehouseId: string;
  warehouseName: string;
  invoiceDate: string;
  dueDate: string | null;
  status: JournalEntryStatus;
  statusName: string;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
  journalEntryId: string | null;
  lines: SalesInvoiceLineDto[];
  createdAt: string;
}

export interface CreateSalesInvoiceRequest {
  customerId: string;
  warehouseId: string;
  lines: SalesInvoiceLineRequest[];
  invoiceDate: string | null;
  dueDate: string | null;
  discountAmount: number;
  taxRate: number;
  notes: string | null;
}

export interface SalesReturnLineRequest {
  originalInvoiceLineId: string;
  quantity: number;
  notes: string | null;
}

export interface SalesReturnLineDto {
  id: string;
  productId: string;
  productSKU: string;
  productName: string;
  originalInvoiceLineId: string;
  quantity: number;
  restockUnitCost: number;
  totalPrice: number;
  notes: string | null;
}

export interface SalesReturnDto {
  id: string;
  returnNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  returnDate: string;
  status: JournalEntryStatus;
  statusName: string;
  totalAmount: number;
  notes: string | null;
  journalEntryId: string | null;
  lines: SalesReturnLineDto[];
  createdAt: string;
}

export interface CreateSalesReturnRequest {
  originalInvoiceId: string;
  notes: string | null;
  lines: SalesReturnLineRequest[];
}

export const salesApi = {
  // Customers
  getCustomers: (params?: { activeOnly?: boolean; search?: string }) => {
    const qp = new URLSearchParams();
    if (params?.activeOnly !== undefined) qp.set('activeOnly', String(params.activeOnly));
    if (params?.search) qp.set('search', params.search);
    const qs = qp.toString();
    return api.get<CustomerDto[]>(`/api/customers${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  getCustomerById: (id: string) => api.get<CustomerDto>(`/api/customers/${id}`).then(r => r.data),
  createCustomer: (data: CreateCustomerRequest) => api.post<CustomerDto>('/api/customers', data).then(r => r.data),
  updateCustomer: (id: string, data: CreateCustomerRequest) => api.put<CustomerDto>(`/api/customers/${id}`, data).then(r => r.data),

  // Sales Invoices
  getInvoices: (params?: { status?: JournalEntryStatus; search?: string }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.search) qp.set('search', params.search);
    const qs = qp.toString();
    return api.get<SalesInvoiceDto[]>(`/api/sales/invoices${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  getInvoiceById: (id: string) => api.get<SalesInvoiceDto>(`/api/sales/invoices/${id}`).then(r => r.data),
  createInvoice: (data: CreateSalesInvoiceRequest) => api.post<SalesInvoiceDto>('/api/sales/invoices', data).then(r => r.data),
  postInvoice: (id: string) => api.post<{ success: boolean; message: string; invoice: SalesInvoiceDto }>(`/api/sales/invoices/${id}/post`).then(r => r.data),
  cancelInvoice: (id: string) => api.post<{ success: boolean; message: string; invoice: SalesInvoiceDto }>(`/api/sales/invoices/${id}/cancel`).then(r => r.data),

  // Sales Returns
  getReturns: (params?: { status?: JournalEntryStatus }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    const qs = qp.toString();
    return api.get<SalesReturnDto[]>(`/api/sales/returns${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  getReturnById: (id: string) => api.get<SalesReturnDto>(`/api/sales/returns/${id}`).then(r => r.data),
  createReturn: (data: CreateSalesReturnRequest) => api.post<SalesReturnDto>('/api/sales/returns', data).then(r => r.data),
  postReturn: (id: string) => api.post<{ success: boolean; message: string; salesReturn: SalesReturnDto }>(`/api/sales/returns/${id}/post`).then(r => r.data),
};
