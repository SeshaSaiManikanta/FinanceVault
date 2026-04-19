'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/kyc': 'KYC Verification',
  '/applications': 'Loan Applications',
  '/loans': 'Active Loans',
  '/emi': 'EMI Tracker',
  '/overdue': 'Overdue Alerts',
  '/alerts': 'Alert Settings',
  '/security': 'Security & Audit',
  '/subscription': 'Subscription',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'Finance Users',
  '/admin/loan-types': 'Loan Products',
  '/admin/audit': 'Security Events',
  '/admin/subscriptions': 'Subscriptions',
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const title = titles[pathname] || 'VaultFinance';

  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.list({ unreadOnly: 'true', limit: '10' }),
    refetchInterval: 60000,
    enabled: !!user,
  });

  const unread = notifData?.data?.unreadCount || 0;
  const notifs = notifData?.data?.data || [];

  return (
    <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{user?.role === 'ADMIN' ? 'VaultFinance Admin Panel' : user?.companyName}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 1A4.5 4.5 0 0 0 2.5 5.5c0 2.5-1 3.5-1 3.5h11s-1-1-1-3.5A4.5 4.5 0 0 0 7 1z"/>
              <path d="M5.5 10.5a1.5 1.5 0 0 0 3 0"/>
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-10 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold">Notifications</span>
                <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg">×</button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">No new notifications</div>
                ) : (
                  notifs.map((n: any) => (
                    <div key={n.id} className={`px-4 py-3 border-b border-gray-50 text-xs ${!n.isRead ? 'bg-amber-50' : ''}`}>
                      <div className="font-semibold text-gray-700 mb-0.5">{n.title}</div>
                      <div className="text-gray-500">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* New Application button (non-admin) */}
        {user?.role !== 'ADMIN' && (
          <button onClick={() => router.push('/applications')} className="btn btn-amber btn-sm">
            + New Loan
          </button>
        )}
      </div>
    </header>
  );
}
