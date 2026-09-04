import React, { useState, useEffect } from 'react';
import { treasuryApi, type Treasury, type TreasuryRequest } from '../../services/cashBankApi';
import { api } from '../../services/api';
import type { AccountDto } from '../../services/accountingApi';
import { formatCurrency } from '../../utils/format';

export const Treasuries: React.FC = () => {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTreasury, setEditingTreasury] = useState<Treasury | null>(null);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [form, setForm] = useState<TreasuryRequest>({ code: '', name: '', type: 'Cash', accountId: '', currency: 'د.ل' });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [treasuriesData, accountsData] = await Promise.all([
        treasuryApi.getAll(),
        api.get<AccountDto[]>('/api/accounts/flat').then(r => r.data),
      ]);
      setTreasuries(treasuriesData);
      setAccounts(accountsData.filter(a => !a.isHeader));
    } catch (err) { console.error('Failed to load treasuries:', err); }
    finally { setLoading(false); }
  };

  const handleOpenModal = (treasury?: Treasury) => {
    if (treasury) {
      setEditingTreasury(treasury);
      setForm({ code: treasury.code, name: treasury.name, type: treasury.type, accountId: treasury.accountId, currency: treasury.currency });
    } else {
      setEditingTreasury(null);
      setForm({ code: '', name: '', type: 'Cash', accountId: '', currency: 'د.ل' });
    }
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name || !form.accountId) { setError('الكود والاسم والحساب الرئيسي مطلوبة.'); return; }
    try {
      if (editingTreasury) { await treasuryApi.update(editingTreasury.id, form); }
      else { await treasuryApi.create(form); }
      setShowModal(false);
      await loadData();
    } catch (err: any) { setError(err.response?.data?.error || 'فشل في حفظ الخزينة.'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">جاري تحميل الخزائن...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الخزائن والبنوك</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة الخزائن النقدية وحسابات البنك بأرصدة فورية</p>
        </div>
        <button onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">+ خزينة جديدة</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">إجمالي الخزائن</p>
          <p className="text-2xl font-bold text-foreground mt-1">{treasuries.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">إجمالي رصيد النقد</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(treasuries.filter(t => t.type === 'Cash').reduce((s, t) => s + t.balance, 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">إجمالي رصيد البنك</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(treasuries.filter(t => t.type === 'Bank').reduce((s, t) => s + t.balance, 0))}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الكود</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الاسم</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">النوع</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الحساب الرئيسي</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">الرصيد</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">العملة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {treasuries.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">لم يتم إعداد خزائن بعد.</td></tr>
              ) : treasuries.map(treasury => (
                <tr key={treasury.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{treasury.code}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{treasury.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${treasury.type === 'Cash' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-blue-950 text-blue-400 border border-blue-800/50'}`}>
                      {treasury.type === 'Cash' ? '💵 نقدي' : '🏦 بنك'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{treasury.accountName}</td>
                  <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${treasury.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(treasury.balance)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{treasury.currency}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleOpenModal(treasury)}
                      className="px-3 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 border border-indigo-800/40 rounded transition-colors">تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">{editingTreasury ? 'تعديل الخزينة' : 'خزينة جديدة'}</h2>
            {error && <div className="mb-4 px-3 py-2 bg-red-950 border border-red-800/50 rounded-lg text-sm text-red-400">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الكود *</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="TRE-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">النوع *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'Cash' | 'Bank' })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                    <option value="Cash">نقدي</option>
                    <option value="Bank">بنك</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="الصندوق الرئيسي" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الحساب الرئيسي المرتبط *</label>
                <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                  <option value="">اختر حساب...</option>
                  {accounts.map(a => (<option key={a.id} value={a.id}>{a.code} — {a.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">العملة</label>
                <input type="text" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="د.ل" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors">{editingTreasury ? 'تحديث' : 'إنشاء'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
