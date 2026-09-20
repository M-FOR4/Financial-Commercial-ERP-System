import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  purchasesApi, type PurchaseReturnDto, type CreatePurchaseReturnRequest, type PurchaseInvoiceDto,
} from '../../services/purchasesApi';
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
//  PURCHASE RETURN PAGE — Phoenix style
//  /purchases/returns/new (editor) + /purchases/returns/:id
// ═══════════════════════════════════════════════════════════

interface ReturnLine {
  originalInvoiceLineId: string;
  quantity: string;
}

// ── EDITOR ──

const ReturnEditor: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [invNum, setInvNum] = useState('');
  const [selectedInv, setSelectedInv] = useState<PurchaseInvoiceDto | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingSaved, setPendingSaved] = useState<PurchaseReturnDto | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (num: string) => {
      const invs = await purchasesApi.getInvoices({ search: num });
      return invs.find(i => i.invoiceNumber === num && i.status === 'Posted');
    },
    onSuccess: (inv) => {
      if (inv) {
        setSelectedInv(inv);
        setReturnLines(inv.lines.map(l => ({ originalInvoiceLineId: l.id, quantity: '' })));
        setError(null);
      } else {
        setError('لم يتم العثور على فاتورة مرحلة بذلك الرقم.');
        setSelectedInv(null);
      }
    },
    onError: () => showError('فشل البحث عن الفاتورة'),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePurchaseReturnRequest) => purchasesApi.createReturn(data),
    onSuccess: (ret) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseReturns'] });
      showSuccess(`تم إنشاء المرتجع ${ret.returnNumber} كمسودة`);
      setPendingSaved(ret);
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر حفظ المرتجع', err.response?.data?.detail || err.response?.data?.message),
  });

  const postMutation = useMutation({
    mutationFn: purchasesApi.postReturn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseReturns'] });
      showSuccess(res.message || 'تم ترحيل المرتجع بنجاح');
      navigate(`/purchases/returns/${res.purchaseReturn.id}`, { replace: true });
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل المرتجع', err.response?.data?.detail || err.response?.data?.message),
  });

  const totalAmount = useMemo(
    () => selectedInv
      ? returnLines.reduce((s, rl) => {
          const orig = selectedInv.lines.find(l => l.id === rl.originalInvoiceLineId);
          return s + (orig ? (parseFloat(rl.quantity) || 0) * orig.effectiveUnitCost : 0);
        }, 0)
      : 0,
    [selectedInv, returnLines]
  );

  const updateReturnQty = (lineId: string, qty: string) => {
    setReturnLines(prev => prev.map(l => l.originalInvoiceLineId === lineId ? { ...l, quantity: qty } : l));
  };

  const handleSave = () => {
    if (pendingSaved) { postMutation.mutate(pendingSaved.id); return; }
    setError(null);
    if (!selectedInv) { setError('ابحث عن فاتورة أولاً.'); return; }
    const validLines = returnLines.filter(l => parseFloat(l.quantity) > 0);
    if (validLines.length === 0) { setError('يجب إدخال بند واحد على الأقل بكمية > 0.'); return; }
    for (const rl of validLines) {
      const orig = selectedInv.lines.find(l => l.id === rl.originalInvoiceLineId);
      if (orig && parseFloat(rl.quantity) > orig.quantity) {
        setError(`الكمية لـ ${orig.productName} تتجاوز الكمية الأصلية (${orig.quantity}).`);
        return;
      }
    }
    createMutation.mutate({
      originalInvoiceId: selectedInv.id,
      notes: notes.trim() || null,
      lines: validLines.map(l => ({ originalInvoiceLineId: l.originalInvoiceLineId, quantity: parseFloat(l.quantity), notes: null })),
    });
  };

  usePhoenixShortcuts({
    onNew: () => { navigate('/purchases/returns/new'); window.location.reload(); },
    onSave: handleSave,
    onClose: () => navigate('/purchases/returns'),
    onPrint: () => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ المرتجع (F10)'),
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-lg font-bold text-foreground">مرتجع شراء جديد</span>
            {pendingSaved && <StatusBadge status={pendingSaved.status} className="px-3 py-1 text-xs" />}
          </div>
          <ActionButton icon={<Plus size={14} />} label="جديد" shortcut="F2" onClick={() => { navigate('/purchases/returns/new'); window.location.reload(); }} />
          <ActionButton
            icon={pendingSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            label={pendingSaved ? 'ترحيل' : 'حفظ'} shortcut="F10"
            variant={pendingSaved ? 'success' : 'primary'}
            onClick={handleSave} loading={createMutation.isPending || postMutation.isPending}
          />
          <ActionButton icon={<Printer size={14} />} label="طباعة" shortcut="Ctrl+P"
            onClick={() => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ المرتجع (F10)')} />
          <ActionButton icon={<XCircle size={14} />} label="إلغاء" variant="destructive" onClick={() => setConfirmCancel(true)} />
          <ActionButton icon={<X size={14} />} label="إغلاق" shortcut="Esc" variant="ghost" onClick={() => navigate('/purchases/returns')} />
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
              type="text" value={invNum} disabled={!!pendingSaved}
              onChange={(e) => setInvNum(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchMutation.mutate(invNum.trim()); } }}
              placeholder="رقم الفاتورة الأصلية — مثال: PINV-202608-0001"
              className={`${phoenixHeaderInput} pr-8`}
            />
          </div>
          <button type="button" disabled={searchMutation.isPending || !invNum.trim() || !!pendingSaved}
            onClick={() => searchMutation.mutate(invNum.trim())}
            className="h-9 px-4 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {searchMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} بحث
          </button>
        </div>
        {selectedInv && (
          <div className="px-4 pb-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedInv.invoiceNumber}</span> — {selectedInv.supplierName} — {formatDate(selectedInv.invoiceDate)}
          </div>
        )}
      </div>

      {/* ══ بنود المرتجع ══ */}
      {selectedInv && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">بنود المرتجع</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 text-center">#</th>
                  <th className="px-3 py-2.5 text-center">الصنف</th>
                  <th className="px-3 py-2.5 text-center">الكمية الأصلية</th>
                  <th className="px-3 py-2.5 text-center">التكلفة الفعّالة</th>
                  <th className="px-3 py-2.5 w-32 text-center">كمية المرتجع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {returnLines.map((rl, i) => {
                  const orig = selectedInv.lines.find(l => l.id === rl.originalInvoiceLineId);
                  if (!orig) return null;
                  return (
                    <tr key={rl.originalInvoiceLineId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2"><span className="text-[10px] text-muted-foreground mr-2 font-mono">{orig.productSKU}</span><span className="font-semibold text-foreground">{orig.productName}</span></td>
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{formatStock(orig.quantity)}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(orig.effectiveUnitCost)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" step="0.0001" max={orig.quantity} value={rl.quantity}
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
        onConfirm={() => navigate('/purchases/returns')}
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
    queryKey: ['purchaseReturn', id],
    queryFn: () => purchasesApi.getReturnById(id),
    enabled: !!id,
  });

  const postMutation = useMutation({
    mutationFn: purchasesApi.postReturn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseReturns'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseReturn', id] });
      showSuccess(res.message || 'تم ترحيل المرتجع بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل المرتجع', err.response?.data?.detail || err.response?.data?.message),
  });

  usePhoenixShortcuts({
    onNew: () => { navigate('/purchases/returns/new'); window.location.reload(); },
    onClose: () => navigate('/purchases/returns'),
    onPrint: () => window.print(),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-16 text-muted-foreground gap-3"><Loader2 size={20} className="animate-spin" /> جاري التحميل...</div>;
  }
  if (error || !ret) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm space-y-3">
        <p className="flex items-center gap-2"><AlertTriangle size={16} /> تعذر تحميل المرتجع.</p>
        <button onClick={() => navigate('/purchases/returns')} className="px-4 h-9 text-xs font-bold bg-muted border border-border rounded-lg text-foreground hover:bg-accent">العودة للقائمة</button>
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
          <button type="button" onClick={() => { navigate('/purchases/returns/new'); window.location.reload(); }}
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
          <button type="button" onClick={() => navigate('/purchases/returns')}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent transition-all">
            <X size={14} /> إغلاق <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Esc</kbd>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'المورد', value: ret.supplierName },
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
                <th className="px-3 py-2.5 text-center">تكلفة الوحدة</th>
                <th className="px-3 py-2.5 text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {ret.lines.map((l, i) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5"><span className="text-[10px] text-muted-foreground mr-2 font-mono">{l.productSKU}</span><span className="font-semibold text-foreground">{l.productName}</span></td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatStock(l.quantity)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-amber-500">{formatCurrency(l.unitCost)}</td>
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
    </div>
  );
};

// ── ROUTE ENTRY ──

export const PurchaseReturnPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return id ? <ReturnDetail /> : <ReturnEditor />;
};
