import React, { useState } from 'react';
import { reportsApi, type IncomeStatementResponse, type IncomeStatementSection } from '../../services/reportsApi';
import { formatCurrency, formatDate } from '../../utils/format';

const Section: React.FC<{ section: IncomeStatementSection; isSubtotal?: boolean }> = ({ section, isSubtotal }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{section.title}</h3>
        <span className="text-sm font-bold text-foreground">{formatCurrency(section.total)}</span>
      </div>
      {section.lines.map((line, i) => (
        <div key={i} className="flex items-center justify-between pr-4 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground w-14">{line.accountCode}</span>
            <span className="text-sm text-foreground">{line.accountName}</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(line.amount)}</span>
        </div>
      ))}
      {isSubtotal && <div className="border-t border-border mt-2" />}
    </div>
  );
};

export const IncomeStatement: React.FC = () => {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getIncomeStatement({ fromDate, toDate });
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
        <h1 className="text-2xl font-bold text-foreground">قائمة الدخل</h1>
        <p className="text-sm text-muted-foreground mt-1">بيان الأرباح والخسائر — الإيرادات وتكلفة البضاعة والمصروفات وصافي الدخل</p>
      </div>

      {/* Date Range */}
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

      {/* Results */}
      {result && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div className="text-center border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground">قائمة الدخل</h2>
            <p className="text-xs text-muted-foreground mt-1">
              للفترة من {formatDate(result.fromDate)} إلى {formatDate(result.toDate)}
            </p>
          </div>

          <Section section={result.revenue} />

          <Section section={result.costOfGoodsSold} />

          {/* Gross Profit */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-bold text-foreground">إجمالي الربح</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.grossProfit)}</span>
          </div>

          <Section section={result.operatingExpenses} />

          {/* Net Operating Income */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
            result.netOperatingIncome >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20'
          }`}>
            <span className="text-sm font-bold text-foreground">صافي الدخل التشغيلي</span>
            <span className={`text-lg font-bold ${result.netOperatingIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {formatCurrency(result.netOperatingIncome)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
