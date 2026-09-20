import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  salesApi, type SalesInvoiceDto, type CreateSalesInvoiceRequest,
} from '../../services/salesApi';
import { inventoryApi, type ProductDto } from '../../services/inventoryApi';
import { settingsApi } from '../../services/settingsApi';import { Plus, Save, Printer, XCircle, X, Loader2, AlertTriangle, Pause,
  Trash2, Copy, Lock, Banknote, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { QuickPartyModal } from '../../components/QuickPartyModal';
import { ActionButton } from '../../components/ActionButton';
import { useAuthStore } from '../../store/useAuthStore';
import { phoenixCellInput, phoenixHeaderInput } from '../../components/phoenix/tokens';
import { SimpleCombobox, SelectedChip } from '../../components/phoenix/comboboxes';
import { usePhoenixShortcuts } from '../../components/phoenix/usePhoenixShortcuts';
import { StatusBadge } from '../../components/StatusBadge';
import { showSuccess, showError } from '../../lib/toast';
import { formatCurrency, formatStock, formatDate } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  SALES INVOICE PAGE — Phoenix style (منظومة فينكس)
//  Full-page invoice editor mounted on /sales/invoices/new
//  and /sales/invoices/:id — never a modal.
//  Keyboard-first: F2 new, F10 save, Ctrl+P print, Esc close,
//  Enter hops grid cells, Alt+ArrowDown opens the item search.
// ═══════════════════════════════════════════════════════════

type PaymentType = 'Cash' | 'Credit' | 'Card' | 'Mixed';
const PAYMENT_TYPES: { id: PaymentType; label: string }[] = [
  { id: 'Cash', label: 'نقدي' },
  { id: 'Credit', label: 'آجل' },
  { id: 'Card', label: 'بطاقة/مصرفي' },
  { id: 'Mixed', label: 'مزدوج' },
];

interface GridLine {
  rowId: string;
  productId: string;
  barcode: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  discountAmount: string;
}

const emptyLine = (): GridLine => ({
  rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '', barcode: '', quantity: '', unitPrice: '', discountPercent: '', discountAmount: '',
});

const cellInput = phoenixCellInput;
const headerInput = phoenixHeaderInput;

// ═══════════════════════════════════════════════════════════
//  INVOICE EDITOR — new invoice at /sales/invoices/new
// ═══════════════════════════════════════════════════════════

const InvoiceEditor: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { hasPermission } = useAuthStore();
  const canAddCustomer = hasPermission('Customer.Customer.Add');

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => salesApi.getCustomers() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });
  const { data: settings } = useQuery({ queryKey: ['settings-general'], queryFn: () => settingsApi.getGeneral() });
  const allowNegativeStock = settings?.allowNegativeStock ?? false;

  // ── Header state ──
  const [paymentType, setPaymentType] = useState<PaymentType>('Credit');
  const [customerId, setCustomerId] = useState('');
  const [customerLocked, setCustomerLocked] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingSaved, setPendingSaved] = useState<SalesInvoiceDto | null>(null);
  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);

  // ── Settlement state ──
  const [paidAmount, setPaidAmount] = useState('');
  const [extraDiscount, setExtraDiscount] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ── Grid state ──
  const [lines, setLines] = useState<GridLine[]>([emptyLine()]);
  const firstSearchRef = useRef<HTMLDivElement>(null);

  const activeCustomers = useMemo(() => customers.filter(c => c.isActive), [customers]);
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.isActive), [warehouses]);
  const cashCustomer = useMemo(
    () => customers.find(c => c.name.includes('زبون عام') || c.name.toLowerCase().includes('cash customer')),
    [customers]
  );

  // Default due date computed once (state initializer, not during render)
  const [defaultDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // نقدي → auto-default & lock the customer to زبون عام; آجل → enforce a real customer.
  // Render-time adjustment (not an effect) so state follows the toggle synchronously.
  const [prevPaymentKey, setPrevPaymentKey] = useState<string | null>(null);
  const paymentKey = `${paymentType}:${cashCustomer?.id ?? ''}`;
  if (prevPaymentKey !== paymentKey) {
    setPrevPaymentKey(paymentKey);
    if (paymentType === 'Cash' && cashCustomer) {
      setCustomerId(cashCustomer.id);
      setCustomerLocked(true);
      setDueDate('');
    } else {
      setCustomerLocked(false);
      if (paymentType !== 'Cash') setCustomerId('');
      if (paymentType === 'Credit' && !dueDate) setDueDate(defaultDueDate);
    }
  }

  // Auto-fill the first warehouse once the list arrives (render-time adjustment)
  const [prevWarehouseCount, setPrevWarehouseCount] = useState(0);
  if (prevWarehouseCount !== activeWarehouses.length) {
    setPrevWarehouseCount(activeWarehouses.length);
    if (!warehouseId && activeWarehouses.length > 0) setWarehouseId(activeWarehouses[0].id);
  }

  // نقدي → paid amount tracks the net total automatically (still editable)
  const subTotal = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0),
    [lines]
  );
  const lineDiscounts = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.discountAmount) || 0), 0),
    [lines]
  );
  const extraDiscountValue = parseFloat(extraDiscount) || 0;
  const taxAmount = ((subTotal - lineDiscounts - extraDiscountValue) * (parseFloat(taxRate) || 0)) / 100;
  const netTotal = Math.max(0, subTotal - lineDiscounts - extraDiscountValue + taxAmount);
  const paidValue = parseFloat(paidAmount) || 0;
  const remaining = netTotal - paidValue;

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
      n[i] = { ...n[i], productId: p.id, barcode: p.sku, unitPrice: String(p.sellingPrice), quantity: n[i].quantity || '1' };
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

  // ── Keyboard shortcuts ──
  const createMutation = useMutation({
    mutationFn: (data: CreateSalesInvoiceRequest) => salesApi.createInvoice(data),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess(`تم إنشاء الفاتورة ${inv.invoiceNumber} كمسودة`);
      // After save: offer immediate posting (F10 again posts, Esc closes)
      setPendingSaved(inv);
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) => {
      showError('تعذر حفظ الفاتورة', err.response?.data?.detail || err.response?.data?.message);
    },
  });

  const postMutation = useMutation({
    mutationFn: salesApi.postInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess(res.message || 'تم ترحيل الفاتورة بنجاح');
      navigate(`/sales/invoices/${res.invoice.id}`, { replace: true });
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) => {
      showError('تعذر ترحيل الفاتورة', err.response?.data?.detail || err.response?.data?.message);
    },
  });

  const buildRequest = useCallback((): CreateSalesInvoiceRequest | null => {
    setError(null);
    if (!customerId) { setError('يجب اختيار العميل.'); return null; }
    if (!warehouseId) { setError('يجب اختيار المستودع.'); return null; }
    const validLines = lines
      .filter(l => l.productId && parseFloat(l.quantity) > 0)
      .map(l => ({
        productId: l.productId,
        quantity: parseFloat(l.quantity),
        unitPrice: (parseFloat(l.unitPrice) || 0) * (1 - (parseFloat(l.discountPercent) || 0) / 100),
        notes: null,
      }));
    const filledButInvalid = lines.some(l => l.productId && !(parseFloat(l.quantity) > 0));
    if (filledButInvalid) { setError('جميع البنود المحددة يجب أن تكون بكمية أكبر من الصفر.'); return null; }
    if (validLines.length === 0) { setError('يجب إدخال بند واحد على الأقل بكمية أكبر من الصفر.'); return null; }
    return {
      customerId,
      warehouseId,
      lines: validLines,
      invoiceDate,
      dueDate: dueDate || null,
      discountAmount: extraDiscountValue,
      taxRate: parseFloat(taxRate) || 0,
      notes: notes.trim() || null,
    };
  }, [lines, customerId, warehouseId, invoiceDate, dueDate, extraDiscountValue, taxRate, notes]);

  const handleSave = useCallback(() => {
    if (pendingSaved) { postMutation.mutate(pendingSaved.id); return; }
    const req = buildRequest();
    if (!req) return;
    // Client-side stock warning (the server has the final say based on AllowNegativeStock)
    const overStock = validLinesForWarning(lines, products);
    if (overStock.length > 0 && !allowNegativeStock) {
      setError(`المخزون غير كافٍ (${overStock.length} بند) — فعّل "السماح بالبيع بالسالب" من إعدادات المنظومة أو عدّل الكميات.`);
      return;
    }
    createMutation.mutate(req);
  }, [pendingSaved, buildRequest, createMutation, postMutation, lines, products, allowNegativeStock]);

  usePhoenixShortcuts({
    onNew: () => { navigate('/sales/invoices/new'); window.location.reload(); },
    onSave: handleSave,
    onClose: () => navigate('/sales/invoices'),
    onPrint: () => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ الفاتورة (F10)'),
  });

  return (
    <div className="space-y-4" dir="rtl">
      {/* ══ Top Action Bar ══ */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-lg font-bold text-foreground">فاتورة بيع جديدة</span>
            {pendingSaved && <StatusBadge status={pendingSaved.status} className="px-3 py-1 text-xs" />}
          </div>
          <ActionButton icon={<Plus size={14} />} label="جديد" shortcut="F2" variant="outline" onClick={() => { navigate('/sales/invoices/new'); window.location.reload(); }} />
          <ActionButton
            icon={pendingSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            label={pendingSaved ? 'ترحيل' : 'حفظ'} shortcut="F10"
            variant={pendingSaved ? 'success' : 'primary'}
            onClick={handleSave} loading={createMutation.isPending || postMutation.isPending}
          />
          <ActionButton icon={<Printer size={14} />} label="طباعة" shortcut="Ctrl+P" variant="outline"
            onClick={() => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ الفاتورة (F10)')} />
          <ActionButton icon={<XCircle size={14} />} label="إلغاء" variant="destructive" onClick={() => setConfirmCancel(true)} />
          <ActionButton icon={<Pause size={14} />} label="تعليق الفاتورة" variant="outline"
            onClick={() => showSuccess('تم تعليق الفاتورة مؤقتاً — استخدم F2 لبدء فاتورة جديدة')} />
          <ActionButton icon={<X size={14} />} label="إغلاق" shortcut="Esc" variant="ghost" onClick={() => navigate('/sales/invoices')} />
        </div>
      </div>

      {(error || (overStockCount(lines, products) > 0 && allowNegativeStock)) && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" /> {error}
        </div>
      )}
      {overStockCount(lines, products) > 0 && allowNegativeStock && !error && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          بعض البنود تتجاوز المخزون المتاح — سيتم البيع بالسالب (السماح مُفعّل من إعدادات المنظومة).
        </div>
      )}

      {/* ══ ترويسة الفاتورة ══ */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Payment type toggle */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">نوع الدفع *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setPaymentType(t.id)}
                  className={`h-9 px-2 text-xs font-bold rounded-md border transition-colors ${
                    paymentType === t.id
                      ? (t.id === 'Cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-primary text-primary-foreground border-primary')
                      : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            {paymentType === 'Cash' && <p className="text-[10px] text-muted-foreground mt-1">الحساب المقابل: الخزينة/الصندوق</p>}
            {(paymentType === 'Card' || paymentType === 'Mixed') && <p className="text-[10px] text-muted-foreground mt-1">قيد التطوير — يعمل حالياً كآجل</p>}
          </div>

          {/* Customer — locked for cash */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">
              الزبون {paymentType === 'Credit' && '*'}
              {customerLocked && <Lock size={11} className="inline-block mr-1 text-muted-foreground" />}
            </label>
            <div className="flex items-center gap-2">
              <select
                required={paymentType === 'Credit'} value={customerId} disabled={customerLocked}
                onChange={(e) => setCustomerId(e.target.value)}
                className={`${headerInput} flex-1 ${customerLocked ? 'opacity-70 cursor-not-allowed bg-muted/50' : ''}`}
              >
                <option value="">اختر الزبون...</option>
                {activeCustomers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
              {canAddCustomer && !customerLocked && (
                <button
                  type="button"
                  onClick={() => setQuickAddCustomerOpen(true)}
                  title="إضافة عميل جديد دون مغادرة الفاتورة"
                  aria-label="إضافة عميل جديد"
                  className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus size={15} />
                </button>
              )}
            </div>
            {paymentType === 'Cash' && !cashCustomer && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">أنشئ عميل "زبون عام" ليتم ربطه تلقائياً بالفواتير النقدية.</p>
            )}
            {paymentType === 'Credit' && (() => {
              const sel = activeCustomers.find(c => c.id === customerId);
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
            <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={headerInput}>
              <option value="">اختر المستودع...</option>
              {activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>

          {/* Invoice # (auto) */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">الرقم الآلي</label>
            <div className="h-9 px-3 flex items-center bg-muted/40 border border-border rounded-md text-sm text-muted-foreground">
              يُولَّد تلقائياً عند الحفظ
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">التاريخ *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={headerInput} />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">تاريخ الاستحقاق {paymentType === 'Credit' ? '*' : ''}</label>
            <input type="date" value={dueDate} disabled={paymentType === 'Cash'}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${headerInput} ${paymentType === 'Cash' ? 'opacity-50 cursor-not-allowed' : ''}`} />
          </div>

          {/* Notes */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">البيان / الملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري..."
              className={headerInput} />
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
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <th className="px-2 py-2.5 w-10 text-center">#</th>
                <th className="px-2 py-2.5 w-32 text-center">الباركود / الكود</th>
                <th className="px-2 py-2.5 text-center">اسم الصنف</th>
                <th className="px-2 py-2.5 w-20 text-center">الوحدة</th>
                <th className="px-2 py-2.5 w-24 text-center">الكمية</th>
                <th className="px-2 py-2.5 w-28 text-center">سعر الوحدة</th>
                <th className="px-2 py-2.5 w-20 text-center">خصم %</th>
                <th className="px-2 py-2.5 w-28 text-center">قيمة التخفيض</th>
                <th className="px-2 py-2.5 w-32 text-center">الصافي</th>
                <th className="px-2 py-2.5 w-16 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {lines.map((line, idx) => {
                const product = products.find(p => p.id === line.productId);
                const qty = parseFloat(line.quantity) || 0;
                const price = parseFloat(line.unitPrice) || 0;
                const discPct = parseFloat(line.discountPercent) || 0;
                const gross = qty * price;
                const discValue = discPct > 0 ? gross * (discPct / 100) : (parseFloat(line.discountAmount) || 0);
                const net = Math.max(0, gross - discValue);
                const isOver = product && qty > product.currentStock;
                return (
                  <tr key={line.rowId} className={`hover:bg-muted/20 ${isOver ? 'bg-amber-500/5' : ''}`}>
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
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).closest('tr')?.querySelector<HTMLInputElement>('td:nth-child(3) input')?.focus(); } }}
                        placeholder="—"
                        className={`${cellInput(false)} text-center font-mono text-xs`}
                      />
                    </td>
                    <td className="px-2 py-1.5 min-w-[220px]">
                      {product ? (
                        <SelectedChip
                          title={product.name}
                          onClick={() => updateLine(idx, { productId: '' })}
                        />
                      ) : (
                        <div ref={idx === 0 ? firstSearchRef : undefined}>
                          <SimpleCombobox
                            items={products.filter(p => p.isActive)}
                            searchText={(p) => `${p.name} ${p.sku}`}
                            primary={(p) => p.name}
                            secondary={(p) => `${p.sku} — ${p.unitOfMeasure}`}
                            trailing={(p) => (
                              <>
                                <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(p.sellingPrice)}</span>
                                <span className={`block text-[10px] tabular-nums ${p.currentStock <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>مخزون: {formatStock(p.currentStock)}</span>
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
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).closest('tr')?.querySelector<HTMLInputElement>('td:nth-child(6) input')?.focus(); } }}
                        className={`${cellInput(false)} text-center ${isOver ? 'border-amber-500 text-amber-600 dark:text-amber-400' : ''}`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.0001" value={line.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).closest('tr')?.querySelector<HTMLInputElement>('td:nth-child(7) input')?.focus(); } }}
                        className={`${cellInput(false)} text-center`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" max="100" step="0.01" value={line.discountPercent}
                        onChange={(e) => updateLine(idx, { discountPercent: e.target.value, discountAmount: '' })}
                        className={`${cellInput(false)} text-center`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.0001" value={line.discountAmount}
                        onChange={(e) => updateLine(idx, { discountAmount: e.target.value, discountPercent: '' })}
                        className={`${cellInput(false)} text-center text-destructive`}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-foreground tabular-nums whitespace-nowrap">{formatCurrency(net)}</td>
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
          <span>الضغط على اسم الصنف يعيد فتح البحث</span>
        </div>
      </div>

      {/* ══ شريط الإجماليات والسداد ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Adjustments */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">خصم إضافي (قيمة)</label>
            <input type="number" min="0" step="0.0001" value={extraDiscount} onChange={(e) => setExtraDiscount(e.target.value)} className={headerInput} />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">ضريبة (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={headerInput} />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">الملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري..." className={headerInput} />
          </div>
        </div>

        {/* Totals + settlement */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>الإجمالي قبل الخصم</span>
            <span className="font-semibold tabular-nums text-foreground">{formatCurrency(subTotal)}</span>
          </div>
          {lineDiscounts > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>تخفيضات البنود</span>
              <span className="font-semibold tabular-nums text-destructive">-{formatCurrency(lineDiscounts)}</span>
            </div>
          )}
          {extraDiscountValue > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>خصم إضافي</span>
              <span className="font-semibold tabular-nums text-destructive">-{formatCurrency(extraDiscountValue)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>مجموع القيمة المضافة</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-sm font-bold text-foreground">الصافي النهائي</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(netTotal)}</span>
          </div>

          {/* Quick cash settlement */}
          <div className="border-t border-border pt-2.5 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">المبلغ المدفوع</label>
              <div className="relative">
                <Banknote size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="number" min="0" step="0.0001" value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={paymentType === 'Cash' ? String(netTotal.toFixed(2)) : '0.00'}
                  className={`${cellInput(false)} pr-7 text-center bg-muted/30`}
                />
              </div>
              {paymentType === 'Cash' && (
                <button type="button" onClick={() => setPaidAmount(netTotal.toFixed(2))}
                  className="text-[9px] text-primary hover:underline mt-1">تعبئة الصافي كاملاً</button>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">
                {remaining > 0 && paymentType === 'Credit' ? 'المتبقي (على الحساب)' : 'الباقي'}
              </label>
              <div className={`h-8 px-2 flex items-center justify-center rounded-md border text-sm font-bold tabular-nums ${
                remaining > 0.005 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              }`}>
                {formatCurrency(Math.abs(remaining))}
              </div>
            </div>
          </div>
          {paymentType === 'Cash' && remaining > 0.005 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">⚠ فاتورة نقدية بمبلغ مدفوع أقل من الصافي — سيتم تسجيل الفرق على حساب الزبون.</p>
          )}
        </div>
      </div>

      {quickAddCustomerOpen && (
        <QuickPartyModal
          kind="customer"
          existingCodes={customers.map((c) => c.code)}
          onClose={() => setQuickAddCustomerOpen(false)}
          onCreated={(party) => setCustomerId(party.id)}
        />
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء الفاتورة الجديدة"
        message="هل تريد الخروج دون حفظ؟ سيتم تجاهل جميع البنود المدخلة."
        confirmLabel="خروج دون حفظ"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => navigate('/sales/invoices')}
      />
    </div>
  );
};

// ── helpers ──
const overStockCount = (lines: GridLine[], products: ProductDto[]) =>
  lines.filter(l => {
    const p = products.find(x => x.id === l.productId);
    return p && parseFloat(l.quantity) > p.currentStock;
  }).length;

const validLinesForWarning = (lines: GridLine[], products: ProductDto[]) =>
  overStockCount(lines, products) > 0
    ? lines.filter(l => {
        const p = products.find(x => x.id === l.productId);
        return p && parseFloat(l.quantity) > p.currentStock;
      }).map(l => products.find(x => x.id === l.productId)!.name)
    : [];

// ═══════════════════════════════════════════════════════════
//  INVOICE DETAIL — /sales/invoices/:id (read-only Phoenix view)
// ═══════════════════════════════════════════════════════════

const InvoiceDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState(false);

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => salesApi.getInvoiceById(id),
    enabled: !!id,
  });

  // Sequential navigation: walk the same list order the invoices table shows
  // (newest first) so the user can move between documents without going back.
  const { data: invoiceList = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => salesApi.getInvoices(),
  });
  const listIndex = invoiceList.findIndex((i) => i.id === id);
  const previousInvoice = listIndex > 0 ? invoiceList[listIndex - 1] : null;
  const nextInvoice = listIndex >= 0 && listIndex < invoiceList.length - 1 ? invoiceList[listIndex + 1] : null;

  const postMutation = useMutation({
    mutationFn: salesApi.postInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      showSuccess(res.message || 'تم ترحيل الفاتورة بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  const cancelMutation = useMutation({
    mutationFn: salesApi.cancelInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setCancelTarget(false);
      showSuccess(res.message || 'تم إلغاء الفاتورة');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر إلغاء الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); navigate('/sales/invoices/new'); window.location.reload(); }
      else if (e.key === 'Escape') { e.preventDefault(); navigate('/sales/invoices'); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-16 text-muted-foreground gap-3"><Loader2 size={20} className="animate-spin" /> جاري التحميل...</div>;
  }
  if (error || !inv) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm space-y-3">
        <p className="flex items-center gap-2"><AlertTriangle size={16} /> تعذر تحميل الفاتورة.</p>
        <button onClick={() => navigate('/sales/invoices')} className="px-4 h-9 text-xs font-bold bg-muted border border-border rounded-lg text-foreground hover:bg-accent">العودة للقائمة</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Action bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Previous / Next invoice — adjacent documents in the list */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!previousInvoice}
                onClick={() => previousInvoice && navigate(`/sales/invoices/${previousInvoice.id}`)}
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
                onClick={() => nextInvoice && navigate(`/sales/invoices/${nextInvoice.id}`)}
                title={nextInvoice ? `التالي — ${nextInvoice.invoiceNumber}` : 'لا توجد فاتورة تالية'}
                aria-label="الفاتورة التالية"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-muted text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            <StatusBadge status={inv.status} className="px-3 py-1 text-xs" />
          </div>
          <button type="button" onClick={() => { navigate('/sales/invoices/new'); window.location.reload(); }}
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
          <button type="button" onClick={() => navigate('/sales/invoices')}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent transition-all">
            <X size={14} /> إغلاق <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Esc</kbd>
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'الزبون', value: `${inv.customerCode} — ${inv.customerName}` },
          { label: 'المستودع', value: inv.warehouseName },
          { label: 'التاريخ', value: formatDate(inv.invoiceDate) },
          { label: 'الاستحقاق', value: inv.dueDate ? formatDate(inv.dueDate) : '—' },
          { label: 'القيود', value: inv.notes || '—' },
        ].map(f => (
          <div key={f.label}>
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">{f.label}</p>
            <p className="text-sm font-semibold text-foreground truncate">{f.value}</p>
          </div>
        ))}
      </div>

      {/* Lines */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5 text-center">الصنف</th>
                <th className="px-3 py-2.5 text-center">الكمية</th>
                <th className="px-3 py-2.5 text-center">السعر</th>
                <th className="px-3 py-2.5 text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {inv.lines.map((l, i) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5"><span className="text-[10px] text-muted-foreground mr-2 font-mono">{l.productSKU}</span><span className="font-semibold text-foreground">{l.productName}</span></td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatStock(l.quantity)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatCurrency(l.unitPrice)}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-foreground tabular-nums">{formatCurrency(l.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-start">
        <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-xs space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span className="tabular-nums text-foreground font-semibold">{formatCurrency(inv.subTotal)}</span></div>
          {inv.discountAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>الخصم</span><span className="tabular-nums text-destructive font-semibold">-{formatCurrency(inv.discountAmount)}</span></div>}
          {inv.taxAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>الضريبة</span><span className="tabular-nums text-foreground font-semibold">{formatCurrency(inv.taxAmount)}</span></div>}
          <div className="flex justify-between border-t border-border pt-2"><span className="text-sm font-bold text-foreground">الإجمالي</span><span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(inv.totalAmount)}</span></div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelTarget}
        title={`تأكيد إلغاء ${inv.invoiceNumber}`}
        message="هل تريد إلغاء هذه الفاتورة؟ سيؤدي هذا إلى عكس جميع القيود المحاسبية المرتبطة بها."
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(inv.id)}
        onCancel={() => setCancelTarget(false)}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  ROUTE ENTRY — dispatches editor vs detail by URL param
// ═══════════════════════════════════════════════════════════

export const SalesInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return id ? <InvoiceDetail /> : <InvoiceEditor />;
};
