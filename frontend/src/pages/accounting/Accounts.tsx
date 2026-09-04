import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi, type AccountDto, type AccountType } from '../../services/accountingApi';

// ── Helpers ──

const defaultTypeColor = { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border' };

const accountTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  Asset: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Liability: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  Equity: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  Revenue: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
  Expense: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
};



const formatBalance = (n: number) =>
  new Intl.NumberFormat('en-LY', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);

// ── Account Tree Node ──

interface AccountNodeProps {
  account: AccountDto;
  depth: number;
  onEdit: (account: AccountDto) => void;
}

const AccountNode: React.FC<AccountNodeProps> = ({ account, depth, onEdit }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const colors = accountTypeColors[account.type] || defaultTypeColor;
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors group cursor-pointer`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/Collapse toggle */}
        <button
          className={`w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors ${
            hasChildren ? 'visible' : 'invisible'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {hasChildren ? (expanded ? '▾' : '▸') : ''}
        </button>

        {/* Code badge */}
        <span className="w-14 text-xs font-mono font-semibold text-muted-foreground text-right shrink-0">
          {account.code}
        </span>

        {/* Name */}
        <span className={`text-sm font-medium flex-1 ${account.isHeader ? 'text-foreground font-semibold' : 'text-foreground'}`}>
          {account.name}
        </span>

        {/* Type badge */}
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border} shrink-0`}>
          {account.type}
        </span>

        {/* Header / Active indicators */}
        {account.isHeader && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/60 text-muted-foreground border border-border/40 shrink-0">
            رئيسي
          </span>
        )}
        {!account.isActive && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-900/40 text-red-400 border border-red-800/40 shrink-0">
            غير نشط
          </span>
        )}

        {/* Balance */}
        {!account.isHeader && (
          <span className={`text-sm font-mono font-semibold shrink-0 ml-2 ${account.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {account.balance >= 0 ? '+' : ''}{formatBalance(account.balance)}
          </span>
        )}

        {/* Edit button */}
        <button
          className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700/40 rounded transition-all shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(account);
          }}
        >
          تعديل
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {account.children!.map((child) => (
            <AccountNode key={child.id} account={child} depth={depth + 1} onEdit={onEdit} />
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
    }
  }, [isOpen, account, parentAccount]);

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

  // Flatten all accounts for parent dropdown
  const flatList: AccountDto[] = [];
  const flatten = (items: AccountDto[]) => {
    for (const item of items) {
      flatList.push(item);
      if (item.children) flatten(item.children);
    }
  };
  flatten(allAccounts);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{isEditing ? 'تعديل الحساب' : 'إضافة حساب جديد'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Code - only editable when creating */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">كود الحساب</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEditing}
              placeholder="مثال: 1150"
              className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">اسم الحساب</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: صندوق صغير"
              className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Type - only when creating */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">نوع الحساب</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الحساب الأصل (اختياري)</label>
              <select
                value={parentId || ''}
                onChange={(e) => setParentId(e.target.value || null)}
                className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">بدون أصل (المستوى الجذر)</option>
                {flatList
                  .filter((a) => a.isHeader && a.type === type && a.id !== editingAccountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Is Header + IsActive checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHeader}
                onChange={(e) => setIsHeader(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-input text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-foreground">حساب رئيسي</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-input text-indigo-500 focus:ring-indigo-500"
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
          <h1 className="text-2xl font-bold text-foreground">شجرة الحسابات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            شجرة الحسابات الهرمية — {totalAccounts} حساب
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
            className="w-full px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-red-300 text-sm">
          فشل في تحميل شجرة الحسابات. تأكد من تشغيل الخادم.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>جاري تحميل شجرة الحسابات...</span>
        </div>
      )}

      {/* COA Tree */}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Column Headers */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="w-5 shrink-0" />
            <span className="w-14 text-right shrink-0">الكود</span>
            <span className="flex-1">اسم الحساب</span>
            <span className="w-20 text-center shrink-0">النوع</span>
            <span className="w-16 text-center shrink-0">الحالة</span>
            <span className="w-32 text-right shrink-0">الرصيد</span>
            <span className="w-14 shrink-0" />
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
                  <AccountNode account={account} depth={0} onEdit={handleEdit} />
                  {/* Quick-add child button for header accounts */}
                  {account.isHeader && (
                    <div style={{ paddingLeft: '36px' }}>
                      <button
                        onClick={() => handleAddChild(account)}
                        className="text-xs text-indigo-500 hover:text-indigo-400 mb-1 flex items-center gap-1 transition-colors"
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
