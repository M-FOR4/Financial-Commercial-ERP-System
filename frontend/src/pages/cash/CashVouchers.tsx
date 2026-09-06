import React, { useState, useEffect } from 'react';
import {
  treasuryApi, cashVoucherApi,
  type Treasury, type CashVoucher, type CashVoucherRequest,
  type VoucherType, type DocumentStatus,
} from '../../services/cashBankApi';
import { api } from '../../services/api';
import type { AccountDto } from '../../services/accountingApi';
import { useToast } from '../../components/Toast';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency } from '../../utils/format';

const statusConfig: Record<DocumentStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-950', text: 'text-amber-400', border: 'border-amber-800/50', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-800/50', label: 'مرحل' },
  Cancelled: { bg: 'bg-red-950', text: 'text-red-400', border: 'border-red-800/50', label: 'ملغي' },
};

export const CashVouchers: React.FC = () => {
  const { addToast } = useToast();
  const [vouchers, setVouchers] = useState<CashVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<VoucherType | 'All'>('All');
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CashVoucherRequest>({
    voucherType: 'Receipt',
    date: new Date().toISOString().split('T')[0],
    treasuryId: '',
    partyType: 'GeneralAccount',
    partyId: null,
    targetAccountId: '',
    amount: 0,
    description: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [v, t, a] = await Promise.all([
        cashVoucherApi.getAll(),
        treasuryApi.getAll(),
        api.get<AccountDto[]>('/api/accounts/flat').then(r => r.data),
      ]);
      setVouchers(v);
      setTreasuries(t);
      setAccounts(a.filter(acc => !acc.isHeader));
    } catch (err) { console.error('Failed to load cash vouchers:', err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.treasuryId || !form.targetAccountId || form.amount <= 0 || !form.description) {
      setError('جميع الحقول مطلوبة والمبلغ يجب أن يكون > 0.'); return;
    }
    try {
      await cashVoucherApi.create(form);
      setShowForm(false);
      setForm({ voucherType: 'Receipt', date: new Date().toISOString().split('T')[0], treasuryId: '', partyType: 'GeneralAccount', partyId: null, targetAccountId: '', amount: 0, description: '' });
      addToast('success', 'تم إنشاء السند بنجاح.');
      await loadData();
    } catch (err) { setError(getApiErrorMessage(err, 'فشل في إنشاء السند.')); }
  };

  const handlePost = async (id: string) => {
    try {
      await cashVoucherApi.post(id);
      addToast('success', 'تم ترحيل السند بنجاح.');
      await loadData();
    } catch (err) { addToast('error', getApiErrorMessage(err, 'فشل في ترحيل السند.')); }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا السند؟')) return;
    try {
      await cashVoucherApi.cancel(id);
      addToast('success', 'تم إلغاء السند بنجاح.');
      await loadData();
    } catch (err) { addToast('error', getApiErrorMessage(err, 'فشل في إلغاء السند.')); }
  };

  const filtered = vouchers.filter(v => {
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (typeFilter !== 'All' && v.voucherType !== typeFilter) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">جاري تحميل سندات القبض والصرف...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">سندات القبض والصرف</h1>
          <p className="text-sm text-muted-foreground mt-1">سندات القبض والصرف — تتبع جميع الحركات النقدية</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(''); }}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">
          {showForm ? '✕ إغلاق' : '+ سند جديد'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">سند قبض/صرف جديد</h2>
          {error && <div className="mb-4 px-3 py-2 bg-red-950 border border-red-800/50 rounded-lg text-sm text-red-400">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">نوع السند</label>
              <select value={form.voucherType} onChange={e => setForm({ ...form, voucherType: e.target.value as VoucherType })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                <option value="Receipt">قبض</option>
                <option value="Payment">صرف</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">الخزينة *</label>
              <select value={form.treasuryId} onChange={e => setForm({ ...form, treasuryId: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                <option value="">اختر الخزينة...</option>
                {treasuries.map(t => (<option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance)})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">الحساب المستهدف *</label>
              <select value={form.targetAccountId} onChange={e => setForm({ ...form, targetAccountId: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                <option value="">اختر الحساب...</option>
                {accounts.map(a => (<option key={a.id} value={a.id}>{a.code} — {a.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">المبلغ (د.ل) *</label>
              <input type="number" step="0.01" min="0.01" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">الوصف *</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="دفع مقابل..." />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={handleCreate} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">إنشاء سند</button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DocumentStatus | 'All')}
          className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs text-foreground">
          <option value="All">جميع الحالات</option>
          <option value="Draft">مسودة</option>
          <option value="Posted">مرحل</option>
          <option value="Cancelled">ملغي</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as VoucherType | 'All')}
          className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs text-foreground">
          <option value="All">جميع الأنواع</option>
          <option value="Receipt">قبض</option>
          <option value="Payment">صرف</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الرقم</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">النوع</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">التاريخ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الخزينة</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الوصف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">المبلغ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">لا توجد سندات قبض/صرف.</td></tr>
              ) : filtered.map(voucher => {
                const sc = statusConfig[voucher.status];
                return (
                  <tr key={voucher.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{voucher.voucherNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${voucher.voucherType === 'Receipt' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'}`}>
                        {voucher.voucherType === 'Receipt' ? '↓ قبض' : '↑ صرف'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(voucher.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{voucher.treasuryName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{voucher.description}</td>
                    <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${voucher.voucherType === 'Receipt' ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(voucher.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {voucher.status === 'Draft' && (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handlePost(voucher.id)} className="px-3 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 border border-emerald-800/40 rounded transition-colors">ترحيل</button>
                          <button onClick={() => handleCancel(voucher.id)} className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/50 border border-red-800/40 rounded transition-colors">إلغاء</button>
                        </div>
                      )}
                      {voucher.status === 'Posted' && (
                        <button onClick={() => handleCancel(voucher.id)} className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/50 border border-red-800/40 rounded transition-colors">إلغاء</button>
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
