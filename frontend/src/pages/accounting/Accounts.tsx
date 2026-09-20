import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi, type AccountDto, type AccountType } from '../../services/accountingApi';
import { X, RefreshCw } from 'lucide-react';
import { formatBalance, accountTypeLabelsAr } from '../../utils/format';

// Column widths shared by the header row and every account row so the
// metadata columns (code / type / status / balance / actions) stay aligned
// on the left edge of the RTL layout.
const COL = {
  toggle: 'w-5 shrink-0',
  code: 'w-20 shrink-0 px-2 text-center',
  name: 'flex-1 min-w-0 text-start',
  type: 'w-24 shrink-0 px-2 text-center',
  status: 'w-24 shrink-0 px-2 text-center',
  balance: 'w-32 shrink-0 px-2 text-start tabular-nums',
  actions: 'w-16 shrink-0 px-2 text-center',
};

// ── Helpers ──

const defaultTypeColor = { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border' };

const accountTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  Asset: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Liability: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  Equity: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  Revenue: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
  Expense: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
};

// ── Account Tree Node ──

interface AccountNodeProps {
  account: AccountDto;
  depth: number;
  onEdit: (account: AccountDto) => void;
  onAddChild: (parent: AccountDto) => void;
}

const AccountNode: React.FC<AccountNodeProps> = ({ account, depth, onEdit, onAddChild }) => {
  // Every level starts expanded so no account category is hidden from view.
  const [expanded, setExpanded] = useState(true);
  const colors = accountTypeColors[account.type] || defaultTypeColor;
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2.5 pe-3 rounded-lg hover:bg-muted/40 transition-colors group cursor-pointer"
        // RTL: children are indented from the right (inline start) edge by depth.
        style={{ paddingInlineStart: `${depth * 20 + 8}px` }}
      >
        {/* Expand/Collapse toggle */}
        <button
          className={`${COL.toggle} h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors ${
            hasChildren ? 'visible' : 'invisible'
          }`}
          aria-label={expanded ? 'طي الحسابات الفرعية' : 'توسيع الحسابات الفرعية'}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {hasChildren ? (expanded ? '▾' : '▸') : ''}
        </button>

        {/* Name (hierarchy level) */}
        <span className={`${COL.name} text-sm truncate ${account.isHeader ? 'text-foreground font-bold' : 'text-foreground font-medium'}`}>
          {account.name}
        </span>

        {/* Code */}
        <span className={`${COL.code} text-xs font-bold text-muted-foreground font-mono`}>
          {account.code}
        </span>

        {/* Type */}
        <span className={COL.type}>
          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
            {accountTypeLabelsAr[account.type] || account.type}
          </span>
        </span>

        {/* Status: header / active */}
        <span className={COL.status}>
          {account.isHeader ? (
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/60 text-muted-foreground border border-border/40">
              رئيسي
            </span>
          ) : !account.isActive ? (
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/15 text-destructive border border-destructive/30">
              غير نشط
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              نشط
            </span>
          )}
        </span>

        {/* Balance */}
        <span className={`${COL.balance} text-sm font-bold ${account.isHeader ? 'text-muted-foreground/40' : account.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {account.isHeader ? '—' : `${account.balance >= 0 ? '+' : ''}${formatBalance(account.balance)}`}
        </span>

        {/* Row actions: inline add-child + edit */}
        <span className={COL.actions}>
          {/* Inline "add sub-account" on the row itself (no parent dropdown needed) */}
          <button
            className="opacity-0 group-hover:opacity-100 px-1 py-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all"
            title={`إضافة حساب فرعي تحت ${account.code} — ${account.name}`}
            aria-label={`إضافة حساب فرعي تحت ${account.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(account);
            }}
          >
            +
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
          >
            تعديل
          </button>
        </span>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {account.children!.map((child) => (
            <AccountNode key={child.id} account={child} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Add/Edit Account Modal ──

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: AccountDto | null;
  parentAccount?: AccountDto | null;
  allAccounts: AccountDto[];
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, account, parentAccount, allAccounts }) => {
  const queryClient = useQueryClient();
  const isEditing = !!account;

  const [code, setCode] = useState(account?.code || '');
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<AccountType>(account?.type || parentAccount?.type || 'Asset');
  const [parentId, setParentId] = useState<string | null>(account?.parentId || parentAccount?.id || null);
  const [isHeader, setIsHeader] = useState(account?.isHeader ?? false);
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  // Once the user types a code we stop overwriting it with the auto-suggestion.
  const [codeTouched, setCodeTouched] = useState(false);
  const [suggestNonce, setSuggestNonce] = useState(0);
  const [appliedSuggestion, setAppliedSuggestion] = useState<string | null>(null);
  const editingAccountId = account?.id ?? null;

  React.useEffect(() => {
    if (isOpen) {
      setCode(account?.code || '');
      setName(account?.name || '');
      setType(account?.type || parentAccount?.type || 'Asset');
      setParentId(account?.parentId || parentAccount?.id || null);
      setIsHeader(account?.isHeader ?? false);
      setIsActive(account?.isActive ?? true);
      setError(null);
      setCodeTouched(false);
      setAppliedSuggestion(null);
    }
  }, [isOpen, account, parentAccount]);

  // Next free code for the selected parent (and account category) — the backend
  // walks the parent's numeric block so sibling codes stay in sequence.
  const { data: suggestion, isFetching: isSuggesting } = useQuery({
    queryKey: ['accountSuggestCode', parentId, type, suggestNonce],
    queryFn: () => accountingApi.suggestAccountCode(parentId, type),
    enabled: isOpen && !isEditing,
    retry: false,
  });

  // Adopt the suggested code as soon as it arrives. This is a render-time
  // adjustment (the codebase convention) rather than an effect, so the field
  // never renders an empty value before the suggestion lands.
  if (!isEditing && !codeTouched && suggestion?.suggestedCode && appliedSuggestion !== suggestion.suggestedCode) {
    setAppliedSuggestion(suggestion.suggestedCode);
    setCode(suggestion.suggestedCode);
  }

  const createMutation = useMutation({
    mutationFn: accountingApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountsTree'] });
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'فشل في إنشاء الحساب');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; isHeader: boolean; isActive: boolean } }) =>
      accountingApi.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountsTree'] });
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'فشل في تحديث الحساب');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isEditing && account) {
      updateMutation.mutate({
        id: account.id,
        data: { name, isHeader, isActive },
      });
    } else {
      createMutation.mutate({ code, name, type, parentId, isHeader, isActive });
    }
  };

  if (!isOpen) return null;

  // Flatten all accounts (with their depth) for the parent dropdown
  const flatList: { account: AccountDto; depth: number }[] = [];
  const flatten = (items: AccountDto[], depth: number) => {
    for (const item of items) {
      flatList.push({ account: item, depth });
      if (item.children) flatten(item.children, depth + 1);
    }
  };
  flatten(allAccounts, 0);

  // Parent options are limited to header accounts of the SELECTED category so a
  // new account can never be filed under an unrelated account type.
  const parentOptions = flatList.filter(
    (entry) => entry.account.isHeader && entry.account.type === type && entry.account.id !== editingAccountId
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all"
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-bold text-foreground pl-12">{isEditing ? 'تعديل الحساب' : 'إضافة حساب جديد'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Code - only editable when creating */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">كود الحساب</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeTouched(true); }}
              disabled={isEditing}
              placeholder="مثال: 1150"
              className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {!isEditing && (
              <button
                type="button"
                onClick={() => { setCodeTouched(false); setAppliedSuggestion(null); setSuggestNonce((n) => n + 1); }}
                disabled={isSuggesting}
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={11} className={isSuggesting ? 'animate-spin' : ''} />
                اقتراح الكود التالي تلقائياً — يمكن تعديله يدوياً
              </button>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">اسم الحساب</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: صندوق صغير"
              className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          {/* Type - only when creating */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">نوع الحساب</label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value as AccountType); setParentId(null); setCodeTouched(false); }}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="Asset">أصول</option>
                <option value="Liability">خصوم</option>
                <option value="Equity">حقوق ملكية</option>
                <option value="Revenue">إيرادات</option>
                <option value="Expense">مصروفات</option>
              </select>
            </div>
          )}

          {/* Parent Account - only when creating */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold tracking-wider text-muted-foreground mb-1.5">الحساب الأصل (اختياري)</label>
              <select
                value={parentId || ''}
                onChange={(e) => { setParentId(e.target.value || null); setCodeTouched(false); }}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                <option value="">بدون أصل (المستوى الجذر)</option>
                {parentOptions.map(({ account: a, depth }) => (
                  <option key={a.id} value={a.id}>
                    {'— '.repeat(depth)}{a.code} — {a.name}
                  </option>
                ))}
              </select>
              {parentOptions.length === 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  لا يوجد حساب رئيسي من نفس النوع — أنشئ حساباً رئيسياً أولاً أو أضف هذا الحساب في المستوى الجذر.
                </p>
              )}
            </div>
          )}

          {/* Is Header + IsActive checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHeader}
                onChange={(e) => setIsHeader(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring"
              />
              <span className="text-sm text-foreground">حساب رئيسي</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring"
              />
              <span className="text-sm text-foreground">نشط</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الحفظ...
                </>
              ) : isEditing ? (
                'تحديث الحساب'
              ) : (
                'إنشاء حساب'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Accounts Page ──

export const Accounts: React.FC = () => {
  const [filterType, setFilterType] = useState<AccountType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [parentForNew, setParentForNew] = useState<AccountDto | null>(null);

  const { data: accountsTree = [], isLoading, error } = useQuery({
    queryKey: ['accountsTree'],
    queryFn: accountingApi.getAccountsTree,
  });

  const handleEdit = (account: AccountDto) => {
    setEditingAccount(account);
    setParentForNew(null);
    setModalOpen(true);
  };

  const handleAddChild = (parent: AccountDto) => {
    setEditingAccount(null);
    setParentForNew(parent);
    setModalOpen(true);
  };

  const handleAddRoot = () => {
    setEditingAccount(null);
    setParentForNew(null);
    setModalOpen(true);
  };

  // Filter accounts by type
  const filteredAccounts = filterType
    ? accountsTree.filter((a) => a.type === filterType)
    : accountsTree;

  // Search filter (recursive)
  const matchesSearch = (account: AccountDto, query: string): boolean => {
    const q = query.toLowerCase();
    if (account.code.toLowerCase().includes(q) || account.name.toLowerCase().includes(q)) return true;
    if (account.children) return account.children.some((c) => matchesSearch(c, q));
    return false;
  };

  const displayedAccounts = searchQuery
    ? filteredAccounts.filter((a) => matchesSearch(a, searchQuery))
    : filteredAccounts;

  // Summary stats
  const totalAccounts = accountsTree.reduce((sum, a) => {
    let count = 1;
    const countChildren = (items: AccountDto[]) => {
      for (const item of items) {
        count++;
        if (item.children) countChildren(item.children);
      }
    };
    if (a.children) countChildren(a.children);
    return sum + count;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">دليل الحسابات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            دليل الحسابات الهرمي — {totalAccounts} حساب
          </p>
        </div>
        <button
          onClick={handleAddRoot}
          className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span>
          إضافة حساب
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالكود أو الاسم..."
            className="w-full px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              filterType === ''
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            الكل
          </button>
          {(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as AccountType[]).map((t) => {
            const c = accountTypeColors[t];
            return (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? '' : t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  filterType === t
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {accountTypeLabelsAr[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-red-300 text-sm">
          فشل في تحميل دليل الحسابات. تأكد من تشغيل الخادم.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>جاري تحميل دليل الحسابات...</span>
        </div>
      )}

      {/* COA Tree */}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Column Headers — same widths as the rows below */}
          <div className="flex items-center gap-2 py-2.5 pe-3 ps-2 bg-muted/40 border-b border-border text-[10px] font-semibold tracking-wider text-muted-foreground">
            <span className={COL.toggle} />
            <span className={COL.name}>اسم الحساب</span>
            <span className={COL.code}>الكود</span>
            <span className={COL.type}>النوع</span>
            <span className={COL.status}>الحالة</span>
            <span className={COL.balance}>الرصيد</span>
            <span className={COL.actions}>الإجراءات</span>
          </div>

          {/* Account rows */}
          <div className="divide-y divide-border/50">
            {displayedAccounts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                لا توجد حسابات. اضغط "إضافة حساب" لإنشاء أول حساب.
              </div>
            ) : (
              displayedAccounts.map((account) => (
                <div key={account.id}>
                  <AccountNode account={account} depth={0} onEdit={handleEdit} onAddChild={handleAddChild} />
                  {/* Quick-add child button for header accounts */}
                  {account.isHeader && (
                    <div style={{ paddingInlineStart: '34px' }}>
                      <button
                        onClick={() => handleAddChild(account)}
                        className="text-xs text-primary hover:text-primary/70 mb-1 flex items-center gap-1 transition-colors"
                      >
                        <span>+</span> إضافة حساب فرعي تحت {account.code}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <AccountModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAccount(null);
          setParentForNew(null);
        }}
        account={editingAccount}
        parentAccount={parentForNew}
        allAccounts={accountsTree}
      />
    </div>
  );
};
