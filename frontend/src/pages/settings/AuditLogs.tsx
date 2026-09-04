import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  user?: { fullName: string; username: string } | null;
  action: string;
  entityName: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  UPDATE: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  DELETE: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  POST_DOCUMENT: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  CANCEL_DOCUMENT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
};

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => { loadLogs(); }, [page, actionFilter, entityFilter, fromDate, toDate]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { skip: page * pageSize, take: pageSize };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityName = entityFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const data = await api.get<{ logs: AuditLogEntry[]; total: number }>('/api/audit-logs', { params }).then(r => r.data);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatJson = (json: string | null) => {
    if (!json) return null;
    try {
      const obj = JSON.parse(json);
      return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ');
    } catch { return json; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">سجل الحركات</h1>
        <p className="text-sm text-muted-foreground mt-1">سجل مراجعة نشاطات النظام — تتبع جميع إجراءات المستخدمين وتغييرات المستندات</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border text-card-foreground rounded-xl p-4 flex flex-wrap items-end gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">الإجراء</label>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
            <option value="">جميع الإجراءات</option>
            <option value="CREATE">إنشاء</option>
            <option value="UPDATE">تعديل</option>
            <option value="DELETE">حذف</option>
            <option value="POST_DOCUMENT">ترحيل مستند</option>
            <option value="CANCEL_DOCUMENT">إلغاء مستند</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">الكيان</label>
          <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
            <option value="">جميع الكيانات</option>
            <option value="User">مستخدم</option>
            <option value="SalesInvoice">فاتورة مبيعات</option>
            <option value="PurchaseInvoice">فاتورة شراء</option>
            <option value="JournalEntry">قيد يومي</option>
            <option value="CashVoucher">سند نقدي</option>
            <option value="FixedAsset">أصل ثابت</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">من تاريخ</label>
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">إلى تاريخ</label>
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>
        <div className="text-xs text-muted-foreground py-2">{total} إجمالي السجلات</div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border text-card-foreground rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">التاريخ والوقت</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">المستخدم</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الإجراء</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الكيان</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">معرّف الكيان</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">التفاصيل</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">لم يتم العثور على سجلات.</td></tr>
              ) : (
                logs.map(log => {
                  const ac = actionColors[log.action] || 'bg-muted text-muted-foreground border-border';
                  return (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {log.user?.username || <span className="text-muted-foreground">النظام</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${ac}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground font-mono">{log.entityName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono truncate max-w-[120px]">{log.entityId || '-'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={formatJson(log.details) || ''}>
                        {formatJson(log.details) || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.ipAddress || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted border border-border rounded disabled:opacity-50">← السابق
            </button>
            <span className="text-xs text-muted-foreground">الصفحة {page + 1} من {Math.ceil(total / pageSize)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= total}
              className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted border border-border rounded disabled:opacity-50">التالي →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
