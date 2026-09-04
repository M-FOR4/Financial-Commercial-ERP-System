import React, { useState, useEffect } from 'react';
import { fixedAssetsApi, type DepreciationEntryResponse, type DepreciationRunResponse } from '../../services/fixedAssetsApi';
import { formatCurrency } from '../../utils/format';

export const Depreciation: React.FC = () => {
  const [entries, setEntries] = useState<DepreciationEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [lastResult, setLastResult] = useState<DepreciationRunResponse | null>(null);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    try {
      const data = await fixedAssetsApi.getDepreciationEntries();
      setEntries(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRunDepreciation = async () => {
    if (periodStart >= periodEnd) { alert('يجب أن يكون تاريخ البداية قبل تاريخ النهاية.'); return; }
    setRunning(true);
    try {
      const result = await fixedAssetsApi.runDepreciation({ periodStartDate: periodStart, periodEndDate: periodEnd });
      setLastResult(result);
      await loadEntries();
    } catch (err: any) {
      alert(err.response?.data?.error || 'فشل في تشغيل الإهلاك.');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">جاري تحميل بيانات الإهلاك...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">معالجة الإهلاك</h1>
        <p className="text-sm text-muted-foreground mt-1">تشغيل الإهلاك بالطريقة المستقيمة لجميع الأصول النشطة — D-031</p>
      </div>

      {/* Run Depreciation */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">تشغيل الإهلاك</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">بداية الفترة</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">نهاية الفترة</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
          </div>
          <button onClick={handleRunDepreciation} disabled={running}
            className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-foreground rounded-lg font-medium transition-colors">
            {running ? 'جاري المعالجة...' : 'تشغيل الإهلاك'}
          </button>
        </div>

        {/* Last Run Result */}
        {lastResult && (
          <div className="mt-4 p-4 bg-emerald-950/50 border border-emerald-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-emerald-400">✓ اكتمل تشغيل الإهلاك</span>
              <span className="text-xs text-muted-foreground font-mono">{lastResult.assetsProcessed} أصل تمت معالجته</span>
            </div>
            <p className="text-lg font-bold text-emerald-400 font-mono">
              إجمالي الإهلاك: {formatCurrency(lastResult.totalDepreciationAmount)}
            </p>
            {lastResult.items.length > 0 && (
              <div className="mt-3 space-y-1">
                {lastResult.items.map(item => (
                  <div key={item.assetId} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{item.assetCode} — {item.assetName}</span>
                    <span className="text-emerald-400 font-mono">{formatCurrency(item.depreciationAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">سجل مراجعة الإهلاك</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">التاريخ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الأصل</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الفترة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">الإهلاك</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">القيمة الدفترية بعد</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">القيد اليومي</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">لم يتم تشغيل الإهلاك بعد.</td></tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {new Date(entry.processDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <span className="font-mono text-muted-foreground mr-1">{entry.assetCode}</span>
                      {entry.assetName}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {new Date(entry.periodStartDate).toLocaleDateString()} — {new Date(entry.periodEndDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-amber-400">
                      {formatCurrency(entry.depreciationAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-emerald-400">
                      {formatCurrency(entry.bookValueAfter)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {entry.journalEntryNumber || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
