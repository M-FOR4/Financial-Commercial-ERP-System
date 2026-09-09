import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, type PurchaseInvoiceDto, type JournalEntryStatus } from '../../services/purchasesApi';
import { inventoryApi } from '../../services/inventoryApi';
import type { SupplierDto } from '../../services/purchasesApi';
import { X, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatStock, formatDate } from '../../utils/format';

const sc: Record<JournalEntryStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'مرحل' },
  Cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'ملغي' },
};

interface BuilderProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: SupplierDto[];
  warehouses: { id: string; code: string; name: string }[];
  products: { id: string; sku: string; name: string; currentStock: number }[];
}

const InvoiceBuilder: React.FC<BuilderProps> = ({ isOpen, onClose, suppliers, warehouses, products }) => {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ productId: string; qty: string; price: string }[]>([{ productId: '', qty: '', price: '' }]);
  const [error, setError] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const subTotal = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0), 0);
  const addCosts = parseFloat(additionalCosts) || 0;
  const totalAmount = subTotal + addCosts;

  const updateLine = (i: number, k: string, v: string) =>
    setLines((prev) => {
      const n = [...prev];
      (n[i] as Record<string, string>)[k] = v;
      return [...n];
    });

  const addLine = () => setLines((prev) => [...prev, { productId: '', qty: '', price: '' }]);
  const removeLine = (i: number) => {
    if (lines.length > 1) setLines((prev) => prev.filter((_, idx) => idx !== i));
  };

  const createMut = useMutation({
    mutationFn: purchasesApi.createInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      setLines([{ productId: '', qty: '', price: '' }]);
      setAdditionalCosts('');
      setNotes('');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => setError(e.response?.data?.message || 'فشل في إنشاء الفاتورة'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) {
      setError('يجب اختيار المورد.');
      return;
    }
    if (!warehouseId) {
      setError('يجب اختيار المستودع.');
      return;
    }
    const validLines = lines
      .filter((l) => l.productId && parseFloat(l.qty) > 0)
      .map((l) => ({ productId: l.productId, quantity: parseFloat(l.qty), directUnitPrice: parseFloat(l.price) || 0, notes: null }));
    if (validLines.length === 0) {
      setError('يجب إدخال بند واحد على الأقل بكمية أكبر من الصفر.');
      return;
    }
    for (const l of lines) {
      if (l.productId && parseFloat(l.qty) <= 0) {
        setError('جميع البنود يجب أن تكون بكمية أكبر من الصفر.');
        return;
      }
    }
    createMut.mutate({
      supplierId,
      warehouseId,
      lines: validLines,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: null,
      taxAmount: 0,
      additionalCosts: addCosts,
      notes: notes.trim() || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — sticky, full title, absolute close on the left (RTL) */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-border bg-card">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all"
          >
            <X size={20} />
          </button>
          <h3 className="text-xl font-bold text-foreground pr-8">فاتورة مشتريات جديدة</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}

          {/* Metadata — responsive 1/2/3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المورد *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">اختر المورد...</option>
                {suppliers.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
              {selectedSupplier && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  الحساب المحاسبي: <span className="font-bold text-foreground">{selectedSupplier.code}</span> — الرصيد: <span className={`font-bold ${selectedSupplier.balance > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{formatCurrency(selectedSupplier.balance)}</span>
                </p>
              )}
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المستودع *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">اختر المستودع...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">التاريخ</label>
              <input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                readOnly
                className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm text-right opacity-80"
              />
            </div>
          </div>

          {/* Line Items — 7-column grid, fixed numeric columns never clip */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">بنود الفاتورة</h4>
              <button
                type="button"
                onClick={addLine}
                className="px-3 py-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 border border-primary/20 rounded-lg"
              >
                + إضافة بند
              </button>
            </div>

            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_90px_110px_130px_140px_140px_40px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              <span>المادة / البند</span>
              <span className="text-center">الكمية</span>
              <span className="text-center">سعر الوحدة</span>
              <span className="text-center">إجمالي البند</span>
              <span className="text-center">تخصيص / مصروفات</span>
              <span className="text-center">التكلفة الفعّالة</span>
              <span />
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.price) || 0);
                const allocated = subTotal > 0 && addCosts > 0 ? (lineTotal / subTotal) * addCosts : 0;
                const effCost = parseFloat(line.qty) > 0 ? (parseFloat(line.price) || 0) + (allocated / parseFloat(line.qty)) : parseFloat(line.price) || 0;
                return (
                  <div key={idx} className="md:grid md:grid-cols-[minmax(0,1fr)_90px_110px_130px_140px_140px_40px] md:gap-2 md:items-center space-y-2 md:space-y-0 bg-muted/30 md:bg-transparent rounded-lg p-3 md:p-0">
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                      className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm truncate focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                    >
                      <option value="">اختر...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} ({formatStock(p.currentStock)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                      className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={line.price}
                      onChange={(e) => updateLine(idx, 'price', e.target.value)}
                      className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="h-9 px-2 flex items-center justify-center text-sm font-semibold text-foreground tabular-nums whitespace-nowrap overflow-hidden">{formatCurrency(lineTotal)}</div>
                    <div className="h-9 px-2 flex items-center justify-center text-sm font-semibold text-amber-500 tabular-nums whitespace-nowrap overflow-hidden">{formatCurrency(allocated)}</div>
                    <div className="h-9 px-2 flex items-center justify-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap overflow-hidden">{formatCurrency(effCost)}</div>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 1}
                      aria-label="حذف البند"
                      className="w-9 h-9 mx-auto md:mx-0 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional costs, notes, total — responsive 1/3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">تكاليف إضافية (شحن/رسوم) — D-030</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={additionalCosts}
                onChange={(e) => setAdditionalCosts(e.target.value)}
                className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اختياري..."
                className="w-full h-9 px-3 py-1 bg-input border border-border rounded-md text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full flex items-center justify-between px-4 h-11 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <span className="text-xs font-semibold text-muted-foreground">الإجمالي الكلي</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg tabular-nums">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Action bar — cancel + submit bottom-left, Loader2 while submitting */}
          <div className="flex flex-wrap gap-3 justify-end pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 h-9 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-md transition-colors">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="px-4 h-9 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
            >
              {createMut.isPending && <Loader2 size={16} className="animate-spin" />}
              {createMut.isPending ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
            </button>
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
  const [cancelTarget, setCancelTarget] = useState<PurchaseInvoiceDto | null>(null);
  const qc = useQueryClient();

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['purchaseInvoices', statusFilter, searchQuery],
    queryFn: () => purchasesApi.getInvoices({ status: (statusFilter as JournalEntryStatus) || undefined, search: searchQuery || undefined }),
  });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => purchasesApi.getSuppliers() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });

  const postMut = useMutation({
    mutationFn: purchasesApi.postInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      setSelected(null);
    },
  });
  const cancelMut = useMutation({
    mutationFn: purchasesApi.cancelInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      setSelected(null);
    },
  });

  return (
    <div className="space-y-6 text-right">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">فواتير الشراء</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة فواتير الشراء — {invoices.length} فاتورة</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> فاتورة جديدة
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في فواتير الشراء..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              statusFilter === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            الكل
          </button>
          {(['Draft', 'Posted', 'Cancelled'] as JournalEntryStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                statusFilter === s ? `${sc[s].bg} ${sc[s].text} ${sc[s].border}` : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {sc[s].label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل في تحميل فواتير الشراء.</div>}
      {isLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      )}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-right">رقم الفاتورة</th>
                <th className="px-5 py-3 text-right">التاريخ</th>
                <th className="px-5 py-3 text-right">المورد</th>
                <th className="px-5 py-3 text-right">الحالة</th>
                <th className="px-5 py-3 text-right">المجموع الفرعي</th>
                <th className="px-5 py-3 text-right">تكاليف إضافية</th>
                <th className="px-5 py-3 text-right">الإجمالي</th>
                <th className="px-5 py-3 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    لا توجد فواتير.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelected(inv)}>
                    <td className="px-5 py-3 text-right font-bold text-primary">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-5 py-3 text-right text-foreground font-medium">
                      {inv.supplierCode} — {inv.supplierName}
                    </td>
                    <td className="px-5 py-3 text-right"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">{formatCurrency(inv.subTotal)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-amber-500">{inv.additionalCosts > 0 ? formatCurrency(inv.additionalCosts) : '-'}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {inv.status === 'Draft' && (
                        <button
                          onClick={() => postMut.mutate(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
                        >
                          ترحيل
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto text-right" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 relative flex items-center justify-between pl-14">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selected.invoiceNumber}</h3>
                <span className="text-xs text-muted-foreground">
                  {formatDate(selected.invoiceDate)} — {selected.supplierName}
                </span>
              </div>
              <StatusBadge status={selected.status} className="px-3 py-1 text-xs" />
              <button type="button" onClick={() => setSelected(null)} aria-label="إغلاق" className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2.5 text-right">الصنف</th>
                      <th className="px-4 py-2.5 text-right">الكمية</th>
                      <th className="px-4 py-2.5 text-right">سعر الوحدة</th>
                      <th className="px-4 py-2.5 text-right">تخصيص D-030</th>
                      <th className="px-4 py-2.5 text-right">التكلفة الفعّالة</th>
                      <th className="px-4 py-2.5 text-right">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {selected.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs font-bold text-muted-foreground ml-1.5">{l.productSKU}</span>
                          <span className="text-foreground font-medium">{l.productName}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{formatStock(l.quantity)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(l.directUnitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-amber-500">{l.allocatedAdditionalCost > 0 ? formatCurrency(l.allocatedAdditionalCost) : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(l.effectiveUnitCost)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-foreground">{formatCurrency(l.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 font-bold">
                      <td className="px-4 py-2.5 text-right text-muted-foreground" colSpan={5}>
                        الإجمالي (شامل {formatCurrency(selected.additionalCosts)} تكاليف إضافية)
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selected.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {selected.status === 'Draft' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => postMut.mutate(selected.id)}
                    disabled={postMut.isPending}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50"
                  >
                    {postMut.isPending ? 'جاري الترحيل...' : '✓ ترحيل'}
                  </button>
                  <button onClick={() => setSelected(null)} className="px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">
                    إغلاق
                  </button>
                </div>
              )}
              {selected.status === 'Posted' && (
                <button
                  onClick={() => setCancelTarget(selected)}
                  disabled={cancelMut.isPending}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-destructive hover:bg-destructive/90 rounded-lg disabled:opacity-50"
                >
                  ✕ إلغاء الفاتورة
                </button>
              )}
              {selected.status !== 'Draft' && (
                <button onClick={() => setSelected(null)} className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg">
                  إغلاق
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <InvoiceBuilder isOpen={showBuilder} onClose={() => setShowBuilder(false)} suppliers={suppliers} warehouses={warehouses} products={products} />

      <ConfirmDialog
        open={cancelTarget !== null}
        title={`تأكيد إلغاء ${cancelTarget?.invoiceNumber ?? ''}`}
        message="هل تريد إلغاء هذه الفاتورة؟ سيؤدي هذا إلى عكس جميع القيود المحاسبية وتخصيصات التكاليف."
        confirmLabel="تأكيد الإلغاء"
        isPending={cancelMut.isPending}
        onConfirm={() => { if (cancelTarget) cancelMut.mutate(cancelTarget.id); }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};
