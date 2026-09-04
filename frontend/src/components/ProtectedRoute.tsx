import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** @deprecated Use requiredPermission instead for granular permission checks */
  allowedRoles?: string[];
  /** If provided, user must have this permission (or be Admin) to access the page */
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requiredPermission }) => {
  const { isAuthenticated, user, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Permission-based access check (preferred over role-based)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="p-8 bg-card border border-border text-card-foreground rounded-xl max-w-md text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 mx-auto flex items-center justify-center mb-4 text-xl font-bold">
            ✕
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">صلاحية مطلوبة</h2>
          <p className="text-muted-foreground text-sm mb-6">
            ليس لديك الصلاحية الكافية للوصول إلى هذه الصفحة.
            <br />
            <span className="font-mono text-xs text-primary mt-2 block">({requiredPermission})</span>
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // Legacy role-based access check (kept for backward compatibility)
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="p-8 bg-card border border-border text-card-foreground rounded-xl max-w-md text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your current role <span className="font-semibold text-primary">({user.role})</span> does not have permission to access this page.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
