import React, { useState } from 'react';
import { reportsApi, type BalanceSheetResponse, type BalanceSheetSection } from '../../services/reportsApi';

const BSSection: React.FC<{ section: BalanceSheetSection; color: string }> = ({ section, color }) => {
  const fmt = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 2 }).format(n);
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{section.title}</h3>
      {section.lines.map((line, i) => (
        <div key={i} className="flex items-center justify-between pl-4 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground w-12">{line.accountCode}</span>
            <span className="text-sm text-foreground">{line.accountName}</span>
          </div>
          <span className="text-sm font-mono text-foreground">{fmt(line.balance)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pl-4 py-2 border-t border-border">
        <span className="text-xs font-bold text-muted-foreground uppercase">الإجمالي {section.title}</span>
        <span className={`text-sm font-bold font-mono ${color}`}>{fmt(section.total)}</span>
      </div>
    </div>
  );
};

export const BalanceSheet: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reportsApi.getBalanceSheet({ asOfDate });
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
        <h1 className="text-2xl font-bold text-foreground">الميزانية العمومية</h1>
        <p className="text-sm text-muted-foreground mt-1">الوضع المالي لpecific date — الأصول = الخصوم + حقوق الملكية</p>
      </div>

      {/* Date & Generate */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">حتى تاريخ</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-foreground rounded-lg font-medium transition-colors">{loading ? 'جاري التوليد...' : 'إنشاء التقرير'}</button>
      </div>

      {error && <div className="px-4 py-3 bg-red-950 border border-red-800/50 rounded-xl text-sm text-red-400">{error}</div>}

      {result && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="text-center border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground">الميزانية العمومية</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">حتى {new Date(result.asOfDate).toLocaleDateString()}</p>
          </div>

          {/* Validation */}
          <div className={`px-4 py-3 rounded-lg border text-sm font-bold ${
            result.isValid ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400' : 'bg-red-950/50 border-red-800/50 text-red-400'
          }`}>
            {result.isValid
              ? `✓ الميزانية العمومية صحيحة: الأصول (${fmt(result.assets.total)}) = الخصوم + حقوق الملكية (${fmt(result.totalLiabilitiesAndEquity)})`
              : `✗ الميزانية العمومية غير صحيحة: الأصول (${fmt(result.assets.total)}) ≠ الخصوم + حقوق الملكية (${fmt(result.totalLiabilitiesAndEquity)})`
            }
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets */}
            <BSSection section={result.assets} color="text-blue-400" />

            {/* Liabilities + Equity */}
            <div className="space-y-6">
              <BSSection section={result.liabilities} color="text-red-400" />
              <BSSection section={result.equity} color="text-purple-400" />

              {/* Current Year Net Income */}
              <div className="flex items-center justify-between pl-4 py-2">
                <span className="text-sm text-muted-foreground">صافي الدخل للسنة الجارية</span>
                <span className={`text-sm font-bold font-mono ${result.currentYearNetIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(result.currentYearNetIncome)}
                </span>
              </div>

              <div className="border-t-2 border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground uppercase">إجمالي الخصوم وحقوق الملكية</span>
                <span className="text-lg font-bold text-blue-400 font-mono">{fmt(result.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
