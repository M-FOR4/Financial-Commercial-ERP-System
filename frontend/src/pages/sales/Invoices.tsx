import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  salesApi, type JournalEntryStatus, type SalesInvoiceDto,
} from '../../services/salesApi';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { showSuccess, showError } from '../../lib/toast';
import { formatCurrency, formatDate } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  SALES INVOICES LIST — /sales/invoices
//  Phoenix-style list: creation and detail live on dedicated
//  full-page routes (/sales/invoices/new, /sales/invoices/:id).
// ═══════════════════════════════════════════════════════════

const STATUS_FILTERS: { id: JournalEntryStatus | ''; label: string }[] = [
  { id: '', label: 'الكل' },
  { id: 'Draft', label: 'مسودة' },
  { id: 'Posted', label: 'مرحلة' },
  { id: 'Cancelled', label: 'ملغاة' },
];

export const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [postTarget, setPostTarget] = useState<SalesInvoiceDto | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesInvoiceDto | null>(null);

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', statusFilter, searchQuery],
    queryFn: () => salesApi.getInvoices({ status: statusFilter as JournalEntryStatus || undefined, search: searchQuery || undefined }),
  });

  const postMutation = useMutation({
    mutationFn: salesApi.postInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPostTarget(null);
      showSuccess(res.message || 'تم ترحيل الفاتورة بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  const cancelMutation = useMutation({
    mutationFn: salesApi.cancelInvoice,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCancelTarget(null);
      showSuccess(res.message || 'تم إلغاء الفاتورة');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر إلغاء الفاتورة', err.response?.data?.detail || err.response?.data?.message),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">فواتير البيع</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة فواتير البيع — {invoices.length} فاتورة</p>
        </div>
        <button onClick={() => navigate('/sales/invoices/new')}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2">
          <Plus size={16} /> فاتورة جديدة
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث في الفواتير..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
        <div className="flex gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.id || 'all'} onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                statusFilter === f.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل في تحميل الفواتير.</div>}
      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}

      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
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
                ) : invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/sales/invoices/${inv.id}`)}>
                    <td className="px-5 py-3 text-center font-semibold text-primary">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-5 py-3 text-center text-foreground">{inv.customerCode} — {inv.customerName}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3 text-center font-semibold text-emerald-500">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {inv.status === 'Draft' && (
                        <button onClick={() => setPostTarget(inv)}
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
        title={`تأكيد ترحيل ${postTarget?.invoiceNumber ?? ''}`}
        message="سيتم ترحيل الفاتورة وخصم الكميات من المستودع وإنشاء القيود المحاسبية."
        confirmLabel="تأكيد الترحيل"
        variant="default"
        isPending={postMutation.isPending}
        onConfirm={() => { if (postTarget) postMutation.mutate(postTarget.id); }}
        onCancel={() => setPostTarget(null)}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        title={`تأكيد إلغاء ${cancelTarget?.invoiceNumber ?? ''}`}
        message="هل تريد إلغاء هذه الفاتورة؟ سيؤدي هذا إلى عكس جميع القيود المحاسبية المرتبطة بها."
        confirmLabel="تأكيد الإلغاء"
        isPending={cancelMutation.isPending}
        onConfirm={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget.id); }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};
