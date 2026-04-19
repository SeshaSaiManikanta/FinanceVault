// VaultFinance — API Client
// Axios instance with JWT refresh + auth interceptors
// © 2025 VaultFinance. All Rights Reserved.

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send HttpOnly cookies
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

// ─── Response interceptor: handle 401, refresh token ───
api.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      // Don't retry refresh/login endpoints
      if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.data?.accessToken;
        if (newToken) {
          original.headers['Authorization'] = `Bearer ${newToken}`;
          processQueue(null, newToken);
        }
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Force redirect to login
        if (typeof window !== 'undefined') {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Circular import workaround — import lazily
let useAuthStore: any = { getState: () => ({ clearAuth: () => {} }) };
if (typeof window !== 'undefined') {
  import('../store/authStore').then(m => { useAuthStore = m.useAuthStore; });
}

// ─── API helpers ───
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

export const customersApi = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  reveal: (id: string, pin: string, fields: string[]) =>
    api.post(`/customers/${id}/reveal`, { pin, fields }),
};

export const loansApi = {
  list: (params?: any) => api.get('/loans', { params }),
  get: (id: string) => api.get(`/loans/${id}`),
  create: (data: any) => api.post('/loans', data),
  schedule: (id: string) => api.get(`/loans/${id}/schedule`),
  pay: (loanId: string, repaymentId: string, data?: any) =>
    api.post(`/loans/${loanId}/repayments/${repaymentId}/pay`, data || {}),
};

export const applicationsApi = {
  list: (params?: any) => api.get('/applications', { params }),
  create: (data: any) => api.post('/applications', data),
  approve: (id: string) => api.put(`/applications/${id}/approve`),
  reject: (id: string, reason: string) => api.put(`/applications/${id}/reject`, { reason }),
};

export const repaymentsApi = {
  overdue: () => api.get('/repayments/overdue'),
  dueToday: () => api.get('/repayments/due-today'),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};

export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  readAll: () => api.put('/notifications/read-all'),
  read: (id: string) => api.put(`/notifications/${id}/read`),
};

export const auditApi = {
  list: (params?: any) => api.get('/audit', { params }),
};

export const settingsApi = {
  getAlerts: () => api.get('/settings/alerts'),
  updateAlerts: (prefs: any) => api.put('/settings/alerts', { alertPrefs: prefs }),
  updatePin: (data: any) => api.put('/settings/pin', data),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params?: any) => api.get('/admin/users', { params }),
  user: (id: string) => api.get(`/admin/users/${id}`),
  updatePlan: (id: string, data: any) => api.put(`/admin/users/${id}/plan`, data),
  toggleUser: (id: string) => api.put(`/admin/users/${id}/toggle`),
  loanTypes: () => api.get('/admin/loan-types'),
  createLoanType: (data: any) => api.post('/admin/loan-types', data),
  updateLoanType: (id: string, data: any) => api.put(`/admin/loan-types/${id}`, data),
  toggleLoanType: (id: string) => api.put(`/admin/loan-types/${id}/toggle`),
  auditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),
};

export default api;
