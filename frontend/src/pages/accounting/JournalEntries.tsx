import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accountingApi,
  type JournalEntryDto,
  type JournalEntryStatus,
  type JournalEntryLineRequest,
  type AccountDto,
  type CreateJournalEntryRequest,
} from '../../services/accountingApi';

// ── Helpers ──

const statusConfig: Record<JournalEntryStatus, { bg: string; text: string; border: string; label: string }> = {
  Draft: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'مسودة' },
  Posted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'مرحل' },
  Cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'ملغي' },
};

const formatBalance = (n: number) =>
  new Intl.NumberFormat('en-LY', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);

const formatDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

// ── New Journal Entry Form ──

interface NewEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
}

interface FormLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

const emptyLine = (): FormLine => ({ accountId: '', debit: '', credit: '', description: '' });

const NewEntryForm: React.FC<NewEntryFormProps> = ({ isOpen, onClose, accounts }) => {
  const queryClient = useQueryClient();

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<FormLine[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);

  // Flat non-header accounts for dropdowns
  const leafAccounts = accounts.filter((a) => !a.isHeader);

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.0001;
  const difference = totalDebit - totalCredit;

  const updateLine = (index: number, field: keyof FormLine, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateJournalEntryRequest) => accountingApi.createJournalEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      resetForm();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'فشل في إنشاء القيد اليومي');
    },
  });

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setLines([emptyLine(), emptyLine()]);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('الوصف مطلوب');
      return;
    }

    const validLines: JournalEntryLineRequest[] = lines
      .filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || null,
      }));

    if (validLines.length < 2) {
      setError('يجب إضافة بندين على الأقل بمبالغ');
      return;
    }

    createMutation.mutate({
      entryDate,
      description: description.trim(),
      lines: validLines,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold text-foreground">قيد يومي جديد</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-300 text-sm">{error}</div>
          )}

          {/* Date & Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">تاريخ القيد</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الوصف</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: بيع نقدي للعميل XYZ"
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">بنود القيد</h4>
              <button
                type="button"
                onClick={addLine}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700/40 rounded-lg transition-colors"
              >
                + إضافة بند
              </button>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_120px_120px_1fr_40px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              <span>الحساب</span>
              <span className="text-right">مدين</span>
              <span className="text-right">دائن</span>
              <span>وصف البند</span>
              <span />
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_120px_120px_1fr_40px] gap-2">
                  <select
                    required
                    value={line.accountId}
                    onChange={(e) => updateLine(idx, 'accountId', e.target.value)}
                    className="px-3 py-2 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
                  >
                    <option value="">اختر حساب...</option>
                    {leafAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={line.debit}
                    onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                    placeholder="0.0000"
                    className="px-3 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={line.credit}
                    onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                    placeholder="0.0000"
                    className="px-3 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    placeholder="ملاحظة اختيارية..."
                    className="px-3 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length <= 2}
                    className="w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 grid grid-cols-[1fr_120px_120px_1fr_40px] gap-2 text-sm font-mono font-bold">
              <span className="text-muted-foreground px-1 py-2">الإجمالي</span>
              <span className="text-right px-3 py-2 text-emerald-400">{formatBalance(totalDebit)}</span>
              <span className="text-right px-3 py-2 text-sky-400">{formatBalance(totalCredit)}</span>
              <span className={`px-3 py-2 ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isBalanced ? '✓ متوافق' : `الفرق: ${formatBalance(difference)}`}
              </span>
              <span />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isBalanced || createMutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء قيد مسودة'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Journal Entry Detail Drawer ──

interface EntryDetailProps {
  entry: JournalEntryDto | null;
  onClose: () => void;
}

const EntryDetail: React.FC<EntryDetailProps> = ({ entry, onClose }) => {
  const queryClient = useQueryClient();

  const postMutation = useMutation({
    mutationFn: accountingApi.postJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      onClose();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: accountingApi.cancelJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      onClose();
    },
  });

  if (!entry) return null;

  const sc = statusConfig[entry.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-lg font-bold text-foreground">{entry.entryNumber}</h3>
            <span className="text-xs text-muted-foreground">{formatDate(entry.entryDate)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
              {entry.statusName} ({sc.label})
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="bg-muted/40 rounded-lg p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">الوصف</span>
            <span className="text-sm text-foreground">{entry.description}</span>
          </div>

          {/* Lines Table */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">بنود القيد</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-left">الحساب</th>
                    <th className="px-4 py-2.5 text-right">مدين</th>
                    <th className="px-4 py-2.5 text-right">دائن</th>
                    <th className="px-4 py-2.5 text-left">ملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {entry.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{line.accountCode}</span>
                        <span className="text-foreground">{line.accountName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                        {line.debit > 0 ? formatBalance(line.debit) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sky-400">
                        {line.credit > 0 ? formatBalance(line.credit) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{line.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-bold text-sm">
                    <td className="px-4 py-2.5 text-muted-foreground">الإجمالي</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{formatBalance(entry.totalDebit)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sky-400">{formatBalance(entry.totalCredit)}</td>
                    <td className="px-4 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Posting Info */}
          {entry.postedAt && (
            <div className="bg-muted/40 rounded-lg p-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">وقت الترحيل</span>
                <span className="text-foreground font-mono">{new Date(entry.postedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">تم الترحيل بواسطة</span>
                <span className="text-foreground">{entry.postedByUserName || 'النظام'}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {entry.status === 'Draft' && (
              <>
                <button
                  onClick={() => postMutation.mutate(entry.id)}
                  disabled={postMutation.isPending}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {postMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '✓ ترحيل القيد'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors"
                >
                  إغلاق
                </button>
              </>
            )}
            {entry.status === 'Posted' && (
              <button
                onClick={() => {
                  if (window.confirm(`هل أنت متأكد من إلغاء ${entry.entryNumber}؟ سيؤدي هذا إلى عكس جميع أرصدة دفتر الأستاذ.`)) {
                    cancelMutation.mutate(entry.id);
                  }
                }}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '✕ إلغاء القيد'
                )}
              </button>
            )}
            {entry.status === 'Cancelled' && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Journal Entries Page ──

export const JournalEntries: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryDto | null>(null);

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['journalEntries', statusFilter, searchQuery],
    queryFn: () =>
      accountingApi.getJournalEntries({
        status: statusFilter as JournalEntryStatus | undefined,
        search: searchQuery || undefined,
      }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accountsFlat'],
    queryFn: () => accountingApi.getAccountsFlat(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">القيود اليومية</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة القيود اليومية المزدوجة — Decision D-028
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span>
          قيد جديد
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم القيد أو الوصف..."
            className="w-full px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              statusFilter === ''
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            الكل
          </button>
          {(['Draft', 'Posted', 'Cancelled'] as JournalEntryStatus[]).map((s) => {
            const c = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  statusFilter === s
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-red-300 text-sm">
          فشل في تحميل القيود اليومية. تأكد من تشغيل الخادم.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>جاري تحميل القيود اليومية...</span>
        </div>
      )}

      {/* Entries Table */}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="border-b border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-left">رقم القيد</th>
                  <th className="px-5 py-3 text-left">التاريخ</th>
                  <th className="px-5 py-3 text-left">الوصف</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                  <th className="px-5 py-3 text-right">إجمالي المدين</th>
                  <th className="px-5 py-3 text-right">إجمالي الدائن</th>
                  <th className="px-5 py-3 text-center">البنود</th>
                  <th className="px-5 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                      لا توجد قيود يومية. اضغط "قيد جديد" لإنشاء أول قيد.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const sc = statusConfig[entry.status];
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <td className="px-5 py-3 font-mono font-semibold text-indigo-400">{entry.entryNumber}</td>
                        <td className="px-5 py-3 font-mono text-muted-foreground">{formatDate(entry.entryDate)}</td>
                        <td className="px-5 py-3 text-foreground truncate max-w-xs">{entry.description}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                            {entry.statusName}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-emerald-400">{formatBalance(entry.totalDebit)}</td>
                        <td className="px-5 py-3 text-right font-mono text-sky-400">{formatBalance(entry.totalCredit)}</td>
                        <td className="px-5 py-3 text-center text-muted-foreground">{entry.lines.length}</td>
                        <td className="px-5 py-3 text-center">
                          {entry.status === 'Draft' && (
                            <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  if (window.confirm(`ترحيل ${entry.entryNumber}؟`)) {
                                    accountingApi.postJournalEntry(entry.id).then(() => {
                                      window.location.reload();
                                    });
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 rounded hover:bg-emerald-900/50 transition-colors"
                              >
                                ترحيل
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewEntryForm isOpen={showNewForm} onClose={() => setShowNewForm(false)} accounts={accounts} />
      <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
};
