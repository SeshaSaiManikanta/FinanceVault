'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function ThemeProvider() {
  const { darkMode } = useAuthStore();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    if (darkMode) {
      html.classList.add('dark');
      body.classList.add('dark');
    } else {
      html.classList.remove('dark');
      body.classList.remove('dark');
    }
    
    // Also apply to localStorage for persistence across refreshes
    localStorage.setItem('vaultfinance-dark-mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  return null;
}
