import React, { useState } from 'react';
import { reportsApi, type TrialBalanceResponse } from '../../services/reportsApi';

const typeColor: Record<string, string> = {
  Asset: 'text-blue-400',
  Liability: 'text-red-400',
  Equity: 'text-purple-400',
  Revenue: 'text-emerald-400',
  Expense: 'text-amber-400',
};

const typeLabelAr: Record<string, string> = {
  Asset: 'أصول',
  Liability: 'خصوم',
  Equity: 'حقوق ملكية',
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
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reportsApi.getTrialBalance({ fromDate: fromDate, toDate: toDate });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل في إنشاء التقرير.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ميزان المراجعة</h1>
        <p className="text-sm text-muted-foreground mt-1">التحقق من المساواة المحاسبية — إجمالي المدين يجب أن يساوي إجمالي الدائن</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">من تاريخ</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">إلى تاريخ</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
        </div>
        <button onClick={handleGenerate} disabled={loading} className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-foreground rounded-lg font-medium transition-colors">
          {loading ? 'جاري التوليد...' : 'إنشاء التقرير'}
        </button>
      </div>

      {error && <div className="px-4 py-3 bg-red-950 border border-red-800/50 rounded-xl text-sm text-red-400">{error}</div>}

      {result && (
        <>
          <div className={`px-4 py-3 rounded-xl border ${result.isBalanced ? 'bg-emerald-950/50 border-emerald-800/50' : 'bg-red-950/50 border-red-800/50'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${result.isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.isBalanced ? '✓ ميزان المراجعة متوازن' : '✗ ميزان المراجعة غير متوازن'}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(result.fromDate).toLocaleDateString()} — {new Date(result.toDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الكود</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">اسم الحساب</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">النوع</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">افتتاحي مدين</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">افتتاحي دائن</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">حركة مدين</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">حركة دائن</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">ختامي مدين</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">ختامي دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات للفترة المحددة.</td></tr>
                  ) : result.lines.map((line, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-foreground">{line.accountCode}</td>
                      <td className="px-4 py-2 text-foreground">{line.accountName}</td>
                      <td className="px-4 py-2"><span className={`text-xs font-semibold ${typeColor[line.accountType]}`}>{typeLabelAr[line.accountType] || line.accountType}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">{line.openingDebit > 0 ? fmt(line.openingDebit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">{line.openingCredit > 0 ? fmt(line.openingCredit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">{line.movementDebit > 0 ? fmt(line.movementDebit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">{line.movementCredit > 0 ? fmt(line.movementCredit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-400 font-bold">{line.endingDebit > 0 ? fmt(line.endingDebit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-400 font-bold">{line.endingCredit > 0 ? fmt(line.endingCredit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50 font-bold">
                    <td colSpan={7} className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">الإجمالي</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">{fmt(result.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">{fmt(result.totalCredit)}</td>
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
