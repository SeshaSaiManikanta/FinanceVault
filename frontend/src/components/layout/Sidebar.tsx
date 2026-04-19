'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import clsx from 'clsx';

// ─── Icons ───
const icons: Record<string, JSX.Element> = {
  grid: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x=".5" y=".5" width="5.5" height="5.5" rx="1"/><rect x="8" y=".5" width="5.5" height="5.5" rx="1"/><rect x=".5" y="8" width="5.5" height="5.5" rx="1"/><rect x="8" y="8" width="5.5" height="5.5" rx="1"/></svg>,
  users: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="4.5" r="2.5"/><path d="M1.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>,
  kyc: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x=".5" y="2.5" width="13" height="9" rx="1.5"/><path d="M.5 6h13M4 6v5.5"/></svg>,
  file: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13V3l2.5-2.5H12V13H2z"/><path d="M4.5.5v3H2M4 7.5h6M4 10.5h4"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="6"/><path d="M7 4v3l2.5 1.5"/></svg>,
  table: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x=".5" y="1.5" width="13" height="11" rx="1.5"/><path d="M.5 5.5h13M4 5.5v7"/></svg>,
  warning: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 1L.5 13h13L7 1z"/><path d="M7 6v3M7 10.5v.8"/></svg>,
  bell: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 1A4.5 4.5 0 0 0 2.5 5.5c0 2.5-1 3.5-1 3.5h11s-1-1-1-3.5A4.5 4.5 0 0 0 7 1z"/><path d="M5.5 10.5a1.5 1.5 0 0 0 3 0"/></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 1L1.5 3.5v4C1.5 11 4 13.5 7 13.5s5.5-2.5 5.5-6v-4L7 1z"/></svg>,
  subscription: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="6"/><path d="M7 3.5v3.5l2 1.5"/></svg>,
  logout: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 7h6M9 4.5L11.5 7 9 9.5"/><path d="M7.5 2H2.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5"/></svg>,
};

const userNav = [
  { section: 'Overview', items: [{ href: '/dashboard', label: 'Dashboard', icon: 'grid' }] },
  {
    section: 'Customers',
    items: [
      { href: '/customers', label: 'Customers', icon: 'users' },
      { href: '/kyc', label: 'KYC Verification', icon: 'kyc' },
    ],
  },
  {
    section: 'Loans',
    items: [
      { href: '/applications', label: 'Applications', icon: 'file' },
      { href: '/loans', label: 'Active Loans', icon: 'clock' },
    ],
  },
  {
    section: 'Collections',
    items: [
      { href: '/emi', label: 'EMI Tracker', icon: 'table' },
      { href: '/overdue', label: 'Overdue Alerts', icon: 'warning' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { href: '/alerts', label: 'Alert Settings', icon: 'bell' },
      { href: '/security', label: 'Security & Audit', icon: 'shield' },
      { href: '/subscription', label: 'Subscription', icon: 'subscription' },
    ],
  },
];

const adminNav = [
  {
    section: 'Admin',
    items: [
      { href: '/admin', label: 'Admin Dashboard', icon: 'grid' },
      { href: '/admin/users', label: 'Finance Users', icon: 'users' },
      { href: '/admin/loan-types', label: 'Loan Products', icon: 'file' },
      { href: '/admin/audit', label: 'Security Events', icon: 'shield' },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: 'subscription' },
    ],
  },
];

function ini(n: string) { return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
const avBg = ['#FAEEDA', '#E6F1FB', '#EAF3DE', '#FBEAF0', '#EEEDFE'];
const avTx = ['#633806', '#0C447C', '#27500A', '#72243E', '#26215C'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const nav = isAdmin ? adminNav : userNav;
  const idx = user ? (user.email.charCodeAt(0) % avBg.length) : 0;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.replace('/login');
  };

  return (
    <aside className="w-52 min-w-[208px] bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-yellow-600 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 7.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-serif text-sm text-gray-900">VaultFinance</span>
        <span className="text-[9px] font-bold bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">PRO</span>
      </div>

      {/* User info */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: avBg[idx], color: avTx[idx] }}
        >
          {user ? ini(user.name) : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{isAdmin ? 'Super Admin' : user?.companyName}</p>
        </div>
        <button onClick={handleLogout} title="Sign out" className="text-gray-400 hover:text-gray-700 p-1 rounded">
          {icons.logout}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2">
        {nav.map(group => (
          <div key={group.section}>
            <p className="section-label">{group.section}</p>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('nav-item', pathname === item.href && 'active')}
              >
                {icons[item.icon]}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Security status */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
          <span>AES-256 encrypted</span>
        </div>
      </div>
    </aside>
  );
}
