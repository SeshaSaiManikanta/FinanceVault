'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, getTrialDaysLeft, isSubscriptionExpired } from '@/store/authStore';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 8.5l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm text-gray-500">Loading VaultFinance...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const expired = isSubscriptionExpired(user);
  const trialDays = getTrialDaysLeft(user);
  const showTrialBanner = !expired && user?.plan === 'TRIAL' && trialDays <= 10 && trialDays > 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Trial banner */}
      {showTrialBanner && (
        <div className="bg-gray-950 flex items-center justify-between px-5 py-2 flex-shrink-0">
          <span className="text-xs text-gray-300">
            Free trial: <strong className="text-yellow-400">{trialDays} days remaining</strong> — upgrade to keep your data
          </span>
          <button
            onClick={() => router.push('/subscription')}
            className="text-xs bg-yellow-600 text-gray-950 font-semibold px-3 py-1 rounded-md hover:bg-yellow-500"
          >
            Upgrade ₹20/mo
          </button>
        </div>
      )}

      {/* Expired overlay */}
      {expired && pathname !== '/subscription' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16v.5"/>
              </svg>
            </div>
            <h2 className="font-serif text-xl mb-2">Trial Expired</h2>
            <p className="text-sm text-gray-500 mb-5">Your 30-day free trial has ended. Subscribe to continue accessing all features and your data.</p>
            <button
              onClick={() => router.push('/subscription')}
              className="w-full py-2.5 bg-gray-950 text-white rounded-lg font-semibold text-sm"
            >
              View Plans & Subscribe
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
