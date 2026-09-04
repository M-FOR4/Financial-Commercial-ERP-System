import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, type SalesReturnDto, type JournalEntryStatus, type CreateSalesReturnRequest, type SalesInvoiceDto } from '../../services/salesApi';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
const formatStock = (n: number) => new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const formatDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

const statusConfig: Record<JournalEntryStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'مرحل' },
  Cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'ملغي' },
};

// ── Return Builder Modal ──

interface ReturnBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReturnBuilder: React.FC<ReturnBuilderProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDto | null>(null);
  const [returnLines, setReturnLines] = useState<{ originalInvoiceLineId: string; quantity: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (invNumber: string) => {
      const invoices = await salesApi.getInvoices({ search: invNumber });
      return invoices.find(i => i.invoiceNumber === invNumber && i.status === 'Posted');
    },
    onSuccess: (invoice) => {
      setSearching(false);
      if (invoice) {
        setSelectedInvoice(invoice);
        setReturnLines(invoice.lines.map(l => ({ originalInvoiceLineId: l.id, quantity: '' })));
        setError(null);
      } else {
        setError('لم يتم العثور على فاتورة مرحلة بذلك الرقم.');
        setSelectedInvoice(null);
      }
    },
    onError: () => { setSearching(false); setError('فشل البحث عن الفاتورة.'); },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSalesReturnRequest) => salesApi.createReturn(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); resetForm(); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message || 'فشل في إنشاء المرتجع'),
  });

  const resetForm = () => {
    setInvoiceNumber(''); setSelectedInvoice(null); setReturnLines([]); setNotes(''); setError(null);
  };

  const handleSearch = () => {
    if (!invoiceNumber.trim()) return;
    setSearching(true);
    searchMutation.mutate(invoiceNumber.trim());
  };

  const updateReturnQty = (lineId: string, qty: string) => {
    setReturnLines(prev => prev.map(l => l.originalInvoiceLineId === lineId ? { ...l, quantity: qty } : l));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!selectedInvoice) { setError('يرجى البحث واختيار فاتورة أولاً.'); return; }
    const validLines = returnLines.filter(l => parseFloat(l.quantity) > 0);
    if (validLines.length === 0) { setError('يجب إدخال بند مرتجع واحد على الأقل بكمية > 0.'); return; }

    for (const rl of validLines) {
      const origLine = selectedInvoice.lines.find(l => l.id === rl.originalInvoiceLineId);
      if (origLine && parseFloat(rl.quantity) > origLine.quantity) {
        setError(`كمية المرتجع لـ ${origLine.productName} لا يمكن أن تتجاوز الكمية الأصلية (${origLine.quantity}).`);
        return;
      }
    }

    createMutation.mutate({
      originalInvoiceId: selectedInvoice.id,
      notes: notes.trim() || null,
      lines: validLines.map(l => ({ originalInvoiceLineId: l.originalInvoiceLineId, quantity: parseFloat(l.quantity), notes: null })),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold text-foreground">مرتجع بيع جديد</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}

          {/* Invoice Search */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">رقم الفاتورة الأصلية</label>
            <div className="flex gap-2">
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="مثال: INV-202608-0001"
                className="flex-1 px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={handleSearch} disabled={searching || !invoiceNumber.trim()}
                className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50">
                {searching ? 'جاري البحث...' : 'بحث'}
              </button>
            </div>
          </div>

          {/* Invoice Lines for Return */}
          {selectedInvoice && (
            <div>
              <div className="bg-muted/40 rounded-lg p-3 mb-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedInvoice.invoiceNumber}</span> — {selectedInvoice.customerName} — {formatDate(selectedInvoice.invoiceDate)}
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-3">بنود المرتجع (D-029: التكلفة مقفلة على تكلفة البيع الأصلية)</h4>
              <div className="space-y-2">
                {returnLines.map(rl => {
                  const origLine = selectedInvoice.lines.find(l => l.id === rl.originalInvoiceLineId);
                  if (!origLine) return null;
                  return (
                    <div key={rl.originalInvoiceLineId} className="grid grid-cols-[1fr_120px_100px_120px] gap-2 items-center bg-muted/30 rounded-lg p-3">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground mr-1">{origLine.productSKU}</span>
                        <span className="text-sm text-foreground">{origLine.productName}</span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">الكمية الأصلية: {formatStock(origLine.quantity)} @ {formatCurrency(origLine.unitPrice)}</span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">تكلفة البيع: <span className="font-mono text-amber-500">{formatCurrency(origLine.unitCostAtSale)}</span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">حد المرتجع الأقصى: <span className="font-mono text-foreground">{formatStock(origLine.quantity)}</span>
                      </div>
                      <input type="number" min="0.0001" step="0.0001" max={origLine.quantity} value={rl.quantity}
                        onChange={(e) => updateReturnQty(rl.originalInvoiceLineId, e.target.value)}
                        placeholder="كمية المرتجع"
                        className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..."
              className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => { resetForm(); onClose(); }}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إلغاء</button>
            <button type="submit" disabled={!selectedInvoice || createMutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50">
              {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المرتجع'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Returns Page ──

export const Returns: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturnDto | null>(null);
  const queryClient = useQueryClient();

  const { data: returns = [], isLoading, error } = useQuery({
    queryKey: ['returns', statusFilter],
    queryFn: () => salesApi.getReturns({ status: statusFilter as JournalEntryStatus || undefined }),
  });

  const postMutation = useMutation({
    mutationFn: salesApi.postReturn,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); setSelectedReturn(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرتجعات البيع</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة مرتجعات البيع — Decision D-029</p>
        </div>
        <button onClick={() => setShowBuilder(true)}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2">
          <span className="text-lg leading-none">+</span> مرتجع جديد
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
        <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${statusFilter === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>الكل</button>
        {(['Draft', 'Posted', 'Cancelled'] as JournalEntryStatus[]).map(s => {
          const c = statusConfig[s];
          return <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${statusFilter === s ? `${c.bg} ${c.text} ${c.border}` : 'bg-muted text-muted-foreground border-border'}`}>{c.label}</button>;
        })}
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل في تحميل المرتجعات.</div>}
      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}

      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-center">رقم المرتجع</th>
                  <th className="px-5 py-3 text-center">التاريخ</th>
                  <th className="px-5 py-3 text-center">الفاتورة الأصلية</th>
                  <th className="px-5 py-3 text-center">العميل</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                  <th className="px-5 py-3 text-center">الإجمالي</th>
                  <th className="px-5 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {returns.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لم يتم العثور على مرتجعات.</td></tr>
                ) : returns.map(ret => {
                  const sc = statusConfig[ret.status];
                  return (
                    <tr key={ret.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedReturn(ret)}>
                      <td className="px-5 py-3 text-center font-mono font-semibold text-primary">{ret.returnNumber}</td>
                      <td className="px-5 py-3 text-center font-mono text-muted-foreground">{formatDate(ret.returnDate)}</td>
                      <td className="px-5 py-3 text-center font-mono text-muted-foreground">{ret.originalInvoiceNumber}</td>
                      <td className="px-5 py-3 text-center text-foreground">{ret.customerName}</td>
                      <td className="px-5 py-3 text-center"><span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>{ret.statusName}</span></td>
                      <td className="px-5 py-3 text-center font-mono font-semibold text-amber-500">{formatCurrency(ret.totalAmount)}</td>
                      <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {ret.status === 'Draft' && (
                          <button onClick={() => postMutation.mutate(ret.id)}
                            className="px-2 py-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-colors">ترحيل</button>
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
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedReturn(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedReturn.returnNumber}</h3>
                <span className="text-xs text-muted-foreground">الأصلي: {selectedReturn.originalInvoiceNumber} — {selectedReturn.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusConfig[selectedReturn.status].bg} ${statusConfig[selectedReturn.status].text} ${statusConfig[selectedReturn.status].border}`}>
                  {selectedReturn.statusName}
                </span>
                <button onClick={() => setSelectedReturn(null)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-center">الصنف</th><th className="px-4 py-2.5 text-center">الكمية</th><th className="px-4 py-2.5 text-center">تكلفة إعادة التخزين</th><th className="px-4 py-2.5 text-center">الإجمالي</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/50">
                    {selectedReturn.lines.map(l => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-center"><span className="font-mono text-xs text-muted-foreground mr-1">{l.productSKU}</span><span className="text-foreground">{l.productName}</span></td>
                        <td className="px-4 py-2.5 text-center font-mono">{formatStock(l.quantity)}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-amber-500">{formatCurrency(l.restockUnitCost)}</td>
                        <td className="px-4 py-2.5 text-center font-mono font-semibold text-foreground">{formatCurrency(l.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-muted/40 font-bold">
                    <td className="px-4 py-2.5 text-center text-muted-foreground" colSpan={3}>الإجمالي</td>
                    <td className="px-4 py-2.5 text-center font-mono text-amber-500">{formatCurrency(selectedReturn.totalAmount)}</td>
                  </tr></tfoot>
                </table>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400">
                <span className="font-semibold">D-029:</span> تكلفة إعادة التخزين مقفلة على تكلفة بند الفاتورة الأصلية في وقت البيع. هذا يضمن توحيد تكلفة المرتجعات مع تكلفة البيع الأصلية.
              </div>
              {selectedReturn.status === 'Draft' && (
                <div className="flex gap-3">
                  <button onClick={() => postMutation.mutate(selectedReturn.id)} disabled={postMutation.isPending}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50">
                    {postMutation.isPending ? 'جاري الترحيل...' : '✓ ترحيل المرتجع'}
                  </button>
                  <button onClick={() => setSelectedReturn(null)} className="px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إغلاق</button>
                </div>
              )}
              {selectedReturn.status !== 'Draft' && (
                <button onClick={() => setSelectedReturn(null)} className="w-full px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إغلاق</button>
              )}
            </div>
          </div>
        </div>
      )}

      <ReturnBuilder isOpen={showBuilder} onClose={() => setShowBuilder(false)} />
    </div>
  );
};
