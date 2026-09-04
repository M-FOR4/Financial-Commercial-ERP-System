import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  salesApi, type SalesInvoiceDto, type JournalEntryStatus, type CreateSalesInvoiceRequest,
  type CustomerDto,
} from '../../services/salesApi';
import { inventoryApi, type ProductDto, type WarehouseDto } from '../../services/inventoryApi';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
const formatStock = (n: number) => new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const formatDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

const statusConfig: Record<JournalEntryStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'مرحل' },
  Cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'ملغي' },
};

// ═══════════════════════════════════════
//  INVOICE BUILDER MODAL
// ═══════════════════════════════════════

interface InvoiceBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerDto[];
  warehouses: WarehouseDto[];
  products: ProductDto[];
}

interface FormLine { productId: string; quantity: string; unitPrice: string; notes: string; }

const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({ isOpen, onClose, customers, warehouses, products }) => {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Credit');
  const [discountAmount, setDiscountAmount] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<FormLine[]>([{ productId: '', quantity: '', unitPrice: '', notes: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const leafProducts = products.filter(p => p.isActive);
  const subTotal = lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const taxAmount = subTotal * ((parseFloat(taxRate) || 0) / 100);
  const totalAmount = subTotal + taxAmount - (parseFloat(discountAmount) || 0);

  const selectedCustomer = customers.find(c => c.id === customerId);

  const updateLine = (i: number, field: keyof FormLine, value: string) => {
    setLines(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n; });
  };

  const addLine = () => setLines(prev => [...prev, { productId: '', quantity: '', unitPrice: '', notes: '' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i)); };

  const handleProductSelect = (i: number, productId: string) => {
    updateLine(i, 'productId', productId);
    const product = leafProducts.find(p => p.id === productId);
    if (product) {
      updateLine(i, 'unitPrice', String(product.sellingPrice));
      if (product.currentStock <= 0) {
        setStockWarnings(prev => [...new Set([...prev, `الصنف ${product.name} مخزوف (المخزون: ${product.currentStock})`])]);
      }
    }
  };

  const handleQuantityChange = (i: number, value: string) => {
    updateLine(i, 'quantity', value);
    const line = lines[i];
    const product = leafProducts.find(p => p.id === line.productId);
    if (product && parseFloat(value) > product.currentStock) {
      setStockWarnings(prev => [...new Set([...prev, `الكمية المطلوبة لـ ${product.name} (${value}) تتجاوز المخزون المتاح (${product.currentStock})`])]);
    } else if (product) {
      setStockWarnings(prev => prev.filter(w => !w.includes(product.name)));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateSalesInvoiceRequest) => salesApi.createInvoice(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); resetForm(); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message || 'فشل في إنشاء الفاتورة'),
  });

  const resetForm = () => {
    setCustomerId(''); setWarehouseId(''); setPaymentType('Credit'); setDiscountAmount(''); setTaxRate(''); setNotes('');
    setLines([{ productId: '', quantity: '', unitPrice: '', notes: '' }]); setError(null); setStockWarnings([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setStockWarnings([]);
    if (!customerId) { setError('يجب اختيار العميل.'); return; }
    if (!warehouseId) { setError('يجب اختيار المستودع.'); return; }
    const validLines = lines
      .filter(l => l.productId && parseFloat(l.quantity) > 0)
      .map(l => ({
        productId: l.productId, quantity: parseFloat(l.quantity),
        unitPrice: parseFloat(l.unitPrice) || 0, notes: l.notes.trim() || null,
      }));
    if (validLines.length === 0) { setError('يجب إدخال بند واحد على الأقل بكمية أكبر من الصفر.'); return; }
    for (const l of lines) {
      if (l.productId && parseFloat(l.quantity) <= 0) {
        setError('جميع البنود المحددة يجب أن تكون بكمية أكبر من الصفر.'); return;
      }
    }
    const warnings: string[] = [];
    for (const vl of validLines) {
      const product = leafProducts.find(p => p.id === vl.productId);
      if (product && vl.quantity > product.currentStock) {
        warnings.push(`${product.name}: الكمية (${vl.quantity}) تتجاوز المخزون (${product.currentStock})`);
      }
    }
    if (warnings.length > 0) {
      setStockWarnings(warnings);
      setError('يوجد تحذيرات مخزون — يرجى مراجعة الكمية قبل الإنشاء.');
      return;
    }
    createMutation.mutate({
      customerId, warehouseId, lines: validLines,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: paymentType === 'Credit' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
      discountAmount: parseFloat(discountAmount) || 0,
      taxRate: parseFloat(taxRate) || 0,
      notes: notes.trim() || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold text-foreground">فاتورة بيع جديدة</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}
          {stockWarnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm space-y-1">
              <p className="font-semibold">⚠️ تحذيرات المخزون:</p>
              {stockWarnings.map((w, i) => <p key={i}>• {w}</p>)}
            </div>
          )}

          {/* Row 1: Customer, Warehouse, Payment Type */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">العميل *</label>
              <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">اختر العميل...</option>
                {customers.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
              {selectedCustomer && (
                <p className="text-[10px] text-muted-foreground mt-1">الحساب المحاسبي: <span className="font-mono text-foreground">{selectedCustomer.code}</span> — الرصيد: <span className={`font-mono ${selectedCustomer.balance > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{formatCurrency(selectedCustomer.balance)}</span></p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المستودع *</label>
              <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">اختر المستودع...</option>
                {warehouses.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">نوع الدفع *</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPaymentType('Credit')}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${paymentType === 'Credit' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                  آجل (Credit)
                </button>
                <button type="button" onClick={() => setPaymentType('Cash')}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${paymentType === 'Cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                  نقدي (Cash)
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {paymentType === 'Cash' ? 'الحساب المقابل = الخزينة/الصندوق' : `الحساب المقابل = حساب العميل (${selectedCustomer?.code || '—'})`}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">بنود الفاتورة</h4>
              <button type="button" onClick={addLine} className="px-3 py-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 border border-primary/30 rounded-lg">+ إضافة بند</button>
            </div>
            <div className="grid grid-cols-[1fr_80px_100px_100px_1fr_40px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              <span>الصنف</span><span className="text-right">الكمية</span><span className="text-right">السعر</span><span className="text-right">الإجمالي</span><span>ملاحظات</span><span />
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                const product = leafProducts.find(p => p.id === line.productId);
                const isOverStock = product && parseFloat(line.quantity) > product.currentStock;
                return (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_1fr_40px] gap-2">
                    <select required value={line.productId} onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm truncate focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">اختر...</option>
                      {leafProducts.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (المخزون: {formatStock(p.currentStock)})</option>)}
                    </select>
                    <div className="relative">
                      <input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        className={`w-full px-3 py-2 bg-input border rounded-lg text-foreground text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-ring ${isOverStock ? 'border-amber-500 ring-amber-500/30' : 'border-border'}`} />
                      {isOverStock && <span className="absolute -top-1 -right-1 text-amber-500 text-xs">⚠</span>}
                    </div>
                    <input type="number" min="0" step="0.0001" value={line.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                      className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                    <div className="px-3 py-2 text-sm font-mono text-right text-foreground">{formatCurrency(lineTotal)}</div>
                    <input type="text" value={line.notes} onChange={(e) => updateLine(idx, 'notes', e.target.value)} placeholder="اختياري..."
                      className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <button type="button" onClick={() => removeLine(idx)} disabled={lines.length <= 1}
                      className="w-9 h-9 flex items-center justify-center text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg disabled:opacity-30">✕</button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discount, Tax, Notes, Total */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الخصم (د.ل)</label>
              <input type="number" min="0" step="0.0001" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ضريبة (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري..."
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex flex-col justify-end">
              <div className="text-right space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span className="font-mono">{formatCurrency(subTotal)}</span></div>
                {taxAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>الضريبة</span><span className="font-mono">{formatCurrency(taxAmount)}</span></div>}
                {parseFloat(discountAmount) > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>الخصم</span><span className="font-mono text-destructive">-{formatCurrency(parseFloat(discountAmount))}</span></div>}
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1"><span className="text-foreground">الإجمالي</span><span className="font-mono text-emerald-500">{formatCurrency(totalAmount)}</span></div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => { resetForm(); onClose(); }}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إلغاء</button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50">
              {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
//  MAIN INVOICES PAGE
// ═══════════════════════════════════════

export const Invoices: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDto | null>(null);

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', statusFilter, searchQuery],
    queryFn: () => salesApi.getInvoices({ status: statusFilter as JournalEntryStatus || undefined, search: searchQuery || undefined }),
  });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => salesApi.getCustomers() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });

  const queryClient = useQueryClient();
  const postMutation = useMutation({
    mutationFn: salesApi.postInvoice,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setSelectedInvoice(null); },
  });
  const cancelMutation = useMutation({
    mutationFn: salesApi.cancelInvoice,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setSelectedInvoice(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">فواتير البيع</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة فواتير البيع — {invoices.length} فاتورة</p>
        </div>
        <button onClick={() => setShowBuilder(true)}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2">
          <span className="text-lg leading-none">+</span> فاتورة جديدة
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث في الفواتير..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
        <div className="flex gap-2">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${statusFilter === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>الكل</button>
          {(['Draft', 'Posted', 'Cancelled'] as JournalEntryStatus[]).map(s => {
            const c = statusConfig[s];
            return <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${statusFilter === s ? `${c.bg} ${c.text} ${c.border}` : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>{c.label}</button>;
          })}
        </div>
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل في تحميل الفواتير.</div>}
      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}

      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-center">رقم الفاتورة</th>
                  <th className="px-5 py-3 text-center">التاريخ</th>
                  <th className="px-5 py-3 text-center">العميل</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                  <th className="px-5 py-3 text-center">الإجمالي</th>
                  <th className="px-5 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">لم يتم العثور على فواتير.</td></tr>
                ) : invoices.map(inv => {
                  const sc = statusConfig[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedInvoice(inv)}>
                      <td className="px-5 py-3 text-center font-mono font-semibold text-primary">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3 text-center font-mono text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-5 py-3 text-center text-foreground">{inv.customerCode} — {inv.customerName}</td>
                      <td className="px-5 py-3 text-center"><span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>{inv.statusName}</span></td>
                      <td className="px-5 py-3 text-center font-mono font-semibold text-emerald-500">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {inv.status === 'Draft' && (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => postMutation.mutate(inv.id)}
                              className="px-2 py-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-colors">ترحيل</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedInvoice.invoiceNumber}</h3>
                <span className="text-xs text-muted-foreground">{formatDate(selectedInvoice.invoiceDate)} — {selectedInvoice.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusConfig[selectedInvoice.status].bg} ${statusConfig[selectedInvoice.status].text} ${statusConfig[selectedInvoice.status].border}`}>
                  {selectedInvoice.statusName}
                </span>
                <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-center">الصنف</th><th className="px-4 py-2.5 text-center">الكمية</th><th className="px-4 py-2.5 text-center">السعر</th><th className="px-4 py-2.5 text-center">الإجمالي</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/50">
                    {selectedInvoice.lines.map(l => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-center"><span className="font-mono text-xs text-muted-foreground mr-1">{l.productSKU}</span><span className="text-foreground">{l.productName}</span></td>
                        <td className="px-4 py-2.5 text-center font-mono">{formatStock(l.quantity)}</td>
                        <td className="px-4 py-2.5 text-center font-mono">{formatCurrency(l.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-center font-mono font-semibold text-foreground">{formatCurrency(l.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-muted/40 font-bold">
                    <td className="px-4 py-2.5 text-center text-muted-foreground" colSpan={3}>الإجمالي</td>
                    <td className="px-4 py-2.5 text-center font-mono text-emerald-500">{formatCurrency(selectedInvoice.totalAmount)}</td>
                  </tr></tfoot>
                </table>
              </div>
              {selectedInvoice.status === 'Draft' && (
                <div className="flex gap-3">
                  <button onClick={() => postMutation.mutate(selectedInvoice.id)} disabled={postMutation.isPending}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50">
                    {postMutation.isPending ? 'جاري الترحيل...' : '✓ ترحيل الفاتورة'}
                  </button>
                  <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إغلاق</button>
                </div>
              )}
              {selectedInvoice.status === 'Posted' && (
                <button onClick={() => { if (window.confirm(`هل تريد إلغاء ${selectedInvoice.invoiceNumber}؟ سيؤدي هذا إلى عكس جميع القيود.`)) cancelMutation.mutate(selectedInvoice.id); }}
                  disabled={cancelMutation.isPending}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-destructive hover:bg-destructive/90 rounded-lg transition-colors disabled:opacity-50">
                  {cancelMutation.isPending ? 'جاري الإلغاء...' : '✕ إلغاء الفاتورة'}
                </button>
              )}
              {(selectedInvoice.status === 'Cancelled' || selectedInvoice.status === 'Posted') && (
                <button onClick={() => setSelectedInvoice(null)} className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إغلاق</button>
              )}
            </div>
          </div>
        </div>
      )}

      <InvoiceBuilder isOpen={showBuilder} onClose={() => setShowBuilder(false)} customers={customers} warehouses={warehouses} products={products} />
    </div>
  );
};
