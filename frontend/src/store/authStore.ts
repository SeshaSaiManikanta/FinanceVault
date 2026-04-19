// VaultFinance — Auth Store (Zustand)
// © 2025 VaultFinance. All Rights Reserved.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  companyName: string;
  phone?: string;
  role: 'ADMIN' | 'USER';
  plan: 'TRIAL' | 'MONTHLY' | 'YEARLY' | 'ENTERPRISE';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  _count?: { customers: number; loans: number; applications: number };
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true, isLoading: false }),
      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
    }),
    {
      name: 'vf-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    },
  ),
);

// ─── Selectors ───
export const selectUser = (s: AuthState) => s.user;
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'ADMIN';
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectPlan = (s: AuthState) => s.user?.plan;

export function getTrialDaysLeft(user: AuthUser | null): number {
  if (!user?.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000));
}

export function isSubscriptionExpired(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return false;
  if (user.plan === 'TRIAL') {
    return user.trialEndsAt ? new Date(user.trialEndsAt) < new Date() : false;
  }
  return user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) < new Date() : false;
}
