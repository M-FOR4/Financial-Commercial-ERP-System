// ═══════════════════════════════════════
//  FORMATTING UTILITIES
//  Standardized date, currency, and number formatting for Arabic/Libyan locale
// ═══════════════════════════════════════

/**
 * Format date in Arabic locale (YYYY/MM/DD)
 * Handles both Date objects and ISO date strings
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
 * Format date with time in Arabic locale (YYYY/MM/DD HH:mm)
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
 * Uses Arabic-Indic numerals option and proper formatting
 */
export const formatCurrency = (
  amount: number | null | undefined,
  _currency: string = 'LYD'
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  
  const formatted = new Intl.NumberFormat('ar-LY', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
  
  return `${formatted} د.ل`;
};

/**
 * Format currency with English numerals (for technical contexts)
 */
export const formatCurrencyEN = (
  amount: number | null | undefined,
  _currency: string = 'LYD'
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
  
  return `${formatted} د.ل`;
};

/**
 * Format number with Arabic-Indic numerals
 */
export const formatNumber = (
  num: number | null | undefined,
  decimals: number = 2
): string => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  
  return new Intl.NumberFormat('ar-LY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format number with Western numerals (for technical contexts)
 */
export const formatNumberEN = (
  num: number | null | undefined,
  decimals: number = 2
): string => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format percentage
 */
export const formatPercent = (
  value: number | null | undefined,
  decimals: number = 1
): string => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  return `${formatNumber(value, decimals)}%`;
};

/**
 * Get today's date as YYYY-MM-DD string (for input defaults)
 */
export const getTodayISO = (): string => {
  return formatDateForInput(new Date());
};

/**
 * Get date range defaults (start of month to today)
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
