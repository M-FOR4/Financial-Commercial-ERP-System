import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../components/Toast';
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

const permissionCategories: PermissionCategory[] = [
  {
    nameAr: 'المبيعات',
    permissions: [
      { key: 'View Sales Invoice', label: 'عرض فاتورة بيع' },
      { key: 'Add Sales Invoice', label: 'إضافة فاتورة بيع' },
      { key: 'Edit Sales Invoice', label: 'تعديل فاتورة بيع' },
      { key: 'Delete Sales Invoice', label: 'حذف فاتورة بيع' },
      { key: 'Cancel Sales Invoice', label: 'إلغاء فاتورة بيع' },
      { key: 'Approve Sales Invoice', label: 'اعتماد فاتورة بيع' },
      { key: 'Print Sales Invoice', label: 'طباعة فاتورة بيع' },
      { key: 'View Sales Invoice Cost', label: 'عرض تكلفة فاتورة البيع' },
      { key: 'View Sales Invoice Profit', label: 'عرض أرباح فاتورة البيع' },
      { key: 'View Sales Return', label: 'عرض مرتجع البيع' },
      { key: 'Add Sales Return', label: 'إضافة مرتجع البيع' },
      { key: 'Cancel Sales Return', label: 'إلغاء مرتجع البيع' },
    ],
  },
  {
    nameAr: 'المشتريات',
    permissions: [
      { key: 'View Purchase Invoice', label: 'عرض فاتورة شراء' },
      { key: 'Add Purchase Invoice', label: 'إضافة فاتورة شراء' },
      { key: 'Edit Purchase Invoice', label: 'تعديل فاتورة شراء' },
      { key: 'Delete Purchase Invoice', label: 'حذف فاتورة شراء' },
      { key: 'Cancel Purchase Invoice', label: 'إلغاء فاتورة شراء' },
      { key: 'Approve Purchase Invoice', label: 'اعتماد فاتورة شراء' },
      { key: 'View Purchase Return', label: 'عرض مرتجع الشراء' },
      { key: 'Add Purchase Return', label: 'إضافة مرتجع الشراء' },
    ],
  },
  {
    nameAr: 'المخزون',
    permissions: [
      { key: 'View Item', label: 'عرض صنف' },
      { key: 'Add Item', label: 'إضافة صنف' },
      { key: 'Edit Item', label: 'تعديل صنف' },
      { key: 'Delete Item', label: 'حذف صنف' },
      { key: 'View Item Cost', label: 'عرض تكلفة الصنف' },
      { key: 'View Inventory Movement', label: 'عرض حركات المخزون' },
    ],
  },
  {
    nameAr: 'العملاء والموردون',
    permissions: [
      { key: 'View Customer', label: 'عرض عميل' },
      { key: 'Add Customer', label: 'إضافة عميل' },
      { key: 'Edit Customer', label: 'تعديل عميل' },
      { key: 'Delete Customer', label: 'حذف عميل' },
      { key: 'View Supplier', label: 'عرض مورد' },
      { key: 'Add Supplier', label: 'إضافة مورد' },
      { key: 'Edit Supplier', label: 'تعديل مورد' },
      { key: 'Delete Supplier', label: 'حذف مورد' },
    ],
  },
  {
    nameAr: 'المحاسبة',
    permissions: [
      { key: 'View Account', label: 'عرض حساب' },
      { key: 'Add Account', label: 'إضافة حساب' },
      { key: 'Edit Account', label: 'تعديل حساب' },
      { key: 'View Journal Entry', label: 'عرض قيد يومي' },
      { key: 'Add Journal Entry', label: 'إضافة قيد يومي' },
      { key: 'Approve Journal Entry', label: 'اعتماد قيد يومي' },
      { key: 'View Trial Balance', label: 'عرض ميزان المراجعة' },
      { key: 'View Account Statement', label: 'عرض كشف حساب' },
    ],
  },
  {
    nameAr: 'الخزائن والبنوك',
    permissions: [
      { key: 'View Receipt', label: 'عرض سند قبض' },
      { key: 'Add Receipt', label: 'إضافة سند قبض' },
      { key: 'View Payment', label: 'عرض سند صرف' },
      { key: 'Add Payment', label: 'إضافة سند صرف' },
      { key: 'View Transfer', label: 'عرض تحويل' },
      { key: 'Add Transfer', label: 'إضافة تحويل' },
    ],
  },
  {
    nameAr: 'الأصول الثابتة',
    permissions: [
      { key: 'View Fixed Asset', label: 'عرض أصل ثابت' },
      { key: 'Add Fixed Asset', label: 'إضافة أصل ثابت' },
      { key: 'Calculate Depreciation', label: 'حساب الإهلاك' },
    ],
  },
  {
    nameAr: 'التقارير',
    permissions: [
      { key: 'View Sales Reports', label: 'تقارير المبيعات' },
      { key: 'View Purchase Reports', label: 'تقارير المشتريات' },
      { key: 'View Inventory Reports', label: 'التقارير المالية' },
      { key: 'View Profit Reports', label: 'تقارير الأرباح' },
      { key: 'Export Reports', label: 'تصدير التقارير' },
    ],
  },
  {
    nameAr: 'إدارة النظام',
    permissions: [
      { key: 'View User', label: 'عرض المستخدمين' },
      { key: 'Add User', label: 'إضافة مستخدم' },
      { key: 'Edit User', label: 'تعديل مستخدم' },
      { key: 'Delete User', label: 'حذف مستخدم' },
      { key: 'View Audit Logs', label: 'عرض سجل الحركات' },
      { key: 'View Permission Matrix', label: 'عرض مصفوفة الصلاحيات' },
      { key: 'Modify Role Permissions', label: 'تعديل صلاحيات الدور' },
    ],
  },
];

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
    if (!form.fullName || !form.username || !form.password) {
      addToast('error', 'الاسم الكامل واسم المستخدم وكلمة المرور مطلوبة.');
      return;
    }
    try {
      await api.post('/api/users', form);
      setShowCreateModal(false);
      setForm({ fullName: '', username: '', password: '', role: 'Accountant', permissions: [] });
      addToast('success', 'تم إنشاء المستخدم بنجاح.');
      await loadUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'فشل في إنشاء المستخدم.');
    }
  };

  const handleEdit = async () => {
    if (!showEditModal) return;
    try {
      await api.put(`/api/users/${showEditModal.id}`, editForm);
      setShowEditModal(null);
      addToast('success', 'تم تحديث المستخدم بنجاح.');
      await loadUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'فشل في تحديث المستخدم.');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.post(`/api/users/${id}/toggle-active`);
      addToast('success', 'تم تغيير حالة المستخدم.');
      await loadUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'فشل.');
    }
  };

  const handleResetPassword = async () => {
    if (!showResetModal || !newPassword) return;
    try {
      await api.post(`/api/users/${showResetModal.id}/reset-password`, { newPassword });
      setShowResetModal(null);
      setNewPassword('');
      addToast('success', 'تم إعادة تعيين كلمة المرور بنجاح.');
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'فشل.');
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
                  <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">اسم المستخدم *</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">كلمة المرور *</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الدور</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
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
                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
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
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
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
