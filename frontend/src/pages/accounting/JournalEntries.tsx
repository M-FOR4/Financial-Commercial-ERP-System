import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  accountingApi,
  type JournalEntryDto,
  type JournalEntryStatus,
} from '../../services/accountingApi';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { showSuccess, showError } from '../../lib/toast';
import { formatBalance, formatDate } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  JOURNAL ENTRIES LIST — /journal-entries
//  Phoenix list: creation and detail live on dedicated
//  full-page routes (/journal-entries/new, /journal-entries/:id).
// ═══════════════════════════════════════════════════════════

const STATUS_FILTERS: { id: JournalEntryStatus | ''; label: string }[] = [
  { id: '', label: 'الكل' },
  { id: 'Draft', label: 'مسودة' },
  { id: 'Posted', label: 'مرحل' },
  { id: 'Cancelled', label: 'ملغي' },
];

export const JournalEntries: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [postTarget, setPostTarget] = useState<JournalEntryDto | null>(null);
  const [cancelTarget, setCancelTarget] = useState<JournalEntryDto | null>(null);

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['journalEntries', statusFilter, searchQuery],
    queryFn: () =>
      accountingApi.getJournalEntries({
        status: statusFilter as JournalEntryStatus | undefined,
        search: searchQuery || undefined,
      }),
  });

  const postMutation = useMutation({
    mutationFn: accountingApi.postJournalEntry,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setPostTarget(null);
      showSuccess(res.message || 'تم ترحيل القيد بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل القيد', err.response?.data?.detail || err.response?.data?.message),
  });

  const cancelMutation = useMutation({
    mutationFn: accountingApi.cancelJournalEntry,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setCancelTarget(null);
      showSuccess(res.message || 'تم إلغاء القيد');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر إلغاء القيد', err.response?.data?.detail || err.response?.data?.message),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">القيود اليومية</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة القيود اليومية المزدوجة — {entries.length} قيد</p>
        </div>
        <button onClick={() => navigate('/journal-entries/new')}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2">
          <Plus size={16} /> قيد جديد
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input
          type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث برقم القيد أو الوصف..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
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

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          فشل في تحميل القيود اليومية. تأكد من تشغيل الخادم.
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>جاري تحميل القيود اليومية...</span>
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-center">رقم القيد</th>
                  <th className="px-5 py-3 text-center">التاريخ</th>
                  <th className="px-5 py-3 text-center">الوصف</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                  <th className="px-5 py-3 text-center">إجمالي المدين</th>
                  <th className="px-5 py-3 text-center">إجمالي الدائن</th>
                  <th className="px-5 py-3 text-center">البنود</th>
                  <th className="px-5 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {entries.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">لا توجد قيود يومية. اضغط "قيد جديد" لإنشاء أول قيد.</td></tr>
                ) : entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/journal-entries/${entry.id}`)}>
                    <td className="px-5 py-3 text-center font-semibold text-primary">{entry.entryNumber}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{formatDate(entry.entryDate)}</td>
                    <td className="px-5 py-3 text-center text-foreground truncate max-w-xs">{entry.description}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={entry.status} /></td>
                    <td className="px-5 py-3 text-center text-emerald-600 dark:text-emerald-400 tabular-nums">{formatBalance(entry.totalDebit)}</td>
                    <td className="px-5 py-3 text-center text-sky-600 dark:text-sky-400 tabular-nums">{formatBalance(entry.totalCredit)}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{entry.lines.length}</td>
                    <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {entry.status === 'Draft' && (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => setPostTarget(entry)}
                            className="px-2 py-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-colors">ترحيل</button>
                        </div>
                      )}
                      {entry.status === 'Posted' && (
                        <button onClick={() => setCancelTarget(entry)}
                          className="px-2 py-1 text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/30 rounded hover:bg-destructive/20 transition-colors">إلغاء</button>
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
        title={`تأكيد ترحيل ${postTarget?.entryNumber ?? ''}`}
        message="سيتم ترحيل القيد وتحديث دفتر الأستاذ. هل تريد المتابعة؟"
        confirmLabel="تأكيد الترحيل"
        variant="default"
        isPending={postMutation.isPending}
        onConfirm={() => { if (postTarget) postMutation.mutate(postTarget.id); }}
        onCancel={() => setPostTarget(null)}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        title={`تأكيد إلغاء ${cancelTarget?.entryNumber ?? ''}`}
        message="هل أنت متأكد من إلغاء هذا القيد؟ سيؤدي هذا إلى عكس جميع أرصدة دفتر الأستاذ."
        confirmLabel="تأكيد الإلغاء"
        isPending={cancelMutation.isPending}
        onConfirm={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget.id); }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};
