import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore, type UserProfile } from '../store/useAuthStore';

interface AuthApiResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile & { companyName?: string | null; branchName?: string | null };
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await api.post<AuthApiResponse>('/api/auth/login', {
        username,
        password,
      });
      setAuth(res.data);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const message = error.response?.data?.message || error.message || 'فشل الاتصال بالخادم.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-foreground">
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30 mb-4 font-black text-2xl">
            ERP
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            نظام ERP المالي والتجاري
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            نظام ERP المالي والتجاري — ليبيا (د.ل)
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border text-card-foreground shadow-2xl rounded-2xl py-8 px-6 sm:px-10">
          <h2 className="text-lg font-bold text-foreground mb-6 text-center">تسجيل الدخول</h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-start space-x-2">
              <span className="font-bold text-lg leading-none">!</span>
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm transition-all"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/30 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            نظام ERP المالي والتجاري © 2026 — بنية LAN غير المتصلة
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
            مصادقة JWT محلية آمنة
          </p>
        </div>
      </div>
    </div>
  );
};
