import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  purchasesApi, type PurchaseInvoiceDto, type CreatePurchaseInvoiceRequest,
} from '../../services/purchasesApi';
import { inventoryApi, type ProductDto } from '../../services/inventoryApi';
import {
  Plus, Save, Printer, XCircle, X, Loader2, AlertTriangle, Trash2, Copy, Lock, CheckCircle2, Banknote,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { QuickPartyModal } from '../../components/QuickPartyModal';
import { useAuthStore } from '../../store/useAuthStore';
import { StatusBadge } from '../../components/StatusBadge';
import { ActionButton } from '../../components/ActionButton';
import { phoenixCellInput, phoenixHeaderInput, focusCellInRow } from '../../components/phoenix/tokens';
import { SimpleCombobox, SelectedChip } from '../../components/phoenix/comboboxes';
import { usePhoenixShortcuts } from '../../components/phoenix/usePhoenixShortcuts';
import { showSuccess, showError } from '../../lib/toast';
import { formatCurrency, formatStock, formatDate } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  PURCHASE INVOICE PAGE — Phoenix style
//  /purchases/invoices/new (editor) + /purchases/invoices/:id
//  نقدي payment → defaults the supplier to مورد عام / نقدي
//  unless explicitly overridden.
// ═══════════════════════════════════════════════════════════

interface GridLine {
  rowId: string;
  productId: string;
  barcode: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine = (): GridLine => ({
  rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '', barcode: '', quantity: '', unitPrice: '',
});

// ── EDITOR ──

const InvoiceEditor: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { hasPermission } = useAuthStore();
  const canAddSupplier = hasPermission('Supplier.Supplier.Add');

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => purchasesApi.getSuppliers() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });

  // Default due date computed once (state initializer, not during render)
  const [defaultDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // ── Header state ──
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Credit');
  const [supplierId, setSupplierId] = useState('');
  const [supplierLocked, setSupplierLocked] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingSaved, setPendingSaved] = useState<PurchaseInvoiceDto | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [quickAddSupplierOpen, setQuickAddSupplierOpen] = useState(false);

  // ── Grid state ──
  const [lines, setLines] = useState<GridLine[]>([emptyLine()]);
  const firstSearchRef = useRef<HTMLDivElement>(null);

  const activeSuppliers = useMemo(() => suppliers.filter(s => s.isActive), [suppliers]);
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.isActive), [warehouses]);
  const cashSupplier = useMemo(
    () => suppliers.find(s => s.name.includes('مورد عام') || s.name.includes('نقدي') || s.name.toLowerCase().includes('cash supplier')),
    [suppliers]
  );

  // نقدي → auto-default & lock the supplier to مورد عام; آجل → enforce a real supplier.
  const [prevPaymentKey, setPrevPaymentKey] = useState<string | null>(null);
  const paymentKey = `${paymentType}:${cashSupplier?.id ?? ''}`;
  if (prevPaymentKey !== paymentKey) {
    setPrevPaymentKey(paymentKey);
    if (paymentType === 'Cash' && cashSupplier) {
      setSupplierId(cashSupplier.id);
      setSupplierLocked(true);
      setDueDate('');
    } else {
      setSupplierLocked(false);
      if (paymentType !== 'Cash') setSupplierId('');
      if (paymentType === 'Credit' && !dueDate) setDueDate(defaultDueDate);
    }
  }

  // Auto-fill the first warehouse once the list arrives
  const [prevWarehouseCount, setPrevWarehouseCount] = useState(0);
  if (prevWarehouseCount !== activeWarehouses.length) {
    setPrevWarehouseCount(activeWarehouses.length);
    if (!warehouseId && activeWarehouses.length > 0) setWarehouseId(activeWarehouses[0].id);
  }

  // ── Totals ──
  const subTotal = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0),
    [lines]
  );
  const addCosts = parseFloat(additionalCosts) || 0;
  const taxValue = parseFloat(taxAmount) || 0;
  const totalAmount = subTotal + addCosts + taxValue;

  // ── Grid mutations ──
  const updateLine = useCallback((i: number, patch: Partial<GridLine>) => {
    setLines(prev => { const n = [...prev]; n[i] = { ...n[i], ...patch }; return n; });
  }, []);

  const productByBarcode = useCallback(
    (code: string) => {
      const q = code.trim().toLowerCase();
      if (!q) return undefined;
      return products.find(p => p.sku.toLowerCase() === q)
        ?? products.find(p => p.name.toLowerCase() === q)
        ?? products.find(p => p.sku.toLowerCase().startsWith(q));
    },
    [products]
  );

  const handleProductSelect = useCallback((i: number, p: ProductDto) => {
    setLines(prev => {
      const n = [...prev];
      n[i] = { ...n[i], productId: p.id, barcode: p.sku, unitPrice: n[i].unitPrice || String(p.purchasePrice), quantity: n[i].quantity || '1' };
      return n;
    });
  }, []);

  const addLine = useCallback(() => setLines(prev => [...prev, emptyLine()]), []);
  const removeLine = useCallback((i: number) => {
    setLines(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [emptyLine()]));
  }, []);
  const duplicateLine = useCallback((i: number) => {
    setLines(prev => { const n = [...prev]; n.splice(i + 1, 0, { ...n[i], rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }); return n; });
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: CreatePurchaseInvoiceRequest) => purchasesApi.createInvoice(data),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      showSuccess(`تم إنشاء الفاتورة ${inv.invoiceNumber} كمسودة`);
      setPendingSaved(inv);
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر حفظ الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  const postMutation = useMutation({
    mutationFn: purchasesApi.postInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      showSuccess(res.message || 'تم ترحيل الفاتورة بنجاح');
      navigate(`/purchases/invoices/${res.invoice.id}`, { replace: true });
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  const buildRequest = useCallback((): CreatePurchaseInvoiceRequest | null => {
    setError(null);
    if (!supplierId) { setError('يجب اختيار المورد.'); return null; }
    if (!warehouseId) { setError('يجب اختيار المستودع.'); return null; }
    const validLines = lines
      .filter(l => l.productId && parseFloat(l.quantity) > 0)
      .map(l => ({ productId: l.productId, quantity: parseFloat(l.quantity), directUnitPrice: parseFloat(l.unitPrice) || 0, notes: null }));
    if (lines.some(l => l.productId && !(parseFloat(l.quantity) > 0))) {
      setError('جميع البنود المحددة يجب أن تكون بكمية أكبر من الصفر.');
      return null;
    }
    if (validLines.length === 0) { setError('يجب إدخال بند واحد على الأقل بكمية أكبر من الصفر.'); return null; }
    return {
      supplierId, warehouseId, lines: validLines,
      invoiceDate, dueDate: dueDate || null,
      taxAmount: taxValue, additionalCosts: addCosts,
      notes: notes.trim() || null,
    };
  }, [lines, supplierId, warehouseId, invoiceDate, dueDate, taxValue, addCosts, notes]);

  const handleSave = useCallback(() => {
    if (pendingSaved) { postMutation.mutate(pendingSaved.id); return; }
    const req = buildRequest();
    if (!req) return;
    createMutation.mutate(req);
  }, [pendingSaved, buildRequest, createMutation, postMutation]);

  usePhoenixShortcuts({
    onNew: () => { navigate('/purchases/invoices/new'); window.location.reload(); },
    onSave: handleSave,
    onClose: () => navigate('/purchases/invoices'),
    onPrint: () => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ الفاتورة (F10)'),
  });

  return (
    <div className="space-y-4" dir="rtl">
      {/* ══ Top Action Bar ══ */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-lg font-bold text-foreground">فاتورة مشتريات جديدة</span>
            {pendingSaved && <StatusBadge status={pendingSaved.status} className="px-3 py-1 text-xs" />}
          </div>
          <ActionButton icon={<Plus size={14} />} label="جديد" shortcut="F2" onClick={() => { navigate('/purchases/invoices/new'); window.location.reload(); }} />
          <ActionButton
            icon={pendingSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            label={pendingSaved ? 'ترحيل' : 'حفظ'} shortcut="F10"
            variant={pendingSaved ? 'success' : 'primary'}
            onClick={handleSave} loading={createMutation.isPending || postMutation.isPending}
          />
          <ActionButton icon={<Printer size={14} />} label="طباعة" shortcut="Ctrl+P"
            onClick={() => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ الفاتورة (F10)')} />
          <ActionButton icon={<XCircle size={14} />} label="إلغاء" variant="destructive" onClick={() => setConfirmCancel(true)} />
          <ActionButton icon={<X size={14} />} label="إغلاق" shortcut="Esc" variant="ghost" onClick={() => navigate('/purchases/invoices')} />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" /> {error}
        </div>
      )}
      {paymentType === 'Cash' && !cashSupplier && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" /> أنشئ مورداً باسم "مورد عام / نقدي" ليتم ربطه تلقائياً بالفواتير النقدية.
        </div>
      )}

      {/* ══ ترويسة الفاتورة ══ */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Payment type */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">نوع الدفع *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Credit', 'Cash'] as const).map(t => (
                <button key={t} type="button" onClick={() => setPaymentType(t)}
                  className={`h-9 px-2 text-xs font-bold rounded-md border transition-colors ${
                    paymentType === t
                      ? (t === 'Cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-primary text-primary-foreground border-primary')
                      : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                  }`}>
                  {t === 'Cash' ? 'نقدي' : 'آجل'}
                </button>
              ))}
            </div>
            {paymentType === 'Cash' && <p className="text-[10px] text-muted-foreground mt-1">الحساب المقابل: الخزينة/الصندوق</p>}
          </div>

          {/* Supplier — locked for cash */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">
              المورد {paymentType === 'Credit' && '*'}
              {supplierLocked && <Lock size={11} className="inline-block mr-1 text-muted-foreground" />}
            </label>
            <div className="flex items-center gap-2">
            <select
              required={paymentType === 'Credit'} value={supplierId} disabled={supplierLocked}
              onChange={(e) => setSupplierId(e.target.value)}
              className={`${phoenixHeaderInput} flex-1 ${supplierLocked ? 'opacity-70 cursor-not-allowed bg-muted/50' : ''}`}
            >
              <option value="">اختر المورد...</option>
              {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
            {canAddSupplier && !supplierLocked && (
              <button
                type="button"
                onClick={() => setQuickAddSupplierOpen(true)}
                title="إضافة مورد جديد دون مغادرة الفاتورة"
                aria-label="إضافة مورد جديد"
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus size={15} />
              </button>
            )}
            </div>
            {(() => {
              const sel = activeSuppliers.find(s => s.id === supplierId);
              return sel ? (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  الرصيد: <span className={sel.balance > 0 ? 'text-amber-500 font-semibold' : 'text-foreground'}>{formatCurrency(sel.balance)}</span>
                </p>
              ) : null;
            })()}
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">المستودع *</label>
            <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={phoenixHeaderInput}>
              <option value="">اختر المستودع...</option>
              {activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>

          {/* Invoice # */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">الرقم الآلي</label>
            <div className="h-9 px-3 flex items-center bg-muted/40 border border-border rounded-md text-sm text-muted-foreground">
              يُولَّد تلقائياً عند الحفظ
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">التاريخ *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={phoenixHeaderInput} />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">تاريخ الاستحقاق {paymentType === 'Credit' ? '*' : ''}</label>
            <input type="date" value={dueDate} disabled={paymentType === 'Cash'}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${phoenixHeaderInput} ${paymentType === 'Cash' ? 'opacity-50 cursor-not-allowed' : ''}`} />
          </div>

          {/* Notes */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">البيان / الملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري..." className={phoenixHeaderInput} />
          </div>
        </div>
      </div>

      {/* ══ جدول البنود ══ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">بنود الفاتورة</h3>
          <button type="button" onClick={addLine}
            className="h-8 px-3 text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1">
            <Plus size={13} /> إضافة بند
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <th className="px-2 py-2.5 w-10 text-center">#</th>
                <th className="px-2 py-2.5 w-32 text-center">الباركود / الكود</th>
                <th className="px-2 py-2.5 text-center">اسم الصنف</th>
                <th className="px-2 py-2.5 w-20 text-center">الوحدة</th>
                <th className="px-2 py-2.5 w-24 text-center">الكمية</th>
                <th className="px-2 py-2.5 w-28 text-center">سعر الشراء</th>
                <th className="px-2 py-2.5 w-32 text-center">إجمالي البند</th>
                <th className="px-2 py-2.5 w-16 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {lines.map((line, idx) => {
                const product = products.find(p => p.id === line.productId);
                const qty = parseFloat(line.quantity) || 0;
                const price = parseFloat(line.unitPrice) || 0;
                const lineTotal = qty * price;
                const allocated = subTotal > 0 && addCosts > 0 ? (lineTotal / subTotal) * addCosts : 0;
                const effCost = qty > 0 ? price + (allocated / qty) : price;
                return (
                  <tr key={line.rowId} className="hover:bg-muted/20">
                    <td className="px-2 py-1.5 text-center text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <input
                        value={line.barcode}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateLine(idx, { barcode: v });
                          const hit = productByBarcode(v);
                          if (hit && v.trim().length >= 2) handleProductSelect(idx, hit);
                        }}
                        onKeyDown={(e) => focusCellInRow(e, 3)}
                        placeholder="—"
                        className={`${phoenixCellInput(false)} text-center font-mono text-xs`}
                      />
                    </td>
                    <td className="px-2 py-1.5 min-w-[220px]">
                      {product ? (
                        <SelectedChip title={product.name} onClick={() => updateLine(idx, { productId: '', barcode: '' })} />
                      ) : (
                        <div ref={idx === 0 ? firstSearchRef : undefined}>
                          <SimpleCombobox
                            items={products.filter(p => p.isActive)}
                            searchText={(p) => `${p.name} ${p.sku}`}
                            primary={(p) => p.name}
                            secondary={(p) => `${p.sku} — ${p.unitOfMeasure}`}
                            trailing={(p) => (
                              <>
                                <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(p.purchasePrice)}</span>
                                <span className="block text-[10px] text-muted-foreground tabular-nums">مخزون: {formatStock(p.currentStock)}</span>
                              </>
                            )}
                            onSelect={(p) => handleProductSelect(idx, p)}
                            onEmptyEnter={addLine}
                            autoFocus={idx === 0}
                            placeholder="اكتب اسم الصنف أو امسح الباركود..."
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-muted-foreground">{product?.unitOfMeasure ?? '—'}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.0001" value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                        onKeyDown={(e) => focusCellInRow(e, 6)}
                        className={`${phoenixCellInput(false)} text-center`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.0001" value={line.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                        className={`${phoenixCellInput(false)} text-center`}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(lineTotal)}</div>
                      {(allocated > 0 || effCost !== price) && (
                        <div className="text-[10px] text-muted-foreground tabular-nums">تكلفة فعّالة: <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(effCost)}</span></div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => duplicateLine(idx)} aria-label="تكرار البند"
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="تكرار البند">
                          <Copy size={13} />
                        </button>
                        <button type="button" onClick={() => removeLine(idx)} disabled={lines.length <= 1} aria-label="حذف البند"
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-30" title="حذف البند">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground flex flex-wrap gap-4">
          <span><kbd className="font-mono bg-muted px-1 rounded">Enter</kbd> الانتقال بين الخلايا</span>
          <span><kbd className="font-mono bg-muted px-1 rounded">F10</kbd> حفظ / ترحيل</span>
          <span><kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> إغلاق</span>
        </div>
      </div>

      {/* ══ شريط الإجماليات ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">تكاليف إضافية (شحن/رسوم)</label>
            <input type="number" min="0" step="0.0001" value={additionalCosts} onChange={(e) => setAdditionalCosts(e.target.value)} className={phoenixHeaderInput} />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">الضريبة (قيمة)</label>
            <input type="number" min="0" step="0.0001" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} className={phoenixHeaderInput} />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري..." className={phoenixHeaderInput} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>إجمالي البنود</span>
            <span className="font-semibold tabular-nums text-foreground">{formatCurrency(subTotal)}</span>
          </div>
          {addCosts > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>تكاليف إضافية</span>
              <span className="font-semibold tabular-nums text-amber-500">+{formatCurrency(addCosts)}</span>
            </div>
          )}
          {taxValue > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>الضريبة</span>
              <span className="font-semibold tabular-nums text-foreground">+{formatCurrency(taxValue)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-sm font-bold text-foreground">الإجمالي الكلي</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="border-t border-border pt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Banknote size={13} className="text-muted-foreground shrink-0" />
            {paymentType === 'Cash'
              ? 'فاتورة نقدية — يُسجل المبلغ على الخزينة عند الترحيل.'
              : 'فاتورة آجلة — يُسجل المبلغ على حساب المورد عند الترحيل.'}
          </div>
        </div>
      </div>

      {quickAddSupplierOpen && (
        <QuickPartyModal
          kind="supplier"
          existingCodes={suppliers.map((s) => s.code)}
          onClose={() => setQuickAddSupplierOpen(false)}
          onCreated={(party) => setSupplierId(party.id)}
        />
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء الفاتورة الجديدة"
        message="هل تريد الخروج دون حفظ؟ سيتم تجاهل جميع البنود المدخلة."
        confirmLabel="خروج دون حفظ"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => navigate('/purchases/invoices')}
      />
    </div>
  );
};

// ── DETAIL ──

const InvoiceDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState(false);

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['purchaseInvoice', id],
    queryFn: () => purchasesApi.getInvoiceById(id),
    enabled: !!id,
  });

  // Sequential navigation across the purchase-invoice list (newest first).
  const { data: invoiceList = [] } = useQuery({
    queryKey: ['purchaseInvoices'],
    queryFn: () => purchasesApi.getInvoices(),
  });
  const listIndex = invoiceList.findIndex((i) => i.id === id);
  const previousInvoice = listIndex > 0 ? invoiceList[listIndex - 1] : null;
  const nextInvoice = listIndex >= 0 && listIndex < invoiceList.length - 1 ? invoiceList[listIndex + 1] : null;

  const postMutation = useMutation({
    mutationFn: purchasesApi.postInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', id] });
      showSuccess(res.message || 'تم ترحيل الفاتورة بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  const cancelMutation = useMutation({
    mutationFn: purchasesApi.cancelInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', id] });
      setCancelTarget(false);
      showSuccess(res.message || 'تم إلغاء الفاتورة');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر إلغاء الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  usePhoenixShortcuts({
    onNew: () => { navigate('/purchases/invoices/new'); window.location.reload(); },
    onClose: () => navigate('/purchases/invoices'),
    onPrint: () => window.print(),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-16 text-muted-foreground gap-3"><Loader2 size={20} className="animate-spin" /> جاري التحميل...</div>;
  }
  if (error || !inv) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm space-y-3">
        <p className="flex items-center gap-2"><AlertTriangle size={16} /> تعذر تحميل الفاتورة.</p>
        <button onClick={() => navigate('/purchases/invoices')} className="px-4 h-9 text-xs font-bold bg-muted border border-border rounded-lg text-foreground hover:bg-accent">العودة للقائمة</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Previous / Next invoice — adjacent documents in the list */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!previousInvoice}
                onClick={() => previousInvoice && navigate(`/purchases/invoices/${previousInvoice.id}`)}
                title={previousInvoice ? `السابق — ${previousInvoice.invoiceNumber}` : 'لا توجد فاتورة سابقة'}
                aria-label="الفاتورة السابقة"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-muted text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-lg font-bold text-foreground tabular-nums">{inv.invoiceNumber}</span>
              <button
                type="button"
                disabled={!nextInvoice}
                onClick={() => nextInvoice && navigate(`/purchases/invoices/${nextInvoice.id}`)}
                title={nextInvoice ? `التالي — ${nextInvoice.invoiceNumber}` : 'لا توجد فاتورة تالية'}
                aria-label="الفاتورة التالية"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-muted text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            <StatusBadge status={inv.status} className="px-3 py-1 text-xs" />
          </div>
          <button type="button" onClick={() => { navigate('/purchases/invoices/new'); window.location.reload(); }}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-muted text-foreground hover:bg-accent border border-border transition-all active:scale-[0.98]">
            <Plus size={14} /> جديد <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">F2</kbd>
          </button>
          {inv.status === 'Draft' && (
            <button type="button" onClick={() => postMutation.mutate(inv.id)} disabled={postMutation.isPending}
              className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50">
              {postMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} ترحيل <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 rounded">F10</kbd>
            </button>
          )}
          <button type="button" onClick={() => window.print()}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-muted text-foreground hover:bg-accent border border-border transition-all active:scale-[0.98]">
            <Printer size={14} /> طباعة <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Ctrl+P</kbd>
          </button>
          {inv.status === 'Posted' && (
            <button type="button" onClick={() => setCancelTarget(true)}
              className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 transition-all active:scale-[0.98]">
              <XCircle size={14} /> إلغاء الفاتورة
            </button>
          )}
          <button type="button" onClick={() => navigate('/purchases/invoices')}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent transition-all">
            <X size={14} /> إغلاق <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Esc</kbd>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'المورد', value: `${inv.supplierCode} — ${inv.supplierName}` },
          { label: 'المستودع', value: inv.warehouseName },
          { label: 'التاريخ', value: formatDate(inv.invoiceDate) },
          { label: 'الاستحقاق', value: inv.dueDate ? formatDate(inv.dueDate) : '—' },
          { label: 'الملاحظات', value: inv.notes || '—' },
        ].map(f => (
          <div key={f.label}>
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">{f.label}</p>
            <p className="text-sm font-semibold text-foreground truncate">{f.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5 text-center">الصنف</th>
                <th className="px-3 py-2.5 text-center">الكمية</th>
                <th className="px-3 py-2.5 text-center">سعر الشراء</th>
                <th className="px-3 py-2.5 text-center">تخصيص التكاليف</th>
                <th className="px-3 py-2.5 text-center">التكلفة الفعّالة</th>
                <th className="px-3 py-2.5 text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {inv.lines.map((l, i) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5"><span className="text-[10px] text-muted-foreground mr-2 font-mono">{l.productSKU}</span><span className="font-semibold text-foreground">{l.productName}</span></td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatStock(l.quantity)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatCurrency(l.directUnitPrice)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-amber-500">{l.allocatedAdditionalCost > 0 ? formatCurrency(l.allocatedAdditionalCost) : '—'}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(l.effectiveUnitCost)}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-foreground tabular-nums">{formatCurrency(l.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-start">
        <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-xs space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span className="tabular-nums text-foreground font-semibold">{formatCurrency(inv.subTotal)}</span></div>
          {inv.additionalCosts > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>تكاليف إضافية</span><span className="tabular-nums text-amber-500 font-semibold">+{formatCurrency(inv.additionalCosts)}</span></div>}
          {inv.taxAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>الضريبة</span><span className="tabular-nums text-foreground font-semibold">{formatCurrency(inv.taxAmount)}</span></div>}
          <div className="flex justify-between border-t border-border pt-2"><span className="text-sm font-bold text-foreground">الإجمالي</span><span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(inv.totalAmount)}</span></div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelTarget}
        title={`تأكيد إلغاء ${inv.invoiceNumber}`}
        message="هل تريد إلغاء هذه الفاتورة؟ سيؤدي هذا إلى عكس جميع القيود المحاسبية وتخصيصات التكاليف."
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(inv.id)}
        onCancel={() => setCancelTarget(false)}
      />
    </div>
  );
};

// ── ROUTE ENTRY ──

export const PurchaseInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return id ? <InvoiceDetail /> : <InvoiceEditor />;
};
