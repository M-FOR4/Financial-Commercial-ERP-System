import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  accountingApi, type JournalEntryDto, type CreateJournalEntryRequest, type AccountDto,
} from '../../services/accountingApi';
import {
  Plus, Save, Printer, XCircle, X, Loader2, AlertTriangle, Trash2, CheckCircle2, Paperclip, Scale,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { ActionButton } from '../../components/ActionButton';
import { phoenixCellInput, phoenixHeaderInput } from '../../components/phoenix/tokens';
import { SimpleCombobox, SelectedChip } from '../../components/phoenix/comboboxes';
import { usePhoenixShortcuts } from '../../components/phoenix/usePhoenixShortcuts';
import { showSuccess, showError } from '../../lib/toast';
import { formatBalance, formatDate, formatDateTime } from '../../utils/format';

// ═══════════════════════════════════════════════════════════
//  JOURNAL ENTRY PAGE — Phoenix style
//  /journal-entries/new (editor) + /journal-entries/:id
//  Debit/Credit grid with live auto-balance: F10 stays disabled
//  until إجمالي المدين == إجمالي الدائن (الفرق = 0).
// ═══════════════════════════════════════════════════════════

interface JournalLine {
  rowId: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
  // مركز الكلفة / المرفق — UI placeholders until the backend model gains these fields
  costCenter: string;
  attachmentName: string | null;
}

const emptyLine = (): JournalLine => ({
  rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  accountId: '', debit: '', credit: '', description: '', costCenter: '', attachmentName: null,
});

// ── EDITOR ──

const EntryEditor: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({ queryKey: ['accountsFlat'], queryFn: () => accountingApi.getAccountsFlat() });
  const leafAccounts = useMemo(() => accounts.filter(a => !a.isHeader && a.isActive), [accounts]);

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [pendingSaved, setPendingSaved] = useState<JournalEntryDto | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ── Auto-balance computation (live) ──
  const totalDebit = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0), [lines]);
  const difference = totalDebit - totalCredit;
  const isBalanced = totalDebit > 0 && Math.abs(difference) < 0.0001;

  // ── Grid mutations ──
  const updateLine = useCallback((i: number, patch: Partial<JournalLine>) => {
    setLines(prev => { const n = [...prev]; n[i] = { ...n[i], ...patch }; return n; });
  }, []);

  const handleAccountSelect = useCallback((i: number, a: AccountDto) => {
    updateLine(i, { accountId: a.id });
  }, [updateLine]);

  const addLine = useCallback(() => setLines(prev => [...prev, emptyLine()]), []);
  const removeLine = useCallback((i: number) => {
    setLines(prev => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));
  }, []);

  // Enter on the debit/credit pair: filling one side clears the other (double-entry hygiene)
  const setSide = (i: number, side: 'debit' | 'credit', value: string) => {
    updateLine(i, side === 'debit' ? { debit: value, credit: '' } : { credit: value, debit: '' });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateJournalEntryRequest) => accountingApi.createJournalEntry(data),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      showSuccess(`تم إنشاء القيد ${entry.entryNumber} كمسودة`);
      setPendingSaved(entry);
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر حفظ القيد', err.response?.data?.detail || err.response?.data?.message),
  });

  const postMutation = useMutation({
    mutationFn: accountingApi.postJournalEntry,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      showSuccess(res.message || 'تم ترحيل القيد بنجاح');
      navigate(`/journal-entries/${res.entry.id}`, { replace: true });
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل القيد', err.response?.data?.detail || err.response?.data?.message),
  });

  const buildRequest = useCallback((): CreateJournalEntryRequest | null => {
    setError(null);
    if (!description.trim()) { setError('وصف القيد مطلوب.'); return null; }
    const validLines = lines
      .filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map(l => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description.trim() || null,
      }));
    if (lines.some(l => l.accountId && !(parseFloat(l.debit) > 0) && !(parseFloat(l.credit) > 0))) {
      setError('كل حساب محدد يجب أن يحمل مبلغاً مديناً أو دائناً.');
      return null;
    }
    if (validLines.length < 2) { setError('يجب إضافة بندين على الأقل بمبالغ.'); return null; }
    return { entryDate, description: description.trim(), lines: validLines };
  }, [lines, description, entryDate]);

  const handleSave = useCallback(() => {
    if (pendingSaved) { postMutation.mutate(pendingSaved.id); return; }
    if (!isBalanced) {
      setError('القيد غير متوازن — لا يمكن الحفظ حتى يكون الفرق صفراً (إجمالي المدين = إجمالي الدائن).');
      return;
    }
    const req = buildRequest();
    if (!req) return;
    createMutation.mutate(req);
  }, [pendingSaved, isBalanced, buildRequest, createMutation, postMutation]);

  usePhoenixShortcuts({
    onNew: () => { navigate('/journal-entries/new'); window.location.reload(); },
    onSave: handleSave,
    onClose: () => navigate('/journal-entries'),
    onPrint: () => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ القيد (F10)'),
  });

  const accountById = (id: string) => accounts.find(a => a.id === id);

  return (
    <div className="space-y-4" dir="rtl">
      {/* ══ Top Action Bar ══ */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-lg font-bold text-foreground">قيد يومي جديد</span>
            {pendingSaved && <StatusBadge status={pendingSaved.status} className="px-3 py-1 text-xs" />}
          </div>
          <ActionButton icon={<Plus size={14} />} label="جديد" shortcut="F2" onClick={() => { navigate('/journal-entries/new'); window.location.reload(); }} />
          <ActionButton
            icon={pendingSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            label={pendingSaved ? 'ترحيل' : 'حفظ'} shortcut="F10"
            variant={pendingSaved ? 'success' : 'primary'}
            disabled={!pendingSaved && !isBalanced}
            onClick={handleSave} loading={createMutation.isPending || postMutation.isPending}
          />
          <ActionButton icon={<Printer size={14} />} label="طباعة" shortcut="Ctrl+P"
            onClick={() => pendingSaved ? window.print() : showSuccess('الطباعة متاحة بعد حفظ القيد (F10)')} />
          <ActionButton icon={<XCircle size={14} />} label="إلغاء" variant="destructive" onClick={() => setConfirmCancel(true)} />
          <ActionButton icon={<X size={14} />} label="إغلاق" shortcut="Esc" variant="ghost" onClick={() => navigate('/journal-entries')} />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {/* ══ ترويسة القيد ══ */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">تاريخ القيد *</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={phoenixHeaderInput} />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">الرقم الآلي</label>
            <div className="h-9 px-3 flex items-center bg-muted/40 border border-border rounded-md text-sm text-muted-foreground">
              يُولَّد تلقائياً عند الحفظ
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">البيان / الوصف *</label>
            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: بيع نقدي للعميل XYZ" className={phoenixHeaderInput} />
          </div>
        </div>
      </div>

      {/* ══ جدول بنود القيد ══ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">بنود القيد — مدين / دائن</h3>
          <button type="button" onClick={addLine}
            className="h-8 px-3 text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1">
            <Plus size={13} /> إضافة بند
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <th className="px-2 py-2.5 w-10 text-center">#</th>
                <th className="px-2 py-2.5 text-center">رقم/اسم الحساب</th>
                <th className="px-2 py-2.5 w-32 text-center">مدين</th>
                <th className="px-2 py-2.5 w-32 text-center">دائن</th>
                <th className="px-2 py-2.5 text-center">البيان</th>
                <th className="px-2 py-2.5 w-32 text-center">مركز الكلفة</th>
                <th className="px-2 py-2.5 w-16 text-center">مرفق</th>
                <th className="px-2 py-2.5 w-14 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {lines.map((line, idx) => {
                const account = accountById(line.accountId);
                return (
                  <tr key={line.rowId} className="hover:bg-muted/20">
                    <td className="px-2 py-1.5 text-center text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="px-2 py-1.5 min-w-[240px]">
                      {account ? (
                        <SelectedChip title={`${account.code} — ${account.name}`} onClick={() => updateLine(idx, { accountId: '' })} />
                      ) : (
                        <SimpleCombobox
                          items={leafAccounts}
                          searchText={(a) => `${a.name} ${a.code}`}
                          primary={(a) => a.name}
                          secondary={(a) => `${a.code} — ${a.typeName}`}
                          trailing={(a) => (
                            <span className={`block text-xs font-bold tabular-nums ${a.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                              {formatBalance(a.balance)}
                            </span>
                          )}
                          onSelect={(a) => handleAccountSelect(idx, a)}
                          onEmptyEnter={addLine}
                          autoFocus={idx === 0}
                          placeholder="ابحث برقم أو اسم الحساب..."
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.0001" value={line.debit}
                        onChange={(e) => setSide(idx, 'debit', e.target.value)}
                        placeholder="0.0000"
                        className={`${phoenixCellInput(false)} text-center text-emerald-600 dark:text-emerald-400 font-semibold`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.0001" value={line.credit}
                        onChange={(e) => setSide(idx, 'credit', e.target.value)}
                        placeholder="0.0000"
                        className={`${phoenixCellInput(false)} text-center text-sky-600 dark:text-sky-400 font-semibold`}
                      />
                    </td>
                    <td className="px-2 py-1.5 min-w-[160px]">
                      <input
                        type="text" value={line.description}
                        onChange={(e) => updateLine(idx, { description: e.target.value })}
                        placeholder="ملاحظة اختيارية..."
                        className={`${phoenixCellInput(false)} text-right placeholder:text-muted-foreground/60`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text" value={line.costCenter}
                        onChange={(e) => updateLine(idx, { costCenter: e.target.value })}
                        placeholder="—"
                        disabled
                        title="مركز الكلفة — تحت التطوير"
                        className={`${phoenixCellInput(false)} text-center opacity-50 cursor-not-allowed`}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <label className="inline-flex items-center justify-center w-8 h-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="إرفاق مستند — تحت التطوير">
                        <Paperclip size={13} className="opacity-50" />
                        <input type="file" className="hidden" disabled onChange={() => undefined} />
                      </label>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center">
                        <button type="button" onClick={() => removeLine(idx)} disabled={lines.length <= 2} aria-label="حذف البند"
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-30" title="حذف البند">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-bold text-sm">
                <td className="px-2 py-3 text-center text-muted-foreground">Σ</td>
                <td className="px-2 py-3 text-muted-foreground">الإجمالي</td>
                <td className="px-2 py-3 text-center text-emerald-600 dark:text-emerald-400 tabular-nums">{formatBalance(totalDebit)}</td>
                <td className="px-2 py-3 text-center text-sky-600 dark:text-sky-400 tabular-nums">{formatBalance(totalCredit)}</td>
                <td colSpan={4} className={`px-2 py-3 ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Scale size={14} className="shrink-0" />
                    {isBalanced ? 'القيد متوازن ✓' : `الفرق: ${formatBalance(Math.abs(difference))} — يجب أن يكون صفراً`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground flex flex-wrap gap-4">
          <span><kbd className="font-mono bg-muted px-1 rounded">F10</kbd> حفظ (متاح فقط عند التوازن) / ترحيل</span>
          <span><kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> إغلاق</span>
          <span>إدخال المدين يمسح الدائن تلقائياً في نفس البند والعكس صحيح</span>
          <span>مركز الكلفة والمرفقات: تحت التطوير</span>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء القيد الجديد"
        message="هل تريد الخروج دون حفظ؟ سيتم تجاهل جميع بنود القيد المدخلة."
        confirmLabel="خروج دون حفظ"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => navigate('/journal-entries')}
      />
    </div>
  );
};

// ── DETAIL ──

const EntryDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState(false);

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['journalEntry', id],
    queryFn: () => accountingApi.getJournalEntryById(id),
    enabled: !!id,
  });

  const postMutation = useMutation({
    mutationFn: accountingApi.postJournalEntry,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntry', id] });
      showSuccess(res.message || 'تم ترحيل القيد بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر ترحيل القيد', err.response?.data?.detail || err.response?.data?.message),
  });

  const cancelMutation = useMutation({
    mutationFn: accountingApi.cancelJournalEntry,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntry', id] });
      setCancelTarget(false);
      showSuccess(res.message || 'تم إلغاء القيد');
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) =>
      showError('تعذر إلغاء القيد', err.response?.data?.detail || err.response?.data?.message),
  });

  usePhoenixShortcuts({
    onNew: () => { navigate('/journal-entries/new'); window.location.reload(); },
    onClose: () => navigate('/journal-entries'),
    onPrint: () => window.print(),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-16 text-muted-foreground gap-3"><Loader2 size={20} className="animate-spin" /> جاري التحميل...</div>;
  }
  if (error || !entry) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm space-y-3">
        <p className="flex items-center gap-2"><AlertTriangle size={16} /> تعذر تحميل القيد.</p>
        <button onClick={() => navigate('/journal-entries')} className="px-4 h-9 text-xs font-bold bg-muted border border-border rounded-lg text-foreground hover:bg-accent">العودة للقائمة</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2.5 ml-auto">
            <span className="text-lg font-bold text-foreground">{entry.entryNumber}</span>
            <StatusBadge status={entry.status} className="px-3 py-1 text-xs" />
          </div>
          <button type="button" onClick={() => { navigate('/journal-entries/new'); window.location.reload(); }}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-muted text-foreground hover:bg-accent border border-border transition-all active:scale-[0.98]">
            <Plus size={14} /> جديد <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">F2</kbd>
          </button>
          {entry.status === 'Draft' && (
            <button type="button" onClick={() => postMutation.mutate(entry.id)} disabled={postMutation.isPending}
              className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50">
              {postMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} ترحيل <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 rounded">F10</kbd>
            </button>
          )}
          <button type="button" onClick={() => window.print()}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-muted text-foreground hover:bg-accent border border-border transition-all active:scale-[0.98]">
            <Printer size={14} /> طباعة <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Ctrl+P</kbd>
          </button>
          {entry.status === 'Posted' && (
            <button type="button" onClick={() => setCancelTarget(true)}
              className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 transition-all active:scale-[0.98]">
              <XCircle size={14} /> إلغاء القيد
            </button>
          )}
          <button type="button" onClick={() => navigate('/journal-entries')}
            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent transition-all">
            <X size={14} /> إغلاق <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded">Esc</kbd>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">التاريخ</p>
          <p className="text-sm font-semibold text-foreground">{formatDate(entry.entryDate)}</p>
        </div>
        <div className="col-span-3">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">البيان</p>
          <p className="text-sm font-semibold text-foreground">{entry.description}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5 text-center">الحساب</th>
                <th className="px-3 py-2.5 text-center">مدين</th>
                <th className="px-3 py-2.5 text-center">دائن</th>
                <th className="px-3 py-2.5 text-center">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {entry.lines.map((l, i) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5"><span className="text-[10px] text-muted-foreground mr-2 font-mono">{l.accountCode}</span><span className="font-semibold text-foreground">{l.accountName}</span></td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-emerald-600 dark:text-emerald-400">{l.debit > 0 ? formatBalance(l.debit) : '—'}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-sky-600 dark:text-sky-400">{l.credit > 0 ? formatBalance(l.credit) : '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{l.description || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-bold text-sm">
                <td className="px-3 py-3 text-center text-muted-foreground">Σ</td>
                <td className="px-3 py-3 text-muted-foreground">الإجمالي</td>
                <td className="px-3 py-3 text-center text-emerald-600 dark:text-emerald-400 tabular-nums">{formatBalance(entry.totalDebit)}</td>
                <td className="px-3 py-3 text-center text-sky-600 dark:text-sky-400 tabular-nums">{formatBalance(entry.totalCredit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {entry.postedAt && (
        <div className="bg-muted/40 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs max-w-md">
          <div>
            <span className="text-muted-foreground block">وقت الترحيل</span>
            <span className="text-foreground">{formatDateTime(entry.postedAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">تم الترحيل بواسطة</span>
            <span className="text-foreground">{entry.postedByUserName || 'النظام'}</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={cancelTarget}
        title={`تأكيد إلغاء ${entry.entryNumber}`}
        message="هل أنت متأكد من إلغاء هذا القيد؟ سيؤدي هذا إلى عكس جميع أرصدة دفتر الأستاذ."
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(entry.id)}
        onCancel={() => setCancelTarget(false)}
      />
    </div>
  );
};

// ── ROUTE ENTRY ──

export const JournalEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return id ? <EntryDetail /> : <EntryEditor />;
};
