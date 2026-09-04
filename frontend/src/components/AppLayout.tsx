import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import {
  LayoutDashboard,
  GitFork,
  BookOpen,
  Wallet,
  Building2,
  ShoppingCart,
  ShoppingBag,
  Package,
  Users,
  FileSpreadsheet,
  UserCheck,
  ShieldAlert,
  Sun,
  Moon,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  ChevronDown,
  Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════
//  NAVIGATION TYPES & DATA
// ═══════════════════════════════════════

type NavItem =
  | { type: 'divider'; label: string; permission?: string }
  | { type: 'item'; to: string; label: string; icon: LucideIcon; end?: boolean; permission?: string };

type NavGroup = { title: string; items: NavItem[]; permission?: string };

const navigation: NavGroup[] = [
  {
    title: '',
    items: [
      { type: 'item', to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'المحاسبة والمالية',
    items: [
      { type: 'item', to: '/accounting/accounts', label: 'شجرة الحسابات', icon: GitFork, end: true, permission: 'Accounting.Account.View' },
      { type: 'item', to: '/accounting/journal-entries', label: 'القيود اليومية', icon: BookOpen, end: true, permission: 'Accounting.JournalEntry.View' },
      { type: 'item', to: '/cash/treasuries', label: 'الخزائن والبنوك', icon: Wallet, end: true, permission: 'Cash.CashAccount.View' },
      { type: 'item', to: '/assets', label: 'الأصول الثابتة', icon: Building2, end: true, permission: 'FixedAsset.FixedAsset.View' },
      { type: 'item', to: '/assets/depreciation', label: 'الإهلاك', icon: Building2, end: true, permission: 'FixedAsset.FixedAsset.CalculateDepreciation' },
    ],
  },
  {
    title: 'العمليات التجارية',
    items: [
      { type: 'item', to: '/sales/invoices', label: 'المبيعات والفواتير', icon: ShoppingCart, end: true, permission: 'Sales.SalesInvoice.View' },
      { type: 'item', to: '/sales/customers', label: 'العملاء', icon: Users, end: true, permission: 'Customer.Customer.View' },
      { type: 'item', to: '/sales/returns', label: 'مرتجعات المبيعات', icon: ShoppingCart, end: true, permission: 'Sales.SalesReturn.View' },
      { type: 'item', to: '/purchases/invoices', label: 'المشتريات والطلبيات', icon: ShoppingBag, end: true, permission: 'Purchase.PurchaseInvoice.View' },
      { type: 'item', to: '/purchases/suppliers', label: 'الموردون', icon: Users, end: true, permission: 'Supplier.Supplier.View' },
      { type: 'item', to: '/purchases/returns', label: 'مرتجعات المشتريات', icon: ShoppingBag, end: true, permission: 'Purchase.PurchaseReturn.View' },
      { type: 'item', to: '/inventory/products', label: 'إدارة المخزون', icon: Package, end: true, permission: 'Inventory.Item.View' },
      { type: 'item', to: '/inventory/stock-movements', label: 'حركات المخزون', icon: Package, end: true, permission: 'Inventory.Movement.View' },
      { type: 'item', to: '/cash/vouchers', label: 'سندات القبض والصرف', icon: Wallet, end: true, permission: 'Cash.Receipt.View' },
      { type: 'item', to: '/cash/transfers', label: 'التحويلات الداخلية', icon: Wallet, end: true, permission: 'Cash.Transfer.View' },
    ],
  },
  {
    title: 'التقارير والإدارة',
    items: [
      { type: 'item', to: '/reports', label: 'التقارير المالية', icon: FileSpreadsheet, end: true, permission: 'Reports.Reports.ViewSalesReports' },
      { type: 'item', to: '/reports/trial-balance', label: 'ميزان المراجعة', icon: FileSpreadsheet, end: true, permission: 'Accounting.TrialBalance.View' },
      { type: 'item', to: '/reports/income-statement', label: 'قائمة الدخل', icon: FileSpreadsheet, end: true, permission: 'Reports.Reports.ViewAccountingReports' },
      { type: 'item', to: '/reports/balance-sheet', label: 'الميزانية العمومية', icon: FileSpreadsheet, end: true, permission: 'Reports.Reports.ViewAccountingReports' },
      { type: 'item', to: '/reports/account-statement', label: 'كشف حساب', icon: FileSpreadsheet, end: true, permission: 'Accounting.GeneralLedger.ViewAccountStatement' },
    ],
  },
  {
    title: 'إعدادات النظام',
    permission: 'Admin.User.View',
    items: [
      { type: 'item', to: '/settings/users', label: 'إدارة المستخدمين', icon: UserCheck, permission: 'Admin.User.View', end: true },
      { type: 'item', to: '/settings/audit-logs', label: 'سجل الحركات', icon: ShieldAlert, permission: 'Reports.Reports.ViewAccountingReports', end: true },
    ],
  },
];

// ═══════════════════════════════════════
//  ROLE LABELS IN ARABIC
// ═══════════════════════════════════════

const roleLabelsAr: Record<string, string> = {
  Admin: 'مدير النظام',
  Accountant: 'محاسب',
  SalesManager: 'مدير المبيعات',
  InventoryManager: 'مدير المخزون',
  Cashier: 'أمين صندوق',
};

// ═══════════════════════════════════════
//  SIDEBAR COMPONENT
// ═══════════════════════════════════════

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const { user, hasPermission } = useAuthStore();

  const filteredNav = navigation
    .filter((g) => !g.permission || hasPermission(g.permission))
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) => !item.permission || hasPermission(item.permission)
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-40 flex flex-col border-l transition-all duration-300 ${
        open ? 'w-64' : 'w-[4.25rem]'
      }`}
      style={{
        backgroundColor: 'hsl(222.2, 84%, 4.9%)',
        borderColor: 'hsl(217.2, 32.6%, 17.5%)',
      }}
    >
      {/* ═══ Logo ═══ */}
      <div
        className="h-16 flex items-center px-4 border-b shrink-0 gap-3"
        style={{ borderColor: 'hsl(217.2, 32.6%, 17.5%)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
          style={{
            backgroundColor: 'hsl(238, 84%, 59%)',
            color: 'hsl(0, 0%, 100%)',
            boxShadow: '0 4px 12px hsl(238, 84%, 59% / 0.3)',
          }}
        >
          ERP
        </div>
        {open && (
          <div className="overflow-hidden">
            <span className="text-sm font-bold text-white whitespace-nowrap block leading-tight">
              نظام ERP
            </span>
            <span className="text-[10px] font-mono leading-none text-slate-500">
              V1.0 ليبيا
            </span>
          </div>
        )}
      </div>

      {/* ═══ Navigation ═══ */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((group, gIdx) => (
          <div key={gIdx} className={gIdx > 0 ? 'pt-3' : ''}>
            {/* Group Title */}
            {group.title && open && (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.title}
              </div>
            )}
            {group.title && !open && gIdx > 0 && (
              <div className="flex justify-center py-2">
                <div className="w-6 border-t border-slate-700/50" />
              </div>
            )}

            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.type !== 'item') return null;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                        open ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
                      } ${
                        isActive
                          ? 'bg-[hsl(238,84%,59%)] text-white shadow-lg shadow-[hsl(238,84%,59%/0.25)] font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-[hsl(217.2,32.6%,17.5%)]'
                      }`
                    }
                    title={!open ? item.label : undefined}
                  >
                    <Icon
                      size={20}
                      className="shrink-0"
                      strokeWidth={2}
                    />
                    {open && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ═══ User Info ═══ */}
      <div
        className="border-t p-3 shrink-0"
        style={{ borderColor: 'hsl(217.2, 32.6%, 17.5%)' }}
      >
        {open ? (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
              style={{
                backgroundColor: 'hsl(238, 84%, 59% / 0.15)',
                color: 'hsl(238, 84%, 59%)',
              }}
            >
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'م'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.fullName || 'مستخدم'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {roleLabelsAr[user?.role || ''] || user?.role || ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: 'hsl(238, 84%, 59% / 0.15)',
                color: 'hsl(238, 84%, 59%)',
              }}
            >
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'م'}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Collapse Toggle ═══ */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-20 z-50 w-6 h-6 rounded-full flex items-center justify-center border transition-colors hover:bg-slate-800"
        style={{
          backgroundColor: 'hsl(222.2, 84%, 4.9%)',
          borderColor: 'hsl(217.2, 32.6%, 17.5%)',
          color: 'hsl(210, 40%, 98%)',
        }}
        title={open ? 'طيّ القائمة' : 'توسيع القائمة'}
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
};

// ═══════════════════════════════════════
//  APP LAYOUT
// ═══════════════════════════════════════

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, refreshToken, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const userInitial = user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'م';
  const userRoleAr = roleLabelsAr[user?.role || ''] || user?.role || '';

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary selection:text-primary-foreground">
      {/* ═══ SIDEBAR ═══ */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* ═══ MAIN CONTENT ═══ */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'mr-64' : 'mr-[4.25rem]'
        }`}
      >
        {/* ═══ TOPBAR ═══ */}
        <header
          className="h-16 sticky top-0 z-30 flex items-center justify-between px-6 border-b"
          style={{
            backgroundColor: 'hsl(var(--background) / 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderColor: 'hsl(var(--border))',
          }}
        >
          {/* Right Side (RTL Start) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg transition-300 hover:bg-accent"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              title={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            >
              <Menu size={20} />
            </button>
            {user?.companyName && (
              <span
                className="hidden md:inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border truncate max-w-[160px]"
                style={{
                  backgroundColor: 'hsl(142, 76%, 36% / 0.1)',
                  color: 'hsl(142, 76%, 36%)',
                  borderColor: 'hsl(142, 76%, 36% / 0.2)',
                }}
                title={`${user.companyName}${user.branchName ? ` — ${user.branchName}` : ''}`}
              >
                {user.companyName}{user.branchName ? ` — ${user.branchName}` : ''}
              </span>
            )}
            <span
              className="hidden sm:inline-flex px-2.5 py-1 text-xs font-semibold font-mono rounded-full border"
              style={{
                backgroundColor: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--primary))',
                borderColor: 'hsl(var(--primary) / 0.2)',
              }}
            >
              ليبيا (د.ل)
            </span>
          </div>

          {/* Left Side (RTL End) */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors hover:bg-accent"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg transition-colors hover:bg-accent"
                style={{ color: 'hsl(var(--muted-foreground))' }}
                title="الإشعارات"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              {notificationsOpen && (
                <div
                  className="absolute left-0 mt-2 w-72 rounded-xl shadow-2xl border py-2 z-50"
                  style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                >
                  <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
                    <span className="text-sm font-bold" style={{ color: 'hsl(var(--popover-foreground))' }}>الإشعارات</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-500 font-semibold">3 جديدة</span>
                  </div>
                  <div className="py-1 max-h-64 overflow-y-auto">
                    <div className="px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors">
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--popover-foreground))' }}>ترحيل قيد يومي</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>تم ترحيل القيد JE-202608-0001 بنجاح</p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>منذ 5 دقائق</p>
                    </div>
                    <div className="px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors">
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--popover-foreground))' }}>فاتورة بيع جديدة</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>تم إنشاء فاتورة البيع SO-202608-0012</p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>منذ 15 دقيقة</p>
                    </div>
                    <div className="px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors">
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--popover-foreground))' }}>تنبيه مخزون</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>الصنف WGT-001 وصل للحد الأدنى</p>
                      <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>منذ ساعة</p>
                    </div>
                  </div>
                  <div className="border-t px-4 py-2" style={{ borderColor: 'hsl(var(--border))' }}>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="w-full text-center text-xs font-semibold py-1 rounded hover:bg-accent transition-colors"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      عرض الكل
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--border))' }} />

            {/* User Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-accent"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                  style={{
                    backgroundColor: 'hsl(var(--primary) / 0.15)',
                    color: 'hsl(var(--primary))',
                  }}
                >
                  {userInitial}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'hsl(var(--foreground))' }}>
                    {user?.fullName || 'مستخدم'}
                  </p>
                  <p className="text-[10px] leading-tight" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {userRoleAr}
                  </p>
                </div>
                <ChevronDown size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
              </button>

              {profileOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 rounded-xl shadow-2xl border py-2 z-50"
                  style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                    <p className="text-sm font-bold" style={{ color: 'hsl(var(--popover-foreground))' }}>
                      {user?.fullName || 'مستخدم'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {user?.username} — {userRoleAr}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/settings/users');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
                      style={{ color: 'hsl(var(--popover-foreground))' }}
                    >
                      <User size={16} />
                      <span>الملف الشخصي</span>
                    </button>
                  </div>

                  <div className="border-t pt-1" style={{ borderColor: 'hsl(var(--border))' }}>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-destructive/10"
                      style={{ color: 'hsl(var(--destructive))' }}
                    >
                      <LogOut size={16} />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>


      </div>
    </div>
  );
};
