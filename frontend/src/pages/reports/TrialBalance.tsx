import React, { useState } from 'react';
import { reportsApi, type TrialBalanceResponse } from '../../services/reportsApi';
import { formatNumber, formatDate } from '../../utils/format';

const typeColor: Record<string, string> = {
  Asset: 'text-emerald-400',
  Liability: 'text-rose-400',
  Equity: 'text-purple-400',
  Revenue: 'text-sky-400',
  Expense: 'text-amber-400',
};

const typeLabelAr: Record<string, string> = {
  Asset: 'أصول',
  Liability: 'خصوم',
  Equity: 'حقوق الملكية',
  Revenue: 'إيرادات',
  Expense: 'مصروفات',
};

export const TrialBalance: React.FC = () => {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getTrialBalance({ fromDate, toDate });
      setResult(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'فشل في إنشاء التقرير.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ميزان المراجعة</h1>
        <p className="text-sm text-muted-foreground mt-1">التحقق من المساواة المحاسبية — إجمالي المدين يجب أن يساوي إجمالي الدائن</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">من تاريخ</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg font-semibold transition-colors"
        >
          {loading ? 'جاري التوليد...' : 'إنشاء التقرير'}
        </button>
      </div>

      {error && <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">{error}</div>}

      {result && (
        <>
          <div className={`px-4 py-3 rounded-xl border ${result.isBalanced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {result.isBalanced ? '✓ ميزان المراجعة متوازن' : '✗ ميزان المراجعة غير متوازن'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(result.fromDate)} — {formatDate(result.toDate)}
              </span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">الكود</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">اسم الحساب</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">النوع</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">افتتاحي مدين</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">افتتاحي دائن</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">حركة مدين</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">حركة دائن</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">ختامي مدين</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">ختامي دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات للفترة المحددة.</td></tr>
                  ) : result.lines.map((line, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2 text-foreground font-semibold">{line.accountCode}</td>
                      <td className="px-4 py-2 text-foreground">{line.accountName}</td>
                      <td className="px-4 py-2"><span className={`text-xs font-semibold ${typeColor[line.accountType] || 'text-muted-foreground'}`}>{typeLabelAr[line.accountType] || line.accountType}</span></td>
                      <td className="px-4 py-2 text-right text-foreground font-medium">{line.openingDebit > 0 ? formatNumber(line.openingDebit) : '-'}</td>
                      <td className="px-4 py-2 text-right text-foreground font-medium">{line.openingCredit > 0 ? formatNumber(line.openingCredit) : '-'}</td>
                      <td className="px-4 py-2 text-right text-foreground font-medium">{line.movementDebit > 0 ? formatNumber(line.movementDebit) : '-'}</td>
                      <td className="px-4 py-2 text-right text-foreground font-medium">{line.movementCredit > 0 ? formatNumber(line.movementCredit) : '-'}</td>
                      <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">{line.endingDebit > 0 ? formatNumber(line.endingDebit) : '-'}</td>
                      <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">{line.endingCredit > 0 ? formatNumber(line.endingCredit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50 font-bold">
                    <td colSpan={7} className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">الإجمالي</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(result.totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(result.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
