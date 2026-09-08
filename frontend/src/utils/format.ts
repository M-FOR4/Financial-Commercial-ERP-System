// ═══════════════════════════════════════
//  FORMATTING UTILITIES (CENTRAL SOURCE OF TRUTH)
//  Standardized date, currency, and number formatting for Libyan ERP
// ═══════════════════════════════════════

/**
 * Format date in Arabic standard (YYYY/MM/DD)
 * Handles Date objects, ISO strings, and null/undefined values
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}/${month}/${day}`;
};

/**
 * Format date with time in Arabic standard (YYYY/MM/DD HH:mm)
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

/**
 * Format date for HTML input[type="date"] (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parse date from HTML input[type="date"] (YYYY-MM-DD) to Date object
 */
export const parseDateFromInput = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Format currency in Libyan Dinar (د.ل)
 * Standard: ',' for thousands, '.' for decimals (e.g. 252,500.00 د.ل)
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currency: string = 'د.ل',
  decimals: number = 2
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `0.00 ${currency}`.trim();
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  
  return `${formatted} ${currency}`.trim();
};

/**
 * Format general numeric values
 * Standard: ',' for thousands, '.' for decimals
 */
export const formatNumber = (
  num: number | null | undefined,
  decimals: number = 2
): string => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format stock/inventory quantities (0 to 2 decimals)
 */
export const formatStock = (
  num: number | null | undefined,
  decimals: number = 2
): string => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format accounting ledger & journal entry balances (4 decimal places)
 */
export const formatBalance = (
  amount: number | null | undefined,
  decimals: number = 4
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.0000';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format compact numbers for chart axes (e.g. 1.5M, 5K, or clean number)
 */
export function formatShortNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) as a short Arabic axis label (e.g. "5 سبتمبر")
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${day} ${ARABIC_MONTHS[monthIdx] || ''}`;
}

/**
 * Format compact numbers for chart axes (e.g. 100K, 1.5M, or clean number)
 */
export const formatAxisNumber = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Format percentage
 */
export const formatPercent = (
  value: number | null | undefined,
  decimals: number = 1
): string => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${formatNumber(value, decimals)}%`;
};

/**
 * Get today's date as YYYY-MM-DD string
 */
export const getTodayISO = (): string => {
  return formatDateForInput(new Date());
};

/**
 * Get date range defaults (start of current month to today)
 */
export const getDateRangeDefaults = (): { from: string; to: string } => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  return {
    from: formatDateForInput(startOfMonth),
    to: formatDateForInput(today),
  };
};

/**
 * Account Type labels in Arabic
 */
export const accountTypeLabelsAr: Record<string, string> = {
  Asset: 'أصول',
  Liability: 'خصوم',
  Equity: 'حقوق الملكية',
  Revenue: 'إيرادات',
  Expense: 'مصروفات',
};

/**
 * Account Status labels in Arabic
 */
export const accountStatusLabelsAr: Record<string, string> = {
  Active: 'نشط',
  Inactive: 'غير نشط',
  Header: 'رئيسي',
  Detail: 'فرعي',
};

/**
 * Status labels in Arabic
 */
export const statusLabels: Record<string, string> = {
  Draft: 'مسودة',
  Posted: 'مرحل',
  Cancelled: 'ملغي',
  Active: 'نشط',
  Inactive: 'غير نشط',
  Completed: 'مكتمل',
  Pending: 'معلق',
  Approved: 'موافق عليه',
  Rejected: 'مرفوض',
};

/**
 * Action type labels in Arabic (for audit logs)
 */
export const actionLabels: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  POST: 'ترحيل',
  CANCEL: 'إلغاء',
  APPROVE: 'موافقة',
};

/**
 * Entity type labels in Arabic (for audit logs)
 */
export const entityLabels: Record<string, string> = {
  User: 'مستخدم',
  SalesInvoice: 'فاتورة مبيعات',
  PurchaseInvoice: 'فاتورة شراء',
  JournalEntry: 'قيد يومي',
  CashVoucher: 'سند نقدي',
  FixedAsset: 'أصل ثابت',
  Account: 'حساب',
  Product: 'صنف',
  Customer: 'عميل',
  Supplier: 'مورد',
  Warehouse: 'مستودع',
  Treasury: 'خزينة',
};
