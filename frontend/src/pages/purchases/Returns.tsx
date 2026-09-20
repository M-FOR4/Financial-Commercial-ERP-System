import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { purchasesApi, type PurchaseReturnDto, type JournalEntryStatus } from '../../services/purchasesApi';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { showSuccess, showError } from '../../lib/toast';
import { formatCurrency, formatDate } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  PURCHASE RETURNS LIST — /purchases/returns
//  Phoenix list: creation and detail live on dedicated
//  full-page routes (/purchases/returns/new, /purchases/returns/:id).
// ═══════════════════════════════════════════════════════════

const STATUS_FILTERS: { id: JournalEntryStatus | ''; label: string }[] = [
  { id: '', label: 'الكل' },
  { id: 'Draft', label: 'مسودة' },
  { id: 'Posted', label: 'مرحلة' },
  { id: 'Cancelled', label: 'ملغاة' },
];

export const Returns: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [postTarget, setPostTarget] = useState<PurchaseReturnDto | null>(null);

  const { data: returns = [], isLoading, error } = useQuery({
    queryKey: ['purchaseReturns', statusFilter],
    queryFn: () => purchasesApi.getReturns({ status: statusFilter as JournalEntryStatus || undefined }),
  });

  const postMutation = useMutation({
    mutationFn: purchasesApi.postReturn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseReturns'] });
      setPostTarget(null);
      showSuccess(res.message || 'تم ترحيل المرتجع بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل المرتجع', err.response?.data?.detail || err.response?.data?.message),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرتجعات الشراء</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة مرتجعات الموردين — {returns.length} مرتجع</p>
        </div>
        <button onClick={() => navigate('/purchases/returns/new')}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2">
          <Plus size={16} /> مرتجع جديد
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button key={f.id || 'all'} onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              statusFilter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            }`}>{f.label}</button>
        ))}
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل تحميل البيانات.</div>}
      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground gap-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}

      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-center">رقم المرتجع</th>
                  <th className="px-5 py-3 text-center">التاريخ</th>
                  <th className="px-5 py-3 text-center">الفاتورة الأصلية</th>
                  <th className="px-5 py-3 text-center">المورد</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                  <th className="px-5 py-3 text-center">الإجمالي</th>
                  <th className="px-5 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {returns.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لا توجد مرتجعات.</td></tr>
                ) : returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/purchases/returns/${ret.id}`)}>
                    <td className="px-5 py-3 text-center font-semibold text-primary">{ret.returnNumber}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{formatDate(ret.returnDate)}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{ret.originalInvoiceNumber}</td>
                    <td className="px-5 py-3 text-center text-foreground">{ret.supplierName}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={ret.status} /></td>
                    <td className="px-5 py-3 text-center font-semibold text-amber-500 tabular-nums">{formatCurrency(ret.totalAmount)}</td>
                    <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {ret.status === 'Draft' && (
                        <button onClick={() => setPostTarget(ret)}
                          className="px-2 py-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-colors">ترحيل</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={postTarget !== null}
        title={`تأكيد ترحيل ${postTarget?.returnNumber ?? ''}`}
        message="سيتم ترحيل المرتجع وخصم الكميات من المستودع وإنشاء القيود المحاسبية العكسية."
        confirmLabel="تأكيد الترحيل"
        variant="default"
        isPending={postMutation.isPending}
        onConfirm={() => { if (postTarget) postMutation.mutate(postTarget.id); }}
        onCancel={() => setPostTarget(null)}
      />
    </div>
  );
};
