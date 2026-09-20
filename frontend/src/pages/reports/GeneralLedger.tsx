import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, BookOpen } from 'lucide-react';
import { reportsApi, type GeneralLedgerResponse } from '../../services/reportsApi';
import { accountingApi, type AccountDto } from '../../services/accountingApi';
import { SimpleCombobox, SelectedChip } from '../../components/phoenix/comboboxes';
import { phoenixHeaderInput } from '../../components/phoenix/tokens';
import { formatBalance, formatCurrency, formatDate, getDateRangeDefaults } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  GENERAL LEDGER — /reports/general-ledger  (دفتر الأستاذ)
//  Every posted transaction of one account with its counterpart
//  account, running balance (normal balance nature) and CSV export.
// ═══════════════════════════════════════════════════════════

/** Human-readable Arabic label for a journal entry source document type. */
const referenceTypeLabels: Record<string, string> = {
  SalesInvoice: 'فاتورة بيع',
  SalesInvoiceCancel: 'إلغاء فاتورة بيع',
  SalesReturn: 'مرتجع بيع',
  PurchaseInvoice: 'فاتورة شراء',
  PurchaseInvoiceCancel: 'إلغاء فاتورة شراء',
  PurchaseReturn: 'مرتجع شراء',
  CashVoucher: 'سند نقدي',
  TransferVoucher: 'حوالة داخلية',
  StockMovement: 'حركة مخزون',
  FixedAsset: 'أصل ثابت',
  Depreciation: 'إهلاك',
};

const referenceTypeLabel = (type: string | null): string =>
  (type && referenceTypeLabels[type]) || type || 'قيد يدوي';

/** Escape one CSV cell (quotes doubled, always quoted). */
const csvCell = (value: string | number | null | undefined): string =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

export const GeneralLedger: React.FC = () => {
  const defaults = useMemo(() => getDateRangeDefaults(), []);
  const [accountId, setAccountId] = useState('');
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [result, setResult] = useState<GeneralLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accountsFlat'],
    queryFn: () => accountingApi.getAccountsFlat(undefined, true),
  });

  // Only detail (postable) accounts carry ledger movements.
  const postableAccounts = useMemo(() => accounts.filter((a) => !a.isHeader), [accounts]);
  const selectedAccount: AccountDto | undefined = postableAccounts.find((a) => a.id === accountId);

  const handleGenerate = async () => {
    if (!accountId) {
      setError('يرجى اختيار الحساب أولاً.');
      return;
    }
    if (!fromDate || !toDate) {
      setError('يرجى تحديد الفترة (من تاريخ / إلى تاريخ).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getGeneralLedger({ accountId, fromDate, toDate });
      setResult(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'فشل في إنشاء دفتر الأستاذ.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  /** CSV export with a UTF-8 BOM so Arabic renders correctly in Excel. */
  const handleExportCsv = () => {
    if (!result) return;

    const rows: (string | number)[][] = [
      ['دفتر الأستاذ', `${result.accountCode} — ${result.accountName}`],
      ['طبيعة الحساب', result.balanceNature === 'Debit' ? 'مدين' : 'دائن'],
      ['من تاريخ', formatDate(result.fromDate), 'إلى تاريخ', formatDate(result.toDate)],
      ['الرصيد الافتتاحي', result.openingBalance.toFixed(4), 'إجمالي المدين', result.totalDebit.toFixed(4), 'إجمالي الدائن', result.totalCredit.toFixed(4), 'الرصيد الختامي', result.closingBalance.toFixed(4)],
      [],
      ['التاريخ', 'رقم القيد', 'نوع المرجع', 'البيان', 'الحساب المقابل', 'مدين', 'دائن', 'الرصيد الجاري', 'المستخدم'],
      ...result.lines.map((l) => [
        formatDate(l.date),
        l.entryNumber,
        referenceTypeLabel(l.sourceDocumentType),
        l.description,
        l.counterpartAccount,
        l.debit.toFixed(4),
        l.credit.toFixed(4),
        l.runningBalance.toFixed(4),
        l.userName ?? '',
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `general-ledger-${result.accountCode}-${fromDate}_${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const balanceNatureLabel = result?.balanceNature === 'Credit' ? 'دائن' : 'مدين';

  return (
    <div className="space-y-6 text-right">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">دفتر الأستاذ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            حركات الحساب المرحّلة مع الحساب المقابل والرصيد الجاري
          </p>
        </div>
        {result && (
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-xl transition-colors flex items-center gap-2 shrink-0"
          >
            <Download size={16} /> تصدير CSV
          </button>
        )}
      </div>

      {/* Parameters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">الحساب</label>
            {selectedAccount ? (
              <SelectedChip
                title={`${selectedAccount.code} — ${selectedAccount.name}`}
                onClick={() => setAccountId('')}
              />
            ) : (
              <SimpleCombobox
                items={postableAccounts}
                searchText={(a) => `${a.code} ${a.name}`}
                primary={(a) => a.name}
                secondary={(a) => a.code}
                onSelect={(a) => setAccountId(a.id)}
                placeholder="ابحث بكود أو اسم الحساب..."
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`${phoenixHeaderInput} w-40`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`${phoenixHeaderInput} w-40`}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="h-9 px-6 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <BookOpen size={15} />}
            {loading ? 'جاري التوليد...' : 'عرض دفتر الأستاذ'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                <span className="font-mono text-muted-foreground me-2">{result.accountCode}</span>
                {result.accountName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(result.fromDate)} — {formatDate(result.toDate)} · عدد الحركات {result.lines.length}
              </p>
            </div>
            <span className="px-3 py-1 text-[11px] font-semibold rounded-full border bg-primary/10 text-primary border-primary/20 shrink-0">
              طبيعة الحساب: {balanceNatureLabel}
            </span>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">الرصيد الافتتاحي</p>
              <p className="text-lg font-bold text-foreground mt-1 tabular-nums">{formatBalance(result.openingBalance)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">إجمالي المدين</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {formatBalance(result.totalDebit)}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">إجمالي الدائن</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                {formatBalance(result.totalCredit)}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">الرصيد الختامي</p>
              <p className="text-lg font-bold text-primary mt-1 tabular-nums">{formatBalance(result.closingBalance)}</p>
            </div>
          </div>

          {/* Ledger grid */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-center">التاريخ</th>
                    <th className="px-3 py-2.5 text-center">رقم القيد</th>
                    <th className="px-3 py-2.5 text-center">نوع المرجع</th>
                    <th className="px-3 py-2.5 text-center">البيان</th>
                    <th className="px-3 py-2.5 text-center">الحساب المقابل</th>
                    <th className="px-3 py-2.5 text-center">مدين</th>
                    <th className="px-3 py-2.5 text-center">دائن</th>
                    <th className="px-3 py-2.5 text-center">الرصيد الجاري</th>
                    <th className="px-3 py-2.5 text-center">المستخدم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr className="bg-muted/20">
                    <td className="px-3 py-2.5 text-center text-muted-foreground" colSpan={7}>
                      الرصيد الافتتاحي
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-foreground tabular-nums" colSpan={2}>
                      {formatBalance(result.openingBalance)}
                    </td>
                  </tr>
                  {result.lines.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                        لا توجد حركات مرحّلة على هذا الحساب خلال الفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    result.lines.map((line, i) => (
                      <tr key={`${line.entryNumber}-${i}`} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 text-center text-muted-foreground text-xs tabular-nums">
                          {formatDate(line.date)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-primary font-mono text-xs">
                          {line.entryNumber}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                          {referenceTypeLabel(line.sourceDocumentType)}
                        </td>
                        <td className="px-3 py-2.5 text-start text-foreground">{line.description}</td>
                        <td className="px-3 py-2.5 text-start text-xs text-muted-foreground">{line.counterpartAccount}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-foreground">
                          {line.debit > 0 ? formatBalance(line.debit) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-foreground">
                          {line.credit > 0 ? formatBalance(line.credit) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold tabular-nums text-foreground">
                          {formatBalance(line.runningBalance)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                          {line.userName || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                  {result.lines.length > 0 && (
                    <tr className="bg-muted/40 font-bold">
                      <td className="px-3 py-3 text-center text-foreground" colSpan={5}>
                        الإجمالي — الرصيد الختامي {formatCurrency(result.closingBalance)}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatBalance(result.totalDebit)}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-rose-600 dark:text-rose-400">
                        {formatBalance(result.totalCredit)}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-primary" colSpan={2}>
                        {formatBalance(result.closingBalance)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
