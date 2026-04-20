// VaultFinance — Root Layout
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Favicon } from '@/components/Favicon';

export const metadata: Metadata = {
  title: 'VaultFinance — Secure Loan Management',
  description: 'Professional Gold & Vehicle Loan Management for Finance Shops',
  robots: { index: false, follow: false }, // private app — no indexing
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="%231e40af" rx="8"/><rect x="8" y="16" width="48" height="40" fill="%233b82f6" rx="4"/><circle cx="32" cy="28" r="6" fill="%23fbbf24"/><path d="M32 38c-2.2 0-4 1.8-4 4v4h16v-4c0-2.2-1.8-4-4-4z" fill="%23fbbf24"/><rect x="24" y="22" width="16" height="8" rx="2" fill="none" stroke="%23fbbf24" stroke-width="2"/><text x="32" y="52" font-size="18" font-weight="bold" fill="%23fbbf24" text-anchor="middle">₹</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Favicon />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
