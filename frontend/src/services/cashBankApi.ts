import { api } from './api';

// ═══════════════════════════════════
//  TYPES
// ═══════════════════════════════════

export interface Treasury {
  id: string;
  code: string;
  name: string;
  type: 'Cash' | 'Bank';
  accountId: string;
  accountName: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface TreasuryRequest {
  code: string;
  name: string;
  type: 'Cash' | 'Bank';
  accountId: string;
  currency?: string;
}

export type VoucherType = 'Receipt' | 'Payment';
export type PartyType = 'Customer' | 'Supplier' | 'GeneralAccount';
export type DocumentStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface CashVoucher {
  id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  date: string;
  treasuryId: string;
  treasuryName: string;
  partyType: PartyType;
  partyId: string | null;
  partyName: string | null;
  targetAccountId: string;
  targetAccountName: string;
  amount: number;
  description: string;
  status: DocumentStatus;
  journalEntryId: string | null;
  journalEntryNumber: string | null;
  createdAt: string;
}

export interface CashVoucherRequest {
  voucherType: VoucherType;
  date: string;
  treasuryId: string;
  partyType: PartyType;
  partyId: string | null;
  targetAccountId: string;
  amount: number;
  description: string;
}

export interface TransferVoucher {
  id: string;
  transferNumber: string;
  date: string;
  fromTreasuryId: string;
  fromTreasuryName: string;
  toTreasuryId: string;
  toTreasuryName: string;
  amount: number;
  reference: string;
  status: DocumentStatus;
  journalEntryId: string | null;
  journalEntryNumber: string | null;
  createdAt: string;
}

export interface TransferVoucherRequest {
  date: string;
  fromTreasuryId: string;
  toTreasuryId: string;
  amount: number;
  reference: string;
}

// ═══════════════════════════════════
//  TREASURY API
// ═══════════════════════════════════

export const treasuryApi = {
  getAll: () => api.get<Treasury[]>('/api/treasuries').then(r => r.data),
  getById: (id: string) => api.get<Treasury>(`/api/treasuries/${id}`).then(r => r.data),
  create: (data: TreasuryRequest) => api.post<Treasury>('/api/treasuries', data).then(r => r.data),
  update: (id: string, data: TreasuryRequest) => api.put<Treasury>(`/api/treasuries/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/treasuries/${id}`),
};

// ═══════════════════════════════════
//  CASH VOUCHER API
// ═══════════════════════════════════

export const cashVoucherApi = {
  getAll: () => api.get<CashVoucher[]>('/api/vouchers/cash').then(r => r.data),
  getById: (id: string) => api.get<CashVoucher>(`/api/vouchers/cash/${id}`).then(r => r.data),
  create: (data: CashVoucherRequest) => api.post<CashVoucher>('/api/vouchers/cash', data).then(r => r.data),
  post: (id: string) => api.post<CashVoucher>(`/api/vouchers/cash/${id}/post`).then(r => r.data),
  cancel: (id: string) => api.post<CashVoucher>(`/api/vouchers/cash/${id}/cancel`).then(r => r.data),
};

// ═══════════════════════════════════
//  TRANSFER VOUCHER API
// ═══════════════════════════════════

export const transferVoucherApi = {
  getAll: () => api.get<TransferVoucher[]>('/api/vouchers/transfers').then(r => r.data),
  getById: (id: string) => api.get<TransferVoucher>(`/api/vouchers/transfers/${id}`).then(r => r.data),
  create: (data: TransferVoucherRequest) => api.post<TransferVoucher>('/api/vouchers/transfers', data).then(r => r.data),
  post: (id: string) => api.post<TransferVoucher>(`/api/vouchers/transfers/${id}/post`).then(r => r.data),
  cancel: (id: string) => api.post<TransferVoucher>(`/api/vouchers/transfers/${id}/cancel`).then(r => r.data),
};
