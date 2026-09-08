import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi, type DashboardKpiResponse } from '../../services/reportsApi';
import { formatCurrency } from '../../utils/format';
import { Scale, BarChart3, Landmark, FileSpreadsheet } from 'lucide-react';

const reportCards = [
  {
    title: 'ميزان المراجعة',
    description: 'التحقق من أرصدة الحسابات — يجب أن يساوي المدين الدائن',
    icon: Scale,
    route: '/reports/trial-balance',
    colorBadge: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    title: 'قائمة الدخل',
    description: 'الإيرادات وتكلفة البضاعة المباعة والمصروفات وصافي الربح/الخسارة',
    icon: BarChart3,
    route: '/reports/income-statement',
    colorBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    title: 'الميزانية العمومية',
    description: 'الأصول والخصوم وحقوق الملكية',
    icon: Landmark,
    route: '/reports/balance-sheet',
    colorBadge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  {
    title: 'كشف حساب',
    description: 'كشف حساب العميل أو المورد أو الحساب العام',
    icon: FileSpreadsheet,
    route: '/reports/account-statement',
    colorBadge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
];

export const ReportsHub: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.getDashboardKpis()
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 text-right">
      <div>
        <h1 className="text-2xl font-bold text-foreground">التقارير المالية</h1>
        <p className="text-sm text-muted-foreground mt-1">التحليلات التنفيذية والبيانات المالية ولوحات المؤشرات</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">الإيرادات (YTD)</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {loading ? '...' : formatCurrency(kpis?.totalRevenue ?? 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">صافي الربح (YTD)</p>
          <p className={`text-xl font-bold mt-1 ${(kpis?.netProfit ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
            {loading ? '...' : formatCurrency(kpis?.netProfit ?? 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">إجمالي الأصول</p>
          <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {loading ? '...' : formatCurrency(kpis?.totalAssets ?? 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">الرصيد النقدي</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {loading ? '...' : formatCurrency(kpis?.totalCashBalance ?? 0)}
          </p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{kpis?.totalCustomers ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">العملاء</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{kpis?.totalSuppliers ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">الموردون</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{kpis?.totalProducts ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">الأصناف</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.route}
              onClick={() => navigate(card.route)}
              className="bg-card border border-border rounded-xl p-6 text-right hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border ${card.colorBadge} shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
