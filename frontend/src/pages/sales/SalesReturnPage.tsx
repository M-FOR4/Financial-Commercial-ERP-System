import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  salesApi, type SalesReturnDto, type CreateSalesReturnRequest, type SalesInvoiceDto,
} from '../../services/salesApi';
import {
  Plus, Save, Printer, XCircle, X, Loader2, AlertTriangle, Search, CheckCircle2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { ActionButton } from '../../components/ActionButton';
import { phoenixHeaderInput } from '../../components/phoenix/tokens';
import { usePhoenixShortcuts } from '../../components/phoenix/usePhoenixShortcuts';
import { showSuccess, showError } from '../../lib/toast';
import { formatCurrency, formatStock, formatDate } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  SALES RETURN PAGE — Phoenix style
//  /sales/returns/new (editor) + /sales/returns/:id
//  D-029: restock cost is locked to the original sale's cost.
// ═══════════════════════════════════════════════════════════

interface ReturnLine {
  originalInvoiceLineId: string;
  quantity: string;
}

// ── EDITOR ──

const ReturnEditor: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDto | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingSaved, setPendingSaved] = useState<SalesReturnDto | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (invNumber: string) => {
      const invoices = await salesApi.getInvoices({ search: invNumber });
      return invoices.find(i => i.invoiceNumber === invNumber && i.status === 'Posted');
    },
    onSuccess: (invoice) => {
      if (invoice) {
        setSelectedInvoice(invoice);
        setReturnLines(invoice.lines.map(l => ({ originalInvoiceLineId: l.id, quantity: '' })));
        setError(null);
      } else {
        setError('لم يتم العثور على فاتورة مرحلة بذلك الرقم.');
        setSelectedInvoice(null);
      }
    },
    onError: () => showError('فشل البحث عن الفاتورة'),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSalesReturnRequest) => salesApi.createReturn(data),
    onSuccess: (ret) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      showSuccess(`تم إنشاء المرتجع ${ret.returnNumber} كمسودة`);
      setPendingSaved(ret);
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر حفظ المرتجع', err.response?.data?.detail || err.response?.data?.message),
  });

  const postMutation = useMutation({
    mutationFn: salesApi.postReturn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      showSuccess(res.message || 'تم ترحيل المرتجع بنجاح');
      navigate(`/sales/returns/${res.salesReturn.id}`, { replace: true });
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل المرتجع', err.response?.data?.detail || err.response?.data?.message),
  });

  const totalAmount = useMemo(
    () => selectedInvoice
      ? returnLines.reduce((s, rl) => {
          const orig = selectedInvoice.lines.find(l => l.id === rl.originalInvoiceLineId);
          return s + (orig ? (parseFloat(rl.quantity) || 0) * orig.unitPrice : 0);
        }, 0)
      : 0,
    [selectedInvoice, returnLines]
  );

  const updateReturnQty = (lineId: string, qty: string) => {
    setReturnLines(prev => prev.map(l => l.originalInvoiceLineId === lineId ? { ...l, quantity: qty } : l));
  };

  const handleSave = () => {
    if (pendingSaved) { postMutation.mutate(pendingSaved.id); return; }
    setError(null);
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

  usePhoenixShortcuts({
    onNew: () => { navigate('/sales/returns/new'); window.location.reload(); },
    onSave: handleSave,
    onClose: () => navigate('/sales/returns'),
    onPrint: () => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ المرتجع (F10)'),
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-lg font-bold text-foreground">مرتجع بيع جديد</span>
            {pendingSaved && <StatusBadge status={pendingSaved.status} className="px-3 py-1 text-xs" />}
          </div>
          <ActionButton icon={<Plus size={14} />} label="جديد" shortcut="F2" onClick={() => { navigate('/sales/returns/new'); window.location.reload(); }} />
          <ActionButton
            icon={pendingSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            label={pendingSaved ? 'ترحيل' : 'حفظ'} shortcut="F10"
            variant={pendingSaved ? 'success' : 'primary'}
            onClick={handleSave} loading={createMutation.isPending || postMutation.isPending}
          />
          <ActionButton icon={<Printer size={14} />} label="طباعة" shortcut="Ctrl+P"
            onClick={() => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ المرتجع (F10)')} />
          <ActionButton icon={<XCircle size={14} />} label="إلغاء" variant="destructive" onClick={() => setConfirmCancel(true)} />
          <ActionButton icon={<X size={14} />} label="إغلاق" shortcut="Esc" variant="ghost" onClick={() => navigate('/sales/returns')} />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {/* ══ ترويسة المرتجع ══ */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">الرقم الآلي</label>
            <div className="h-9 px-3 flex items-center bg-muted/40 border border-border rounded-md text-sm text-muted-foreground">
              يُولَّد تلقائياً عند الحفظ
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">التاريخ</label>
            <div className="h-9 px-3 flex items-center bg-muted/40 border border-border rounded-md text-sm text-foreground">
              {formatDate(new Date())}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري..." className={phoenixHeaderInput} />
          </div>
        </div>
      </div>

      {/* ══ فاتورة الأصل ══ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">الفاتورة الأصلية</h3>
        </div>
        <div className="p-4 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text" value={invoiceNumber} disabled={!!pendingSaved}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchMutation.mutate(invoiceNumber.trim()); } }}
              placeholder="رقم الفاتورة الأصلية — مثال: INV-202608-0001"
              className={`${phoenixHeaderInput} pr-8`}
            />
          </div>
          <button type="button" disabled={searchMutation.isPending || !invoiceNumber.trim() || !!pendingSaved}
            onClick={() => searchMutation.mutate(invoiceNumber.trim())}
            className="h-9 px-4 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {searchMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} بحث
          </button>
        </div>
        {selectedInvoice && (
          <div className="px-4 pb-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedInvoice.invoiceNumber}</span> — {selectedInvoice.customerName} — {formatDate(selectedInvoice.invoiceDate)}
          </div>
        )}
      </div>

      {/* ══ بنود المرتجع ══ */}
      {selectedInvoice && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">بنود المرتجع</h3>
            <span className="text-[10px] text-muted-foreground">D-029: التكلفة مقفلة على تكلفة البيع الأصلية</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 text-center">#</th>
                  <th className="px-3 py-2.5 text-center">الصنف</th>
                  <th className="px-3 py-2.5 text-center">الكمية الأصلية</th>
                  <th className="px-3 py-2.5 text-center">سعر البيع</th>
                  <th className="px-3 py-2.5 text-center">تكلفة البيع</th>
                  <th className="px-3 py-2.5 w-32 text-center">كمية المرتجع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {returnLines.map((rl, i) => {
                  const origLine = selectedInvoice.lines.find(l => l.id === rl.originalInvoiceLineId);
                  if (!origLine) return null;
                  return (
                    <tr key={rl.originalInvoiceLineId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2"><span className="text-[10px] text-muted-foreground mr-2 font-mono">{origLine.productSKU}</span><span className="font-semibold text-foreground">{origLine.productName}</span></td>
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{formatStock(origLine.quantity)}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{formatCurrency(origLine.unitPrice)}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-amber-500">{formatCurrency(origLine.unitCostAtSale)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" step="0.0001" max={origLine.quantity} value={rl.quantity}
                          onChange={(e) => updateReturnQty(rl.originalInvoiceLineId, e.target.value)}
                          placeholder="0"
                          className="w-full h-8 px-2 bg-transparent border border-border rounded-md text-sm text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-bold text-sm">
                  <td className="px-3 py-3 text-center text-muted-foreground">Σ</td>
                  <td className="px-3 py-3 text-muted-foreground">إجمالي قيمة المرتجع</td>
                  <td />
                  <td />
                  <td className="px-3 py-3 text-center text-amber-500 tabular-nums">{formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء المرتجع الجديد"
        message="هل تريد الخروج دون حفظ؟ سيتم تجاهل جميع بنود المرتجع المدخلة."
        confirmLabel="خروج دون حفظ"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => navigate('/sales/returns')}
      />
    </div>
  );
};

// ── DETAIL ──
const ReturnDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ret, isLoading, error } = useQuery({
    queryKey: ['salesReturn', id],
    queryFn: () => salesApi.getReturnById(id),
    enabled: !!id,
  });

  const postMutation = useMutation({
    mutationFn: salesApi.postReturn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['salesReturn', id] });
      showSuccess(res.message || 'تم ترحيل المرتجع بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل المرتجع', err.response?.data?.detail || err.response?.data?.message),
  });

  usePhoenixShortcuts({
    onNew: () => { navigate('/sales/returns/new'); window.location.reload(); },
    onClose: () => navigate('/sales/returns'),
    onPrint: () => window.print(),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-16 text-muted-foreground gap-3"><Loader2 size={20} className="animate-spin" /> جاري التحميل...</div>;
  }
  if (error || !ret) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm space-y-3">
        <p className="flex items-center gap-2"><AlertTriangle size={16} /> تعذر تحميل المرتجع.</p>
        <button onClick={() => navigate('/sales/returns')} className="px-4 h-9 text-xs font-bold bg-muted border border-border rounded-lg text-foreground hover:bg-accent">العودة للقائمة</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2.5 ml-auto">
            <span className="text-lg font-bold text-foreground">{ret.returnNumber}</span>
            <StatusBadge status={ret.status} className="px-3 py-1 text-xs" />
          </div>
          <button type="button" onClick={() => { navigate('/sales/returns/new'); window.location.reload(); }}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-muted text-foreground hover:bg-accent border border-border transition-all active:scale-[0.98]">
            <Plus size={14} /> جديد <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">F2</kbd>
          </button>
          {ret.status === 'Draft' && (
            <button type="button" onClick={() => postMutation.mutate(ret.id)} disabled={postMutation.isPending}
              className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50">
              {postMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} ترحيل <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 rounded">F10</kbd>
            </button>
          )}
          <button type="button" onClick={() => window.print()}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-muted text-foreground hover:bg-accent border border-border transition-all active:scale-[0.98]">
            <Printer size={14} /> طباعة <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Ctrl+P</kbd>
          </button>
          <button type="button" onClick={() => navigate('/sales/returns')}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent transition-all">
            <X size={14} /> إغلاق <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Esc</kbd>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'العميل', value: ret.customerName },
          { label: 'المستودع', value: ret.warehouseName },
          { label: 'التاريخ', value: formatDate(ret.returnDate) },
          { label: 'الفاتورة الأصلية', value: ret.originalInvoiceNumber },
        ].map(f => (
          <div key={f.label}>
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">{f.label}</p>
            <p className="text-sm font-semibold text-foreground truncate">{f.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5 text-center">الصنف</th>
                <th className="px-3 py-2.5 text-center">الكمية</th>
                <th className="px-3 py-2.5 text-center">تكلفة إعادة التخزين</th>
                <th className="px-3 py-2.5 text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {ret.lines.map((l, i) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5"><span className="text-[10px] text-muted-foreground mr-2 font-mono">{l.productSKU}</span><span className="font-semibold text-foreground">{l.productName}</span></td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatStock(l.quantity)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-amber-500">{formatCurrency(l.restockUnitCost)}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-foreground tabular-nums">{formatCurrency(l.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-bold text-sm">
                <td className="px-3 py-3 text-center text-muted-foreground">Σ</td>
                <td className="px-3 py-3 text-muted-foreground">الإجمالي</td>
                <td />
                <td />
                <td className="px-3 py-3 text-center text-amber-500 tabular-nums">{formatCurrency(ret.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-700 dark:text-amber-400 max-w-2xl">
        <span className="font-semibold">D-029:</span> تكلفة إعادة التخزين مقفلة على تكلفة بند الفاتورة الأصلية في وقت البيع، لضمان توحيد تكلفة المرتجعات مع تكلفة البيع الأصلية.
      </div>
    </div>
  );
};

// ── ROUTE ENTRY ──

export const SalesReturnPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return id ? <ReturnDetail /> : <ReturnEditor />;
};
