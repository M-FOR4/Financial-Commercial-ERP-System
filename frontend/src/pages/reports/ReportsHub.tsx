import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi, type DashboardKpiResponse } from '../../services/reportsApi';
import { formatCurrency } from '../../utils/format';

const reportCards = [
  { title: 'ميزان المراجعة', description: 'التحقق من أرصدة الحسابات — يجب أن يساوي المدين الدائن', icon: '⚖', route: '/reports/trial-balance', color: 'indigo' },
  { title: 'قائمة الدخل', description: 'الإيرادات وتكلفة البضاعة المباعة والمصروفات وصافي الربح/الخسارة', icon: '📊', route: '/reports/income-statement', color: 'emerald' },
  { title: 'الميزانية العمومية', description: 'الأصول والخصوم وحقوق الملكية', icon: '🏦', route: '/reports/balance-sheet', color: 'blue' },
  { title: 'كشف حساب', description: 'كشف حساب العميل أو المورد', icon: '📋', route: '/reports/account-statement', color: 'amber' },
];

const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-950/50', border: 'border-indigo-800/40', icon: 'text-indigo-400' },
  emerald: { bg: 'bg-emerald-950/50', border: 'border-emerald-800/40', icon: 'text-emerald-400' },
  blue: { bg: 'bg-blue-950/50', border: 'border-blue-800/40', icon: 'text-blue-400' },
  amber: { bg: 'bg-amber-950/50', border: 'border-amber-800/40', icon: 'text-amber-400' },
};

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">التقارير المالية</h1>
        <p className="text-sm text-muted-foreground mt-1">التحليلات التنفيذية والبيانات المالية ولوحات المؤشرات</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">الإيرادات (YTD)</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{loading ? '...' : formatCurrency(kpis?.totalRevenue ?? 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">صافي الربح (YTD)</p>
          <p className={`text-xl font-bold mt-1 ${(kpis?.netProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {loading ? '...' : formatCurrency(kpis?.netProfit ?? 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">إجمالي الأصول</p>
          <p className="text-xl font-bold text-blue-400 mt-1">{loading ? '...' : formatCurrency(kpis?.totalAssets ?? 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">الرصيد النقدي</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{loading ? '...' : formatCurrency(kpis?.totalCashBalance ?? 0)}</p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{kpis?.totalCustomers ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">العملاء</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{kpis?.totalSuppliers ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">الموردون</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{kpis?.totalProducts ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">الأصناف</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map(card => {
          const c = colorMap[card.color];
          return (
            <button
              key={card.route}
              onClick={() => navigate(card.route)}
              className={`${c.bg} border ${c.border} rounded-xl p-6 text-left hover:scale-[1.01] transition-transform`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-3xl ${c.icon}`}>{card.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{card.title}</h3>
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
