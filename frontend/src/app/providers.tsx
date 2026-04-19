'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>{children}</AuthInitializer>
    </QueryClientProvider>
  );
}

// Hydrate auth state on mount
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      // Verify token is still valid
      authApi.me()
        .then(r => setAuth(r.data.data, useAuthStore.getState().accessToken || ''))
        .catch(() => { clearAuth(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return <>{children}</>;
}
