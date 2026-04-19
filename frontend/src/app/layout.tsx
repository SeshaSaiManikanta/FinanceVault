// VaultFinance — Root Layout
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'VaultFinance — Secure Loan Management',
  description: 'Professional Gold & Vehicle Loan Management for Finance Shops',
  robots: { index: false, follow: false }, // private app — no indexing
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
