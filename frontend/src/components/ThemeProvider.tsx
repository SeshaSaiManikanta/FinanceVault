'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function ThemeProvider() {
  const { darkMode } = useAuthStore();

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [darkMode]);

  return null;
}
