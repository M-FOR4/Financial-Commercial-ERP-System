import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, type PurchaseReturnDto, type JournalEntryStatus, type PurchaseInvoiceDto } from '../../services/purchasesApi';
import { X } from 'lucide-react';
import { formatCurrency, formatStock, formatDate } from '../../utils/format';

const sc: Record<JournalEntryStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'مرحل' },
  Cancelled: { bg: 'bg-destructive/15', text: 'text-destructive', border: 'border-destructive/30', label: 'ملغي' },
};

const ReturnBuilder: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const qc = useQueryClient();
  const [invNum, setInvNum] = useState('');
  const [selectedInv, setSelectedInv] = useState<PurchaseInvoiceDto | null>(null);
  const [returnLines, setReturnLines] = useState<{ originalInvoiceLineId: string; quantity: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const searchMut = useMutation({
    mutationFn: async (num: string) => { const invs = await purchasesApi.getInvoices({ search: num }); return invs.find(i => i.invoiceNumber === num && i.status === 'Posted'); },
    onSuccess: (inv) => { if (inv) { setSelectedInv(inv); setReturnLines(inv.lines.map(l => ({ originalInvoiceLineId: l.id, quantity: '' }))); setError(null); } else { setError('لم يتم العثور على فاتورة مرحلة.'); setSelectedInv(null); } },
    onError: () => setError('فشل البحث.'),
  });

  const createMut = useMutation({
    mutationFn: purchasesApi.createReturn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchaseReturns'] }); setInvNum(''); setSelectedInv(null); setReturnLines([]); setNotes(''); onClose(); },
    onError: (e: { response?: { data?: { message?: string } } }) => setError(e.response?.data?.message || 'فشل'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!selectedInv) { setError('ابحث عن فاتورة أولاً.'); return; }
    const validLines = returnLines.filter(l => parseFloat(l.quantity) > 0);
    if (validLines.length === 0) { setError('يجب إدخال بند واحد على الأقل بكمية > 0.'); return; }
    for (const rl of validLines) {
      const orig = selectedInv.lines.find(l => l.id === rl.originalInvoiceLineId);
      if (orig && parseFloat(rl.quantity) > orig.quantity) { setError(`الكمية لـ ${orig.productName} تتجاوز الأصلية (${orig.quantity}).`); return; }
    }
    createMut.mutate({ originalInvoiceId: selectedInv.id, notes: notes.trim() || null, lines: validLines.map(l => ({ originalInvoiceLineId: l.originalInvoiceLineId, quantity: parseFloat(l.quantity), notes: null })) });
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10"><h3 className="text-lg font-bold text-foreground">مرتجع شراء جديد</h3></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">رقم الفاتورة الأصلية</label>
            <div className="flex gap-2">
              <input type="text" value={invNum} onChange={(e) => setInvNum(e.target.value)} placeholder="PINV-YYYYMM-0001" className="flex-1 px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={() => searchMut.mutate(invNum)} disabled={!invNum.trim()} className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50">بحث</button>
            </div></div>
          {selectedInv && (
            <div>
              <div className="bg-muted/40 rounded-lg p-3 mb-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{selectedInv.invoiceNumber}</span> — {selectedInv.supplierName} — {formatDate(selectedInv.invoiceDate)}</div>
              <h4 className="text-sm font-semibold text-foreground mb-3">بنود المرتجع</h4>
              <div className="space-y-2">
                {returnLines.map(rl => {
                  const orig = selectedInv.lines.find(l => l.id === rl.originalInvoiceLineId);
                  if (!orig) return null;
                  return (
                    <div key={rl.originalInvoiceLineId} className="grid grid-cols-[1fr_120px_120px] gap-2 items-center bg-muted/30 rounded-lg p-3">
                      <div><span className="text-xs text-muted-foreground ml-1.5">{orig.productSKU}</span><span className="text-sm text-foreground">{orig.productName}</span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">الكمية الأصلية: {formatStock(orig.quantity)} | التكلفة الفعّالة: {formatCurrency(orig.effectiveUnitCost)}</span></div>
                      <div className="text-right text-xs text-muted-foreground">حد المرتجع الأقصى: <span className="text-foreground font-semibold">{formatStock(orig.quantity)}</span></div>
                      <input type="number" min="0.0001" step="0.0001" max={orig.quantity} value={rl.quantity} onChange={(e) => setReturnLines(prev => prev.map(l => l.originalInvoiceLineId === rl.originalInvoiceLineId ? { ...l, quantity: e.target.value } : l))} placeholder="الكمية" className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ملاحظات</label><input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">إلغاء</button>
            <button type="submit" disabled={!selectedInv || createMut.isPending} className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50">{createMut.isPending ? 'جاري الإنشاء...' : 'إنشاء المرتجع'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Returns: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selected, setSelected] = useState<PurchaseReturnDto | null>(null);
  const qc = useQueryClient();
  const { data: returns = [], isLoading, error } = useQuery({ queryKey: ['purchaseReturns', statusFilter], queryFn: () => purchasesApi.getReturns({ status: statusFilter as JournalEntryStatus || undefined }) });
  const postMut = useMutation({ mutationFn: purchasesApi.postReturn, onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchaseReturns'] }); setSelected(null); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">مرتجعات الشراء</h1><p className="text-sm text-muted-foreground mt-1">إدارة مرتجعات الموردين — {returns.length} مرتجع</p></div>
        <button onClick={() => setShowBuilder(true)} className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl flex items-center gap-2"><span className="text-lg leading-none">+</span> مرتجع جديد</button>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
        <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${statusFilter === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>الكل</button>
        {(['Draft', 'Posted', 'Cancelled'] as JournalEntryStatus[]).map(s => <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${statusFilter === s ? `${sc[s].bg} ${sc[s].text} ${sc[s].border}` : 'bg-muted text-muted-foreground border-border'}`}>{sc[s].label}</button>)}
      </div>
      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل تحميل البيانات.</div>}
      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-right">رقم المرتجع</th><th className="px-5 py-3 text-right">التاريخ</th><th className="px-5 py-3 text-right">الفاتورة الأصلية</th><th className="px-5 py-3 text-right">المورد</th><th className="px-5 py-3 text-center">الحالة</th><th className="px-5 py-3 text-left">الإجمالي</th><th className="px-5 py-3 text-center">الإجراء</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {returns.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لا توجد مرتجعات.</td></tr> : returns.map(ret => (
                <tr key={ret.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(ret)}>
                  <td className="px-5 py-3 text-right font-semibold text-primary">{ret.returnNumber}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{formatDate(ret.returnDate)}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{ret.originalInvoiceNumber}</td>
                  <td className="px-5 py-3 text-right text-foreground">{ret.supplierName}</td>
                  <td className="px-5 py-3 text-center"><span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${sc[ret.status].bg} ${sc[ret.status].text} ${sc[ret.status].border}`}>{sc[ret.status].label}</span></td>
                  <td className="px-5 py-3 text-left font-semibold text-amber-500">{formatCurrency(ret.totalAmount)}</td>
                  <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {ret.status === 'Draft' && <button onClick={() => postMut.mutate(ret.id)} className="px-2.5 py-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20">ترحيل</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 relative flex items-center justify-between pl-14">
              <div><h3 className="text-lg font-bold text-foreground">{selected.returnNumber}</h3><span className="text-xs text-muted-foreground">الأصلي: {selected.originalInvoiceNumber} — {selected.supplierName}</span></div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${sc[selected.status].bg} ${sc[selected.status].text} ${sc[selected.status].border}`}>{sc[selected.status].label}</span>
              <button type="button" onClick={() => setSelected(null)} aria-label="إغلاق" className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><th className="px-4 py-2.5 text-right">الصنف</th><th className="px-4 py-2.5 text-center">الكمية</th><th className="px-4 py-2.5 text-left">تكلفة الوحدة</th><th className="px-4 py-2.5 text-left">الإجمالي</th></tr></thead>
                  <tbody className="divide-y divide-border/50">
                    {selected.lines.map(l => <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-right"><span className="text-xs text-muted-foreground ml-1.5">{l.productSKU}</span><span className="text-foreground">{l.productName}</span></td>
                      <td className="px-4 py-2.5 text-center">{formatStock(l.quantity)}</td>
                      <td className="px-4 py-2.5 text-left text-amber-500">{formatCurrency(l.unitCost)}</td>
                      <td className="px-4 py-2.5 text-left font-semibold text-foreground">{formatCurrency(l.totalPrice)}</td>
                    </tr>)}
                  </tbody>
                  <tfoot><tr className="bg-muted/40 font-bold"><td className="px-4 py-2.5 text-right text-muted-foreground" colSpan={3}>الإجمالي</td><td className="px-4 py-2.5 text-left text-amber-500">{formatCurrency(selected.totalAmount)}</td></tr></tfoot>
                </table>
              </div>
              {selected.status === 'Draft' && <div className="flex gap-3">
                <button onClick={() => postMut.mutate(selected.id)} disabled={postMut.isPending} className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50">{postMut.isPending ? 'جاري الترحيل...' : '✓ ترحيل المرتجع'}</button>
                <button onClick={() => setSelected(null)} className="px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">إغلاق</button>
              </div>}
              {selected.status !== 'Draft' && <button onClick={() => setSelected(null)} className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">إغلاق</button>}
            </div>
          </div>
        </div>
      )}
      <ReturnBuilder isOpen={showBuilder} onClose={() => setShowBuilder(false)} />
    </div>
  );
};

