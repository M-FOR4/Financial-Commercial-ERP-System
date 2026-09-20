import { api } from './api';

// ═══════════════════════════════════
//  TYPES
// ═══════════════════════════════════

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type DocumentStatus = 'Draft' | 'Posted' | 'Cancelled';

// Trial Balance
export interface TrialBalanceRequest { fromDate: string; toDate: string; }
export interface TrialBalanceLine {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  endingDebit: number;
  endingCredit: number;
}
export interface TrialBalanceResponse {
  fromDate: string;
  toDate: string;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

// Income Statement
export interface IncomeStatementRequest { fromDate: string; toDate: string; }
export interface IncomeStatementLine { accountCode: string; accountName: string; amount: number; }
export interface IncomeStatementSection { title: string; lines: IncomeStatementLine[]; total: number; }
export interface IncomeStatementResponse {
  fromDate: string;
  toDate: string;
  revenue: IncomeStatementSection;
  costOfGoodsSold: IncomeStatementSection;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection;
  netOperatingIncome: number;
}

// Balance Sheet
export interface BalanceSheetRequest { asOfDate: string; }
export interface BalanceSheetLine { accountCode: string; accountName: string; balance: number; }
export interface BalanceSheetSection { title: string; lines: BalanceSheetLine[]; total: number; }
export interface BalanceSheetResponse {
  asOfDate: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  currentYearNetIncome: number;
  totalLiabilitiesAndEquity: number;
  isValid: boolean;
}

// Account Statement
export interface AccountStatementRequest { partyType: string; partyId: string; fromDate: string; toDate: string; }
export interface StatementLine {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}
export interface AccountStatementResponse {
  partyName: string;
  partyCode: string;
  fromDate: string;
  toDate: string;
  lines: StatementLine[];
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

// General Ledger (دفتر الأستاذ)
export interface GeneralLedgerLine {
  date: string;
  entryNumber: string;
  sourceDocumentType: string | null;
  description: string;
  counterpartAccount: string;
  debit: number;
  credit: number;
  runningBalance: number;
  userName: string | null;
}
export interface GeneralLedgerResponse {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  /** 'Debit' for Asset/Expense accounts, 'Credit' for Liability/Equity/Revenue. */
  balanceNature: 'Debit' | 'Credit';
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  lines: GeneralLedgerLine[];
}

// Dashboard KPIs
export interface DashboardKpiResponse {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  totalCashBalance: number;
}

// ═══════════════════════════════════
//  API
// ═══════════════════════════════════

export const reportsApi = {
  getDashboardKpis: () => api.get<DashboardKpiResponse>('/api/reports/dashboard-kpis').then(r => r.data),
  getTrialBalance: (data: TrialBalanceRequest) => api.post<TrialBalanceResponse>('/api/reports/trial-balance', data).then(r => r.data),
  getIncomeStatement: (data: IncomeStatementRequest) => api.post<IncomeStatementResponse>('/api/reports/income-statement', data).then(r => r.data),
  getBalanceSheet: (data: BalanceSheetRequest) => api.post<BalanceSheetResponse>('/api/reports/balance-sheet', data).then(r => r.data),
  getAccountStatement: (data: AccountStatementRequest) => api.post<AccountStatementResponse>('/api/reports/statement', data).then(r => r.data),
  getGeneralLedger: (params: { accountId: string; fromDate: string; toDate: string }) => {
    const qp = new URLSearchParams({
      account_id: params.accountId,
      date_from: params.fromDate,
      date_to: params.toDate,
    });
    return api.get<GeneralLedgerResponse>(`/api/reports/financial/general-ledger?${qp.toString()}`).then(r => r.data);
  },
};
