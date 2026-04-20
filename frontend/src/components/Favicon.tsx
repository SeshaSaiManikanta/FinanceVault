'use client';

import React from 'react';

/**
 * Favicon component that generates an SVG favicon dynamically
 * This creates a nice VaultFinance icon with a lock and finance theme
 */
export function Favicon() {
  React.useEffect(() => {
    // Create SVG favicon
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <!-- Background -->
        <rect width="64" height="64" fill="#1e40af" rx="8"/>
        
        <!-- Vault door -->
        <rect x="8" y="16" width="48" height="40" fill="#3b82f6" rx="4"/>
        
        <!-- Vault handle -->
        <circle cx="32" cy="28" r="6" fill="#fbbf24"/>
        
        <!-- Lock icon -->
        <path d="M32 38c-2.2 0-4 1.8-4 4v4h16v-4c0-2.2-1.8-4-4-4z" fill="#fbbf24"/>
        <rect x="24" y="22" width="16" height="8" rx="2" fill="none" stroke="#fbbf24" stroke-width="2"/>
        
        <!-- Dollar sign inside vault -->
        <text x="32" y="52" font-size="18" font-weight="bold" fill="#fbbf24" text-anchor="middle">₹</text>
      </svg>
    `;

    // Create blob and object URL
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    // Create or update favicon link
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;

    return () => URL.revokeObjectURL(url);
  }, []);

  return null;
}
