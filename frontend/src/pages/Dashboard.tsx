import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { reportsApi, type DashboardKpiResponse } from '../services/reportsApi';
import { salesApi, type SalesInvoiceDto } from '../services/salesApi';
import { purchasesApi, type PurchaseInvoiceDto } from '../services/purchasesApi';
import { formatCurrency, formatDate } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  ShoppingCart, ShoppingBag, Wallet, Package, FileSpreadsheet, Users,
  TrendingUp, TrendingDown,  AlertCircle,
  ArrowUpRight, ArrowDownRight, Receipt, CreditCard,
} from 'lucide-react';



// ═══════════════════════════════════════
//  KPI CARD COMPONENT
// ═══════════════════════════════════════

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, trend, color }) => (
  <div className="bg-card border border-border text-card-foreground rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    </div>
    <div className="text-2xl font-bold font-mono text-foreground">{value}</div>
    <div className="flex items-center justify-between mt-2">
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      {trend && (
        <span className={`text-xs font-semibold flex items-center gap-1 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend.value)}%
        </span>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════
//  QUICK ACTION BUTTON
// ═══════════════════════════════════════

interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, icon, path, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all group ${color}`}
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </button>
  );
};

// ═══════════════════════════════════════
//  CUSTOM TOOLTIP
// ═══════════════════════════════════════

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKpiResponse>({
    queryKey: ['dashboard-kpis'],
    queryFn: reportsApi.getDashboardKpis,
    staleTime: 60_000,
  });

  // Fetch recent sales invoices
  const { data: recentSales = [] } = useQuery<SalesInvoiceDto[]>({
    queryKey: ['recent-sales'],
    queryFn: () => salesApi.getInvoices(),
    staleTime: 60_000,
  });

  // Fetch recent purchase invoices
  const { data: recentPurchases = [] } = useQuery<PurchaseInvoiceDto[]>({
    queryKey: ['recent-purchases'],
    queryFn: () => purchasesApi.getInvoices(),
    staleTime: 60_000,
  });

  // Prepare chart data — group invoices by month
  const chartData = React.useMemo(() => {
    const months: Record<string, { month: string; sales: number; purchases: number }> = {};
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    recentSales.forEach(inv => {
      const d = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { month: monthNames[d.getMonth()], sales: 0, purchases: 0 };
      if (inv.status === 'Posted') months[key].sales += inv.totalAmount;
    });

    recentPurchases.forEach(inv => {
      const d = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { month: monthNames[d.getMonth()], sales: 0, purchases: 0 };
      if (inv.status === 'Posted') months[key].purchases += inv.totalAmount;
    });

    return Object.values(months).sort((a, b) => {
      const aIdx = monthNames.indexOf(a.month);
      const bIdx = monthNames.indexOf(b.month);
      return aIdx - bIdx;
    });
  }, [recentSales, recentPurchases]);

  // Pie chart data — revenue vs expenses
  const pieData = React.useMemo(() => {
    if (!kpis) return [];
    return [
      { name: 'الإيرادات', value: kpis.totalRevenue || 0 },
      { name: 'التكاليف', value: kpis.totalExpenses || 0 },
    ].filter(d => d.value > 0);
  }, [kpis]);

  const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(238, 84%, 59%)'];

  // Recent transactions — merge and sort by date
  const recentTransactions = React.useMemo(() => {
    const salesTx = recentSales.slice(0, 5).map(inv => ({
      id: inv.id,
      date: inv.invoiceDate,
      type: 'sale' as const,
      reference: inv.invoiceNumber,
      party: inv.customerName,
      amount: inv.totalAmount,
      status: inv.status,
      statusName: inv.statusName,
    }));
    const purchaseTx = recentPurchases.slice(0, 5).map(inv => ({
      id: inv.id,
      date: inv.invoiceDate,
      type: 'purchase' as const,
      reference: inv.invoiceNumber,
      party: inv.supplierName,
      amount: inv.totalAmount,
      status: inv.status,
      statusName: inv.statusName,
    }));
    return [...salesTx, ...purchaseTx]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [recentSales, recentPurchases]);

  const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    Draft: { bg: 'bg-amber-500/15', text: 'text-amber-500', border: 'border-amber-500/30' },
    Posted: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-emerald-500/30' },
    Cancelled: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
  };

  return (
    <div className="space-y-6">
      {/* ═══ Welcome Card ═══ */}
      <div className="bg-card border border-border text-card-foreground rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-2xl">
              {user?.fullName?.charAt(0) || 'م'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">مرحباً {user?.fullName || 'مستخدم النظام'}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                لوحة التحكم التنفيذية — {new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="text-left">
            <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-primary/15 text-primary border border-primary/30">
              {user?.role === 'Admin' ? 'مدير النظام' : user?.role || 'مستخدم'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ KPI Cards ═══ */}
      {kpisLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-muted rounded w-20 mb-3" />
              <div className="h-7 bg-muted rounded w-32 mb-2" />
              <div className="h-2 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="إجمالي المبيعات"
            value={formatCurrency(kpis?.totalRevenue || 0)}
            subtitle="د.ل"
            icon={<ShoppingCart size={18} className="text-emerald-500" />}
            color="bg-emerald-500/10"
          />
          <KpiCard
            title="إجمالي المشتريات"
            value={formatCurrency(kpis?.totalExpenses || 0)}
            subtitle="د.ل"
            icon={<ShoppingBag size={18} className="text-sky-500" />}
            color="bg-sky-500/10"
          />
          <KpiCard
            title="صافي الربح"
            value={formatCurrency(kpis?.netProfit || 0)}
            subtitle="د.ل"
            icon={kpis && kpis.netProfit >= 0 ? <TrendingUp size={18} className="text-emerald-500" /> : <TrendingDown size={18} className="text-red-500" />}
            color={kpis && kpis.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
          />
          <KpiCard
            title="الرصيد النقدي"
            value={formatCurrency(kpis?.totalCashBalance || 0)}
            subtitle="د.ل — الخزائن والبنوك"
            icon={<Wallet size={18} className="text-amber-500" />}
            color="bg-amber-500/10"
          />
        </div>
      )}

      {/* ═══ Secondary KPIs ═══ */}
      {!kpisLoading && kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border text-card-foreground rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground block">العملاء</span>
            <span className="text-lg font-bold text-foreground">{kpis.totalCustomers}</span>
          </div>
          <div className="bg-card border border-border text-card-foreground rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground block">الموردون</span>
            <span className="text-lg font-bold text-foreground">{kpis.totalSuppliers}</span>
          </div>
          <div className="bg-card border border-border text-card-foreground rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground block">الأصناف</span>
            <span className="text-lg font-bold text-foreground">{kpis.totalProducts}</span>
          </div>
          <div className="bg-card border border-border text-card-foreground rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground block">الأصول الإجمالية</span>
            <span className="text-lg font-bold font-mono text-foreground">{formatCurrency(kpis.totalAssets)}</span>
          </div>
        </div>
      )}

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Purchases Bar Chart */}
        <div className="lg:col-span-2 bg-card border border-border text-card-foreground rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">اتجاهات المبيعات والمشتريات الشهرية</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sales" name="المبيعات" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="المشتريات" fill="hsl(238, 84%, 59%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              لا توجد بيانات كافية للعرض
            </div>
          )}
        </div>

        {/* Revenue vs Expenses Pie Chart */}
        <div className="bg-card border border-border text-card-foreground rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">نسبة الإيرادات والتكاليف</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => [formatCurrency(Number(value)), '']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              لا توجد بيانات كافية
            </div>
          )}
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <div className="bg-card border border-border text-card-foreground rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction label="فاتورة مبيعات جديدة" icon={<ShoppingCart size={18} />} path="/sales/invoices" color="" />
          <QuickAction label="فاتورة شراء جديدة" icon={<ShoppingBag size={18} />} path="/purchases/invoices" color="" />
          <QuickAction label="سند قبض / صرف" icon={<Receipt size={18} />} path="/cash/vouchers" color="" />
          <QuickAction label="إضافة صنف" icon={<Package size={18} />} path="/inventory/products" color="" />
          <QuickAction label="العملاء" icon={<Users size={18} />} path="/sales/customers" color="" />
          <QuickAction label="الموردون" icon={<Users size={18} />} path="/purchases/suppliers" color="" />
          <QuickAction label="تقرير مالي" icon={<FileSpreadsheet size={18} />} path="/reports" color="" />
          <QuickAction label="ميزان المراجعة" icon={<CreditCard size={18} />} path="/reports/trial-balance" color="" />
        </div>
      </div>

      {/* ═══ Recent Transactions ═══ */}
      <div className="bg-card border border-border text-card-foreground rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">أحدث الحركات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-center">التاريخ</th>
                <th className="px-5 py-3 text-center">النوع</th>
                <th className="px-5 py-3 text-center">المرجع</th>
                <th className="px-5 py-3 text-center">الطرف</th>
                <th className="px-5 py-3 text-center">المبلغ</th>
                <th className="px-5 py-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                    لا توجد حركات حديثة
                  </td>
                </tr>
              ) : recentTransactions.map(tx => {
                const sc = statusConfig[tx.status] || statusConfig.Draft;
                return (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-center font-mono text-muted-foreground">{formatDate(tx.date)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        tx.type === 'sale' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                      }`}>
                        {tx.type === 'sale' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {tx.type === 'sale' ? 'بيع' : 'شراء'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-mono font-semibold text-primary">{tx.reference}</td>
                    <td className="px-5 py-3 text-center text-foreground">{tx.party}</td>
                    <td className="px-5 py-3 text-center font-mono font-semibold text-foreground">{formatCurrency(tx.amount)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {tx.statusName}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
