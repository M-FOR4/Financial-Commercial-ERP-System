import React, { useState } from 'react';
import { reportsApi, type BalanceSheetResponse, type BalanceSheetSection } from '../../services/reportsApi';
import { formatCurrency, formatDate } from '../../utils/format';

const BSSection: React.FC<{ section: BalanceSheetSection; color: string }> = ({ section, color }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{section.title}</h3>
      {section.lines.map((line, i) => (
        <div key={i} className="flex items-center justify-between pr-4 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground w-14">{line.accountCode}</span>
            <span className="text-sm text-foreground">{line.accountName}</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(line.balance)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pr-4 py-2 border-t border-border">
        <span className="text-xs font-bold text-muted-foreground uppercase">الإجمالي {section.title}</span>
        <span className={`text-sm font-bold ${color}`}>{formatCurrency(section.total)}</span>
      </div>
    </div>
  );
};

export const BalanceSheet: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getBalanceSheet({ asOfDate });
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
        <h1 className="text-2xl font-bold text-foreground">الميزانية العمومية</h1>
        <p className="text-sm text-muted-foreground mt-1">الوضع المالي في تاريخ محدد — الأصول = الخصوم + حقوق الملكية</p>
      </div>

      {/* Date & Generate */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">حتى تاريخ</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
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
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div className="text-center border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground">الميزانية العمومية</h2>
            <p className="text-xs text-muted-foreground mt-1">حتى {formatDate(result.asOfDate)}</p>
          </div>

          {/* Validation */}
          <div className={`px-4 py-3 rounded-lg border text-sm font-bold ${
            result.isValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            {result.isValid
              ? `✓ الميزانية العمومية صحيحة: الأصول (${formatCurrency(result.assets.total)}) = الخصوم + حقوق الملكية (${formatCurrency(result.totalLiabilitiesAndEquity)})`
              : `✗ الميزانية العمومية غير صحيحة: الأصول (${formatCurrency(result.assets.total)}) ≠ الخصوم + حقوق الملكية (${formatCurrency(result.totalLiabilitiesAndEquity)})`
            }
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets */}
            <BSSection section={result.assets} color="text-sky-600 dark:text-sky-400" />

            {/* Liabilities + Equity */}
            <div className="space-y-6">
              <BSSection section={result.liabilities} color="text-rose-600 dark:text-rose-400" />
              <BSSection section={result.equity} color="text-purple-600 dark:text-purple-400" />

              {/* Current Year Net Income */}
              <div className="flex items-center justify-between pr-4 py-2">
                <span className="text-sm text-muted-foreground font-medium">صافي الدخل للسنة الجارية</span>
                <span className={`text-sm font-bold ${result.currentYearNetIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  {formatCurrency(result.currentYearNetIncome)}
                </span>
              </div>

              <div className="border-t-2 border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground uppercase">إجمالي الخصوم وحقوق الملكية</span>
                <span className="text-lg font-bold text-sky-600 dark:text-sky-400">{formatCurrency(result.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
