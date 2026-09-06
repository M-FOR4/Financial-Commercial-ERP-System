import React, { useState, useEffect } from 'react';
import { treasuryApi, transferVoucherApi,
  type Treasury, type TransferVoucher, type TransferVoucherRequest, type DocumentStatus,
} from '../../services/cashBankApi';
import { useToast } from '../../components/Toast';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency } from '../../utils/format';

const statusConfig: Record<DocumentStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-950', text: 'text-amber-400', border: 'border-amber-800/50', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-800/50', label: 'مرحل' },
  Cancelled: { bg: 'bg-red-950', text: 'text-red-400', border: 'border-red-800/50', label: 'ملغي' },
};

export const Transfers: React.FC = () => {
  const { addToast } = useToast();
  const [transfers, setTransfers] = useState<TransferVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState<TransferVoucherRequest>({
    date: new Date().toISOString().split('T')[0],
    fromTreasuryId: '',
    toTreasuryId: '',
    amount: 0,
    reference: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [t, tr] = await Promise.all([transferVoucherApi.getAll(), treasuryApi.getAll()]);
      setTransfers(t);
      setTreasuries(tr);
    } catch (err) { console.error('Failed to load transfers:', err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.fromTreasuryId || !form.toTreasuryId || form.amount <= 0) { setError('المصدر والوجهة والمبلغ > 0 مطلوبة.'); return; }
    if (form.fromTreasuryId === form.toTreasuryId) { setError('يجب أن تكون الخزينة المصدر والوجهة مختلفتين.'); return; }
    try {
      await transferVoucherApi.create(form);
      setShowForm(false);
      setForm({ date: new Date().toISOString().split('T')[0], fromTreasuryId: '', toTreasuryId: '', amount: 0, reference: '' });
      addToast('success', 'تم إنشاء التحويل بنجاح.');
      await loadData();
    } catch (err) { setError(getApiErrorMessage(err, 'فشل في إنشاء التحويل.')); }
  };

  const handlePost = async (id: string) => {
    try {
      await transferVoucherApi.post(id);
      addToast('success', 'تم ترحيل التحويل بنجاح.');
      await loadData();
    } catch (err) { addToast('error', getApiErrorMessage(err, 'فشل في ترحيل التحويل.')); }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('هل تريد إلغاء هذا التحويل؟')) return;
    try {
      await transferVoucherApi.cancel(id);
      addToast('success', 'تم إلغاء التحويل بنجاح.');
      await loadData();
    } catch (err) { addToast('error', getApiErrorMessage(err, 'فشل في إلغاء التحويل.')); }
  };

  const getTreasuryName = (id: string) => treasuries.find(t => t.id === id)?.name || 'غير معروف';
  const getTreasuryBalance = (id: string) => treasuries.find(t => t.id === id)?.balance || 0;

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">جاري تحميل التحويلات...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التحويلات الداخلية</h1>
          <p className="text-sm text-muted-foreground mt-1">نقل الأموال بين الخزائن وحسابات البنك</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(''); }}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">
          {showForm ? '✕ إغلاق' : '+ تحويل جديد'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">تحويل داخلي جديد</h2>
          {error && <div className="mb-4 px-3 py-2 bg-red-950 border border-red-800/50 rounded-lg text-sm text-red-400">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">من الخزينة *</label>
              <select value={form.fromTreasuryId} onChange={e => setForm({ ...form, fromTreasuryId: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                <option value="">اختر المصدر...</option>
                {treasuries.map(t => (<option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.balance)}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">إلى الخزينة *</label>
              <select value={form.toTreasuryId} onChange={e => setForm({ ...form, toTreasuryId: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                <option value="">اختر الوجهة...</option>
                {treasuries.filter(t => t.id !== form.fromTreasuryId).map(t => (<option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.balance)}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">المبلغ (د.ل) *</label>
              <input type="number" step="0.01" min="0.01" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">المرجع / الوصف</label>
              <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="مثال: إيداع نقدي في البنك" />
            </div>
          </div>

          {form.fromTreasuryId && form.toTreasuryId && form.amount > 0 && (
            <div className="mt-4 p-3 bg-muted/50 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground font-semibold mb-2">معاينة التحويل</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">↓ {getTreasuryName(form.fromTreasuryId)}: {formatCurrency(getTreasuryBalance(form.fromTreasuryId) - form.amount)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-400">↑ {getTreasuryName(form.toTreasuryId)}: {formatCurrency(getTreasuryBalance(form.toTreasuryId) + form.amount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button onClick={handleCreate} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">إنشاء التحويل</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الرقم</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">التاريخ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">من</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">→</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">إلى</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">المبلغ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">لا توجد تحويلات مسجلة بعد.</td></tr>
              ) : transfers.map(transfer => {
                const sc = statusConfig[transfer.status];
                return (
                  <tr key={transfer.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{transfer.transferNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(transfer.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-red-400">{transfer.fromTreasuryName}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">→</td>
                    <td className="px-4 py-3 text-sm text-emerald-400">{transfer.toTreasuryName}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground">{formatCurrency(transfer.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {transfer.status === 'Draft' && (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handlePost(transfer.id)} className="px-3 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 border border-emerald-800/40 rounded transition-colors">ترحيل</button>
                          <button onClick={() => handleCancel(transfer.id)} className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/50 border border-red-800/40 rounded transition-colors">إلغاء</button>
                        </div>
                      )}
                      {transfer.status === 'Posted' && (
                        <button onClick={() => handleCancel(transfer.id)} className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/50 border border-red-800/40 rounded transition-colors">إلغاء</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
