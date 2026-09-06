import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../components/Toast';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions: string[];
}

// ═══════════════════════════════════════
//  PERMISSION DEFINITIONS (from PERMISSIONS.md)
// ═══════════════════════════════════════

interface PermissionCategory {
  nameAr: string;
  permissions: { key: string; label: string }[];
}

// Permission keys use the same canonical "{Module}.{Category}.{Action}" names the
// backend seeds and enforces (DataSeeder / [HasPermission]) and the frontend route
// guards check — so a checked box here is exactly what gates navigation and APIs.
const permissionCategories: PermissionCategory[] = [
  {
    nameAr: 'المبيعات',
    permissions: [
      { key: 'Sales.Invoice.View', label: 'عرض فاتورة بيع' },
      { key: 'Sales.Invoice.Add', label: 'إضافة فاتورة بيع' },
      { key: 'Sales.Invoice.Edit', label: 'تعديل فاتورة بيع' },
      { key: 'Sales.Invoice.Delete', label: 'حذف فاتورة بيع' },
      { key: 'Sales.Invoice.Cancel', label: 'إلغاء فاتورة بيع' },
      { key: 'Sales.Invoice.Approve', label: 'اعتماد فاتورة بيع' },
      { key: 'Sales.Invoice.Print', label: 'طباعة فاتورة بيع' },
      { key: 'Sales.Invoice.ViewCost', label: 'عرض تكلفة فاتورة البيع' },
      { key: 'Sales.Invoice.ViewProfit', label: 'عرض أرباح فاتورة البيع' },
      { key: 'Sales.Return.View', label: 'عرض مرتجع البيع' },
      { key: 'Sales.Return.Add', label: 'إضافة مرتجع البيع' },
      { key: 'Sales.Return.Cancel', label: 'إلغاء مرتجع البيع' },
    ],
  },
  {
    nameAr: 'المشتريات',
    permissions: [
      { key: 'Purchase.Invoice.View', label: 'عرض فاتورة شراء' },
      { key: 'Purchase.Invoice.Add', label: 'إضافة فاتورة شراء' },
      { key: 'Purchase.Invoice.Edit', label: 'تعديل فاتورة شراء' },
      { key: 'Purchase.Invoice.Delete', label: 'حذف فاتورة شراء' },
      { key: 'Purchase.Invoice.Cancel', label: 'إلغاء فاتورة شراء' },
      { key: 'Purchase.Invoice.Approve', label: 'اعتماد فاتورة شراء' },
      { key: 'Purchase.Return.View', label: 'عرض مرتجع الشراء' },
      { key: 'Purchase.Return.Add', label: 'إضافة مرتجع الشراء' },
    ],
  },
  {
    nameAr: 'المخزون',
    permissions: [
      { key: 'Inventory.Item.View', label: 'عرض صنف' },
      { key: 'Inventory.Item.Add', label: 'إضافة صنف' },
      { key: 'Inventory.Item.Edit', label: 'تعديل صنف' },
      { key: 'Inventory.Item.Delete', label: 'حذف صنف' },
      { key: 'Inventory.Item.ViewCost', label: 'عرض تكلفة الصنف' },
      { key: 'Inventory.Movement.View', label: 'عرض حركات المخزون' },
    ],
  },
  {
    nameAr: 'العملاء والموردون',
    permissions: [
      { key: 'Customer.Customer.View', label: 'عرض عميل' },
      { key: 'Customer.Customer.Add', label: 'إضافة عميل' },
      { key: 'Customer.Customer.Edit', label: 'تعديل عميل' },
      { key: 'Customer.Customer.Delete', label: 'حذف عميل' },
      { key: 'Supplier.Supplier.View', label: 'عرض مورد' },
      { key: 'Supplier.Supplier.Add', label: 'إضافة مورد' },
      { key: 'Supplier.Supplier.Edit', label: 'تعديل مورد' },
      { key: 'Supplier.Supplier.Delete', label: 'حذف مورد' },
    ],
  },
  {
    nameAr: 'المحاسبة',
    permissions: [
      { key: 'Accounting.Account.View', label: 'عرض حساب' },
      { key: 'Accounting.Account.Add', label: 'إضافة حساب' },
      { key: 'Accounting.Account.Edit', label: 'تعديل حساب' },
      { key: 'Accounting.JournalEntry.View', label: 'عرض قيد يومي' },
      { key: 'Accounting.JournalEntry.Add', label: 'إضافة قيد يومي' },
      { key: 'Accounting.JournalEntry.Approve', label: 'اعتماد قيد يومي' },
      { key: 'Accounting.TrialBalance.View', label: 'عرض ميزان المراجعة' },
      { key: 'Accounting.GeneralLedger.ViewAccountStatement', label: 'عرض كشف حساب' },
    ],
  },
  {
    nameAr: 'الخزائن والبنوك',
    permissions: [
      { key: 'Cash.Receipt.View', label: 'عرض سند قبض' },
      { key: 'Cash.Receipt.Add', label: 'إضافة سند قبض' },
      { key: 'Cash.Payment.View', label: 'عرض سند صرف' },
      { key: 'Cash.Payment.Add', label: 'إضافة سند صرف' },
      { key: 'Cash.Transfer.View', label: 'عرض تحويل' },
      { key: 'Cash.Transfer.Add', label: 'إضافة تحويل' },
    ],
  },
  {
    nameAr: 'الأصول الثابتة',
    permissions: [
      { key: 'FixedAsset.FixedAsset.View', label: 'عرض أصل ثابت' },
      { key: 'FixedAsset.FixedAsset.Add', label: 'إضافة أصل ثابت' },
      { key: 'FixedAsset.FixedAsset.CalculateDepreciation', label: 'حساب الإهلاك' },
    ],
  },
  {
    nameAr: 'التقارير',
    permissions: [
      { key: 'Reports.Reports.ViewSalesReports', label: 'تقارير المبيعات' },
      { key: 'Reports.Reports.ViewPurchaseReports', label: 'تقارير المشتريات' },
      { key: 'Reports.Reports.ViewInventoryReports', label: 'تقارير المخزون' },
      { key: 'Reports.Reports.ViewProfitReports', label: 'تقارير الأرباح' },
      { key: 'Reports.Reports.ExportReports', label: 'تصدير التقارير' },
    ],
  },
  {
    nameAr: 'إدارة النظام',
    permissions: [
      { key: 'Admin.User.View', label: 'عرض المستخدمين' },
      { key: 'Admin.User.Add', label: 'إضافة مستخدم' },
      { key: 'Admin.User.Edit', label: 'تعديل مستخدم' },
      { key: 'Admin.User.Delete', label: 'حذف مستخدم' },
      { key: 'Reports.Reports.ViewAccountingReports', label: 'عرض سجل الحركات' },
      { key: 'Admin.Permission.ViewMatrix', label: 'عرض مصفوفة الصلاحيات' },
      { key: 'Admin.Permission.ModifyRolePermissions', label: 'تعديل صلاحيات الدور' },
    ],
  },
];

// ═══════════════════════════════════════
//  ROLE PRESETS (UI ONLY)
// ═══════════════════════════════════════
// Selecting a role pre-checks its preset below; the admin can then toggle any box
// before saving. The SAVED permission list — not the role string — is what the
// backend and frontend enforce. Mirrors RolePresets in the backend.
const allPermissionKeys = permissionCategories.flatMap((c) => c.permissions.map((p) => p.key));

const rolePresets: Record<string, string[]> = {
  Admin: allPermissionKeys,
  Accountant: [
    'Accounting.Account.View', 'Accounting.Account.Add', 'Accounting.Account.Edit',
    'Accounting.JournalEntry.View', 'Accounting.JournalEntry.Add', 'Accounting.JournalEntry.Approve',
    'Accounting.GeneralLedger.ViewAccountStatement', 'Accounting.TrialBalance.View',
    'Cash.CashAccount.View', 'Cash.Receipt.View', 'Cash.Receipt.Add', 'Cash.Payment.View', 'Cash.Payment.Add',
    'Cash.Transfer.View', 'Cash.Transfer.Add',
    'FixedAsset.FixedAsset.View',
    'Reports.Reports.ViewAccountingReports', 'Reports.Reports.ViewSalesReports', 'Reports.Reports.ExportReports',
  ],
  SalesManager: [
    'Sales.Invoice.View', 'Sales.Invoice.Add', 'Sales.Invoice.Edit', 'Sales.Invoice.Delete',
    'Sales.Invoice.Cancel', 'Sales.Invoice.Approve', 'Sales.Invoice.Print', 'Sales.Invoice.ViewProfit',
    'Sales.Return.View', 'Sales.Return.Add', 'Sales.Return.Cancel', 'Sales.Return.Approve',
    'Customer.Customer.View', 'Customer.Customer.Add', 'Customer.Customer.Edit',
    'Reports.Reports.ViewSalesReports', 'Reports.Reports.ExportReports',
  ],
  InventoryManager: [
    'Purchase.Invoice.View',
    'Inventory.Item.View', 'Inventory.Item.Add', 'Inventory.Item.Edit', 'Inventory.Item.ViewCost',
    'Inventory.Category.View', 'Inventory.Category.Add',
    'Inventory.Warehouse.View', 'Inventory.Warehouse.Add',
    'Inventory.Movement.View',
    'Inventory.WarehouseReceipt.View', 'Inventory.WarehouseReceipt.Add',
    'Inventory.WarehouseIssue.View', 'Inventory.WarehouseIssue.Add',
    'Inventory.WarehouseTransfer.View', 'Inventory.WarehouseTransfer.Add',
    'Inventory.StockCount.View', 'Inventory.StockCount.Add',
    'Inventory.StockAdjustment.View', 'Inventory.StockAdjustment.Add',
    'Reports.Reports.ViewInventoryReports', 'Reports.Reports.ViewPurchaseReports',
  ],
  Cashier: [
    'Sales.Invoice.View',
    'Customer.Customer.View',
    'Cash.Receipt.View', 'Cash.Receipt.Add', 'Cash.Receipt.Print',
    'Cash.Payment.View', 'Cash.Payment.Add', 'Cash.Payment.Print',
    'Cash.CashAccount.View', 'Cash.CashAccount.ViewBalance',
    'Cash.Transfer.View', 'Cash.Transfer.Add',
  ],
};

const roles = ['Admin', 'Accountant', 'SalesManager', 'InventoryManager', 'Cashier'];
const roleColors: Record<string, string> = {
  Admin: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  Accountant: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  SalesManager: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  InventoryManager: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Cashier: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
};

// ═══════════════════════════════════════
//  PERMISSION MATRIX COMPONENT
// ═══════════════════════════════════════

const PermissionMatrix: React.FC<{
  permissions: string[];
  onChange: (perms: string[]) => void;
  disabled?: boolean;
}> = ({ permissions, onChange, disabled }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const toggleCategory = (idx: number) => {
    setExpandedCategories(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const togglePermission = (key: string) => {
    if (disabled) return;
    onChange(
      permissions.includes(key)
        ? permissions.filter(p => p !== key)
        : [...permissions, key]
    );
  };

  const toggleAllInCategory = (category: PermissionCategory) => {
    if (disabled) return;
    const allKeys = category.permissions.map(p => p.key);
    const allSelected = allKeys.every(k => permissions.includes(k));
    if (allSelected) {
      onChange(permissions.filter(p => !allKeys.includes(p)));
    } else {
      onChange([...new Set([...permissions, ...allKeys])]);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
        <Shield size={14} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">الصلاحيات التفصيلية</span>
        <span className="text-[10px] text-muted-foreground mr-auto">{permissions.length} محددة</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {permissionCategories.map((cat, catIdx) => {
          const allSelected = cat.permissions.every(p => permissions.includes(p.key));
          const someSelected = cat.permissions.some(p => permissions.includes(p.key));
          const isExpanded = expandedCategories[catIdx] ?? false;

          return (
            <div key={catIdx} className="border-b border-border last:border-b-0">
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => toggleCategory(catIdx)}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={() => toggleAllInCategory(cat)}
                  onClick={e => e.stopPropagation()}
                  disabled={disabled}
                  className="rounded border-border bg-background text-primary focus:ring-ring"
                />
                <span className="text-xs font-semibold text-foreground flex-1">{cat.nameAr}</span>
                <span className="text-[10px] text-muted-foreground">
                  {cat.permissions.filter(p => permissions.includes(p.key)).length}/{cat.permissions.length}
                </span>
                {isExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
              </div>
              {isExpanded && (
                <div className="px-3 py-2 grid grid-cols-2 gap-1 bg-background/50">
                  {cat.permissions.map(perm => (
                    <label
                      key={perm.key}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/30'}`}
                    >
                      <input
                        type="checkbox"
                        checked={permissions.includes(perm.key)}
                        onChange={() => togglePermission(perm.key)}
                        disabled={disabled}
                        className="rounded border-border bg-background text-primary focus:ring-ring"
                      />
                      <span className="text-muted-foreground">{perm.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
//  USERS PAGE
// ═══════════════════════════════════════

export const Users: React.FC = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState<User | null>(null);

  const [form, setForm] = useState({ fullName: '', username: '', password: '', role: 'Accountant', permissions: [] as string[] });
  const [editForm, setEditForm] = useState({ fullName: '', role: 'Accountant', isActive: true, permissions: [] as string[] });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api.get<User[]>('/api/users').then(r => r.data);
      setUsers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.username.trim() || !form.password) {
      addToast('error', 'الاسم الكامل واسم المستخدم وكلمة المرور مطلوبة.');
      return;
    }
    // Mirror the RegisterRequest validation attributes so the server never has to
    // reject a payload the UI already knows is invalid (which would surface as an
    // opaque 400 ValidationProblemDetails). MaxLength counts the raw value exactly
    // as the server does; [Required] only rejects null/empty, so presence is
    // checked on the trimmed value.
    if (form.fullName.length > 200) {
      addToast('error', 'الاسم الكامل يجب ألا يتجاوز 200 حرف.');
      return;
    }
    if (form.username.length > 100) {
      addToast('error', 'اسم المستخدم يجب ألا يتجاوز 100 حرف.');
      return;
    }
    if (form.password.length < 6) {
      addToast('error', 'كلمة المرور يجب ألا تقل عن 6 أحرف.');
      return;
    }
    try {
      await api.post('/api/users', form);
      setShowCreateModal(false);
      setForm({ fullName: '', username: '', password: '', role: 'Accountant', permissions: [] });
      addToast('success', 'تم إنشاء المستخدم بنجاح.');
      await loadUsers();
    } catch (err) {
      addToast('error', getApiErrorMessage(err, 'فشل في إنشاء المستخدم.'));
    }
  };

  const handleEdit = async () => {
    if (!showEditModal) return;
    try {
      await api.put(`/api/users/${showEditModal.id}`, editForm);
      setShowEditModal(null);
      addToast('success', 'تم تحديث المستخدم بنجاح.');
      await loadUsers();
    } catch (err) {
      addToast('error', getApiErrorMessage(err, 'فشل في تحديث المستخدم.'));
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.post(`/api/users/${id}/toggle-active`);
      addToast('success', 'تم تغيير حالة المستخدم.');
      await loadUsers();
    } catch (err) {
      addToast('error', getApiErrorMessage(err, 'فشل.'));
    }
  };

  const handleResetPassword = async () => {
    if (!showResetModal || !newPassword) return;
    // ResetPasswordRequest also enforces MinLength(6); reject short passwords
    // before the server turns them into an opaque validation error.
    if (newPassword.length < 6) {
      addToast('error', 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.');
      return;
    }
    try {
      await api.post(`/api/users/${showResetModal.id}/reset-password`, { newPassword });
      setShowResetModal(null);
      setNewPassword('');
      addToast('success', 'تم إعادة تعيين كلمة المرور بنجاح.');
    } catch (err) {
      addToast('error', getApiErrorMessage(err, 'فشل في إعادة تعيين كلمة المرور.'));
    }
  };

  const shortId = (id: string) => id.slice(0, 8).toUpperCase();

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">جاري تحميل المستخدمين...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المستخدمون والأدوار</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة مستخدمي النظام والأدوار وصلاحيات الوصول</p>
        </div>
        <button onClick={() => { setShowCreateModal(true); }}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">+ مستخدم جديد
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border text-card-foreground rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الرمز</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">اسم المستخدم</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الاسم الكامل</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الدور</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الصلاحيات</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{shortId(user.id)}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm text-foreground">{user.username}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-foreground">{user.fullName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColors[user.role] || 'bg-muted text-muted-foreground border-border'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-muted-foreground">{user.permissions?.length || 0} صلاحية</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}>{user.isActive ? 'نشط' : 'غير نشط'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.username === 'admin' ? (
                      <span className="text-xs text-muted-foreground italic">محمي</span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setShowEditModal(user); setEditForm({ fullName: user.fullName, role: user.role, isActive: user.isActive, permissions: user.permissions || [] }); }}
                          className="px-3 py-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 border border-primary/30 rounded transition-colors">تعديل</button>
                        <button onClick={() => setShowResetModal(user)}
                          className="px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-500 bg-amber-500/15 border border-amber-500/30 rounded transition-colors">إعادة تعيين</button>
                        <button onClick={() => handleToggleActive(user.id)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${user.isActive ? 'text-rose-600 dark:text-rose-400 hover:text-rose-500 bg-rose-500/15 border border-rose-500/30' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 bg-emerald-500/15 border border-emerald-500/30'}`}>{user.isActive ? 'تعطيل' : 'تفعيل'}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">إنشاء مستخدم جديد</h2>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم الكامل *</label>
                  <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} maxLength={200}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">اسم المستخدم *</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} maxLength={100}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">كلمة المرور *</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={6}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الدور</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value, permissions: rolePresets[e.target.value] ?? form.permissions })}
                    title="اختيار الدور يحدد الصلاحيات تلقائياً ويمكنك تعديلها يدوياً"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <PermissionMatrix permissions={form.permissions} onChange={perms => setForm({ ...form, permissions: perms })} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg">إلغاء</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg">إنشاء مستخدم</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">تعديل المستخدم — {showEditModal.username}</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم الكامل</label>
                <input type="text" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الدور</label>
                  {showEditModal.username === 'admin' ? (
                    <input type="text" value={editForm.role} disabled
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground opacity-60 cursor-not-allowed" />
                  ) : (
                    <select
                      value={editForm.role}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value, permissions: rolePresets[e.target.value] ?? editForm.permissions })}
                      title="اختيار الدور يحدد الصلاحيات تلقائياً ويمكنك تعديلها يدوياً"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2 pb-2">
                    <input type="checkbox" checked={editForm.isActive} disabled={showEditModal.username === 'admin'}
                      onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="rounded border-border bg-background text-primary focus:ring-ring disabled:opacity-50" />
                    <label className="text-sm text-muted-foreground">نشط {showEditModal.username === 'admin' && '(محمي)'}</label>
                  </div>
                </div>
              </div>
            </div>
            <PermissionMatrix
              permissions={editForm.permissions}
              onChange={perms => setEditForm({ ...editForm, permissions: perms })}
              disabled={showEditModal.username === 'admin'}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEditModal(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg">إلغاء</button>
              <button onClick={handleEdit} className="px-4 py-2 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg">حفظ التغييرات</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border text-card-foreground rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-foreground mb-2">إعادة تعيين كلمة المرور</h2>
            <p className="text-sm text-muted-foreground mb-4">للمستخدم: <span className="font-mono text-foreground">{showResetModal.username}</span></p>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">كلمة المرور الجديدة</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowResetModal(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg">إلغاء</button>
              <button onClick={handleResetPassword} className="px-4 py-2 text-sm text-primary-foreground bg-amber-600 hover:bg-amber-500 rounded-lg">إعادة التعيين</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
