import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
}

export const HealthStatus: React.FC = () => {
  const { data, error, isLoading, isError, refetch, isFetching } = useQuery<HealthResponse>({
    queryKey: ['healthCheck'],
    queryFn: async () => {
      const res = await api.get<HealthResponse>('/api/health');
      return res.data;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10 bg-card border border-border text-card-foreground rounded-xl shadow-2xl">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
          <h2 className="text-xl font-bold text-foreground tracking-wide">
            حالة اتصال النظام
          </h2>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isFetching ? 'جاري الفحص...' : 'تحديث الحالة'}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8 text-muted-foreground space-x-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>جاري الاتصال بـ ASP.NET Core API على http://localhost:8000...</span>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
          <div className="flex items-center space-x-2 font-semibold mb-2">
            <span className="w-3 h-3 rounded-full bg-destructive inline-block" />
            <span>الخادم غير متصل أو غير قابل للوصول</span>
          </div>
          <p className="text-sm opacity-90 mb-3">
            لا يمكن الاتصال بـ ASP.NET Core API على <code className="bg-destructive/20 px-1.5 py-0.5 rounded">http://localhost:8000</code>.
          </p>
          <p className="text-xs font-mono">
            {error instanceof Error ? error.message : 'تم رفض الاتصال.'}
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block" />
              <div>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 block">
                  تم الاتصال بالخادم بنجاح
                </span>
                <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                  {data.service} v{data.version} ({data.environment})
                </span>
              </div>
            </div>
            <span className="px-3 py-1 text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-full border border-emerald-500/40">
              HTTP 200 OK
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-muted-foreground">
            <div className="p-3 bg-muted/40 rounded-lg border border-border">
              <span className="block text-muted-foreground mb-1">رابط الخادم:</span>
              <span className="text-primary">http://localhost:8000/api/health</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border border-border">
              <span className="block text-muted-foreground mb-1">خادم التطوير:</span>
              <span className="text-primary">http://localhost:5371</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border border-border">
              <span className="block text-muted-foreground mb-1">آخر تحديث:</span>
              <span className="text-foreground">{new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border border-border">
              <span className="block text-muted-foreground mb-1">حالة CORS:</span>
              <span className="text-emerald-600 dark:text-emerald-400">مسموح (localhost:5371)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
