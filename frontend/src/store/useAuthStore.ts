import { create } from 'zustand';

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions: string[];
  companyName?: string | null;
  branchName?: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  setAuth: (data: { accessToken: string; refreshToken: string; user: UserProfile }) => void;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  /** Check if the current user has a specific permission (e.g. "Sales.SalesInvoice.View") */
  hasPermission: (permissionName: string) => boolean;
  /** Check if the current user has ANY of the given permissions */
  hasAnyPermission: (...permissionNames: string[]) => boolean;
  /** Check if the current user has ALL of the given permissions */
  hasAllPermissions: (...permissionNames: string[]) => boolean;
}

const STORAGE_KEY = 'erp_auth_state';

const loadInitialState = (): { accessToken: string | null; refreshToken: string | null; user: UserProfile | null } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        accessToken: parsed.accessToken || null,
        refreshToken: parsed.refreshToken || null,
        user: parsed.user || null,
      };
    }
  } catch (err) {
    console.error('Failed to load auth state from storage:', err);
  }
  return { accessToken: null, refreshToken: null, user: null };
};

const initialState = loadInitialState();

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: initialState.accessToken,
  refreshToken: initialState.refreshToken,
  user: initialState.user,
  isAuthenticated: !!initialState.accessToken,

  setAuth: ({ accessToken, refreshToken, user }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user }));
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
    });
  },

  updateTokens: (accessToken, newRefreshToken) => {
    const current = get();
    const refreshToken = newRefreshToken || current.refreshToken;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user: current.user }));
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  setUser: (user) => {
    const current = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: current.accessToken, refreshToken: current.refreshToken, user }));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  // Authorization is driven STRICTLY by the evaluated permissions list (the
  // server always includes role-derived permissions in user.permissions), never
  // by static role-name checks. The role string is only a UI label/preset.
  hasPermission: (permissionName: string) => {
    const { user } = get();
    if (!user || !user.isActive) return false;
    return user.permissions.includes(permissionName);
  },

  hasAnyPermission: (...permissionNames: string[]) => {
    const { user } = get();
    if (!user || !user.isActive) return false;
    return permissionNames.some((p) => user.permissions.includes(p));
  },

  hasAllPermissions: (...permissionNames: string[]) => {
    const { user } = get();
    if (!user || !user.isActive) return false;
    return permissionNames.every((p) => user.permissions.includes(p));
  },
}));
