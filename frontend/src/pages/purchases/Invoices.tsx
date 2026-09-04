import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, type PurchaseInvoiceDto, type JournalEntryStatus } from '../../services/purchasesApi';
import { inventoryApi } from '../../services/inventoryApi';
import type { SupplierDto } from '../../services/purchasesApi';

const fmt = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
const fmtStock = (n: number) => new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

const sc: Record<JournalEntryStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'مرحل' },
  Cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'ملغي' },
};

interface BuilderProps { isOpen: boolean; onClose: () => void; suppliers: SupplierDto[]; warehouses: { id: string; code: string; name: string }[]; products: { id: string; sku: string; name: string; currentStock: number }[]; }

const InvoiceBuilder: React.FC<BuilderProps> = ({ isOpen, onClose, suppliers, warehouses, products }) => {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ productId: string; qty: string; price: string }[]>([{ productId: '', qty: '', price: '' }]);
  const [error, setError] = useState<string | null>(null);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const subTotal = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0), 0);
  const addCosts = parseFloat(additionalCosts) || 0;
  const totalAmount = subTotal + addCosts;

  const updateLine = (i: number, k: string, v: string) => setLines(prev => { const n = [...prev]; (n[i] as Record<string, string>)[k] = v; return [...n]; });
  const addLine = () => setLines(prev => [...prev, { productId: '', qty: '', price: '' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i)); };

  const createMut = useMutation({
    mutationFn: purchasesApi.createInvoice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchaseInvoices'] }); setLines([{ productId: '', qty: '', price: '' }]); setAdditionalCosts(''); setNotes(''); onClose(); },
    onError: (e: { response?: { data?: { message?: string } } }) => setError(e.response?.data?.message || 'فشل'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!supplierId) { setError('يجب اختيار المورد.'); return; }
    if (!warehouseId) { setError('يجب اختيار المستودع.'); return; }
    const validLines = lines.filter(l => l.productId && parseFloat(l.qty) > 0).map(l => ({ productId: l.productId, quantity: parseFloat(l.qty), directUnitPrice: parseFloat(l.price) || 0, notes: null }));
    if (validLines.length === 0) { setError('يجب إدخال بند واحد على الأقل بكمية أكبر من الصفر.'); return; }
    for (const l of lines) {
      if (l.productId && parseFloat(l.qty) <= 0) {
        setError('جميع البنود يجب أن تكون بكمية أكبر من الصفر.'); return;
      }
    }
    createMut.mutate({ supplierId, warehouseId, lines: validLines, invoiceDate: new Date().toISOString().split('T')[0], dueDate: null, taxAmount: 0, additionalCosts: addCosts, notes: notes.trim() || null });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10"><h3 className="text-lg font-bold text-foreground">فاتورة شراء جديدة</h3></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المورد *</label>
              <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">اختر المورد...</option>{suppliers.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
              {selectedSupplier && (
                <p className="text-[10px] text-muted-foreground mt-1">الحساب المحاسبي: <span className="font-mono text-foreground">{selectedSupplier.code}</span> — الرصيد: <span className={`font-mono ${selectedSupplier.balance > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{fmt(selectedSupplier.balance)}</span></p>
              )}
            </div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المستودع *</label>
              <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">اختر المستودع...</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </select></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-semibold text-foreground">بنود الفاتورة</h4>
              <button type="button" onClick={addLine} className="px-3 py-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 border border-primary/30 rounded-lg">+ إضافة بند</button></div>
            <div className="grid grid-cols-[1fr_80px_100px_100px_140px_140px_40px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              <span>الصنف</span><span className="text-center">الكمية</span><span className="text-center">سعر الوحدة</span><span className="text-center">إجمالي البند</span><span className="text-center">تخصيص D-030</span><span className="text-center">التكلفة الفعّالة</span><span /></div>
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.price) || 0);
                const allocated = subTotal > 0 && addCosts > 0 ? (lineTotal / subTotal) * addCosts : 0;
                const effCost = parseFloat(line.qty) > 0 ? (parseFloat(line.price) || 0) + (allocated / parseFloat(line.qty)) : parseFloat(line.price) || 0;
                return (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_140px_140px_40px] gap-2 items-center bg-muted/30 rounded-lg p-2">
                    <select value={line.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)} className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm truncate focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">اختر...</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({fmtStock(p.currentStock)})</option>)}
                    </select>
                    <input type="number" min="0.0001" step="0.0001" value={line.qty} onChange={(e) => updateLine(idx, 'qty', e.target.value)} className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                    <input type="number" min="0" step="0.0001" value={line.price} onChange={(e) => updateLine(idx, 'price', e.target.value)} className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                    <div className="px-3 py-2 text-sm font-mono text-center text-foreground">{fmt(lineTotal)}</div>
                    <div className="px-3 py-2 text-sm font-mono text-center text-amber-500">{fmt(allocated)}</div>
                    <div className="px-3 py-2 text-sm font-mono text-center text-emerald-500">{fmt(effCost)}</div>
                    <button type="button" onClick={() => removeLine(idx)} disabled={lines.length <= 1} className="w-8 h-8 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg disabled:opacity-30">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">تكاليف إضافية (شحن/رسوم) — D-030</label>
              <input type="number" min="0" step="0.0001" value={additionalCosts} onChange={(e) => setAdditionalCosts(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="flex flex-col justify-end"><div className="text-right"><span className="text-xs text-muted-foreground">الإجمالي</span><p className="text-xl font-bold font-mono text-emerald-500">{fmt(totalAmount)}</p></div></div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">إلغاء</button>
            <button type="submit" disabled={createMut.isPending} className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50">{createMut.isPending ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Invoices: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selected, setSelected] = useState<PurchaseInvoiceDto | null>(null);
  const qc = useQueryClient();

  const { data: invoices = [], isLoading, error } = useQuery({ queryKey: ['purchaseInvoices', statusFilter, searchQuery], queryFn: () => purchasesApi.getInvoices({ status: statusFilter as JournalEntryStatus || undefined, search: searchQuery || undefined }) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => purchasesApi.getSuppliers() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });

  const postMut = useMutation({ mutationFn: purchasesApi.postInvoice, onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchaseInvoices'] }); setSelected(null); } });
  const cancelMut = useMutation({ mutationFn: purchasesApi.cancelInvoice, onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchaseInvoices'] }); setSelected(null); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">فواتير الشراء</h1><p className="text-sm text-muted-foreground mt-1">إدارة فواتير الشراء — {invoices.length} فاتورة</p></div>
        <button onClick={() => setShowBuilder(true)} className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl flex items-center gap-2"><span className="text-lg leading-none">+</span> فاتورة جديدة</button>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث..." className="flex-1 min-w-[200px] px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
        <div className="flex gap-2">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${statusFilter === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>الكل</button>
          {(['Draft', 'Posted', 'Cancelled'] as JournalEntryStatus[]).map(s => <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${statusFilter === s ? `${sc[s].bg} ${sc[s].text} ${sc[s].border}` : 'bg-muted text-muted-foreground border-border'}`}>{sc[s].label}</button>)}
        </div>
      </div>
      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل.</div>}
      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-center">رقم الفاتورة</th><th className="px-5 py-3 text-center">التاريخ</th><th className="px-5 py-3 text-center">المورد</th><th className="px-5 py-3 text-center">الحالة</th><th className="px-5 py-3 text-center">المجموع الفرعي</th><th className="px-5 py-3 text-center">تكاليف إضافية</th><th className="px-5 py-3 text-center">الإجمالي</th><th className="px-5 py-3 text-center">الإجراء</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {invoices.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">لا توجد فواتير.</td></tr> : invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(inv)}>
                  <td className="px-5 py-3 text-center font-mono font-semibold text-primary">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3 text-center font-mono text-muted-foreground">{fmtDate(inv.invoiceDate)}</td>
                  <td className="px-5 py-3 text-center text-foreground">{inv.supplierCode} — {inv.supplierName}</td>
                  <td className="px-5 py-3 text-center"><span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${sc[inv.status].bg} ${sc[inv.status].text} ${sc[inv.status].border}`}>{sc[inv.status].label}</span></td>
                  <td className="px-5 py-3 text-center font-mono text-foreground">{fmt(inv.subTotal)}</td>
                  <td className="px-5 py-3 text-center font-mono text-amber-500">{inv.additionalCosts > 0 ? fmt(inv.additionalCosts) : '-'}</td>
                  <td className="px-5 py-3 text-center font-mono font-semibold text-emerald-500">{fmt(inv.totalAmount)}</td>
                  <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {inv.status === 'Draft' && <button onClick={() => postMut.mutate(inv.id)} className="px-2 py-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded">ترحيل</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 flex items-center justify-between">
              <div><h3 className="text-lg font-bold text-foreground">{selected.invoiceNumber}</h3><span className="text-xs text-muted-foreground">{fmtDate(selected.invoiceDate)} — {selected.supplierName}</span></div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${sc[selected.status].bg} ${sc[selected.status].text} ${sc[selected.status].border}`}>{sc[selected.status].label}</span>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-center">الصنف</th><th className="px-4 py-2.5 text-center">الكمية</th><th className="px-4 py-2.5 text-center">سعر الوحدة</th><th className="px-4 py-2.5 text-center">تخصيص D-030</th><th className="px-4 py-2.5 text-center">التكلفة الفعّالة</th><th className="px-4 py-2.5 text-center">الإجمالي</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/50">
                    {selected.lines.map(l => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-center"><span className="font-mono text-xs text-muted-foreground mr-1">{l.productSKU}</span><span className="text-foreground">{l.productName}</span></td>
                        <td className="px-4 py-2.5 text-center font-mono">{fmtStock(l.quantity)}</td>
                        <td className="px-4 py-2.5 text-center font-mono">{fmt(l.directUnitPrice)}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-amber-500">{l.allocatedAdditionalCost > 0 ? fmt(l.allocatedAdditionalCost) : '-'}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-emerald-500">{fmt(l.effectiveUnitCost)}</td>
                        <td className="px-4 py-2.5 text-center font-mono font-semibold text-foreground">{fmt(l.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-muted/40 font-bold">
                    <td className="px-4 py-2.5 text-center text-muted-foreground" colSpan={5}>الإجمالي (شامل {fmt(selected.additionalCosts)} تكاليف إضافية)</td>
                    <td className="px-4 py-2.5 text-center font-mono text-emerald-500">{fmt(selected.totalAmount)}</td>
                  </tr></tfoot>
                </table>
              </div>
              {selected.status === 'Draft' && (
                <div className="flex gap-3">
                  <button onClick={() => postMut.mutate(selected.id)} disabled={postMut.isPending} className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50">{postMut.isPending ? 'جاري الترحيل...' : '✓ ترحيل'}</button>
                  <button onClick={() => setSelected(null)} className="px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">إغلاق</button>
                </div>
              )}
              {selected.status === 'Posted' && <button onClick={() => { if (window.confirm('هل تريد إلغاء هذه الفاتورة؟ سيؤدي هذا إلى عكس جميع القيود.')) cancelMut.mutate(selected.id); }} disabled={cancelMut.isPending} className="w-full px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-destructive hover:bg-destructive/90 rounded-lg disabled:opacity-50">{cancelMut.isPending ? 'جاري الإلغاء...' : '✕ إلغاء الفاتورة'}</button>}
              {selected.status !== 'Draft' && <button onClick={() => setSelected(null)} className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">إغلاق</button>}
            </div>
          </div>
        </div>
      )}
      <InvoiceBuilder isOpen={showBuilder} onClose={() => setShowBuilder(false)} suppliers={suppliers} warehouses={warehouses} products={products} />
    </div>
  );
};
