import { api } from './api';

// ── Types matching backend DTOs ──

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type JournalEntryStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface AccountDto {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  typeName: string;
  parentId: string | null;
  parentName: string | null;
  isActive: boolean;
  isHeader: boolean;
  balance: number;
  children: AccountDto[] | null;
  createdAt: string;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isHeader: boolean;
  isActive: boolean;
}

export interface UpdateAccountRequest {
  name: string;
  isHeader: boolean;
  isActive: boolean;
}

export interface JournalEntryLineDto {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface JournalEntryDto {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: JournalEntryStatus;
  statusName: string;
  postedAt: string | null;
  postedByUserId: string | null;
  postedByUserName: string | null;
  totalDebit: number;
  totalCredit: number;
  lines: JournalEntryLineDto[];
  createdAt: string;
}

export interface JournalEntryLineRequest {
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface CreateJournalEntryRequest {
  entryDate: string | null;
  description: string;
  lines: JournalEntryLineRequest[];
}

export interface UpdateJournalEntryRequest {
  entryDate: string | null;
  description: string;
  lines: JournalEntryLineRequest[];
}

// ── Accounts API ──

export const accountingApi = {
  // Accounts
  getAccountsTree: () =>
    api.get<AccountDto[]>('/api/accounts').then((r) => r.data),

  getAccountsFlat: (type?: AccountType, activeOnly?: boolean) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (activeOnly !== undefined) params.set('activeOnly', String(activeOnly));
    const qs = params.toString();
    return api.get<AccountDto[]>(`/api/accounts/flat${qs ? `?${qs}` : ''}`).then((r) => r.data);
  },

  getAccountById: (id: string) =>
    api.get<AccountDto>(`/api/accounts/${id}`).then((r) => r.data),

  createAccount: (data: CreateAccountRequest) =>
    api.post<AccountDto>('/api/accounts', data).then((r) => r.data),

  updateAccount: (id: string, data: UpdateAccountRequest) =>
    api.put<AccountDto>(`/api/accounts/${id}`, data).then((r) => r.data),

  // Journal Entries
  getJournalEntries: (params?: {
    fromDate?: string;
    toDate?: string;
    status?: JournalEntryStatus;
    search?: string;
  }) => {
    const qp = new URLSearchParams();
    if (params?.fromDate) qp.set('fromDate', params.fromDate);
    if (params?.toDate) qp.set('toDate', params.toDate);
    if (params?.status) qp.set('status', params.status);
    if (params?.search) qp.set('search', params.search);
    const qs = qp.toString();
    return api.get<JournalEntryDto[]>(`/api/journal-entries${qs ? `?${qs}` : ''}`).then((r) => r.data);
  },

  getJournalEntryById: (id: string) =>
    api.get<JournalEntryDto>(`/api/journal-entries/${id}`).then((r) => r.data),

  createJournalEntry: (data: CreateJournalEntryRequest) =>
    api.post<JournalEntryDto>('/api/journal-entries', data).then((r) => r.data),

  updateJournalEntry: (id: string, data: UpdateJournalEntryRequest) =>
    api.put<JournalEntryDto>(`/api/journal-entries/${id}`, data).then((r) => r.data),

  postJournalEntry: (id: string) =>
    api.post<{ success: boolean; message: string; entry: JournalEntryDto }>(`/api/journal-entries/${id}/post`).then((r) => r.data),

  cancelJournalEntry: (id: string) =>
    api.post<{ success: boolean; message: string; entry: JournalEntryDto }>(`/api/journal-entries/${id}/cancel`).then((r) => r.data),
};
