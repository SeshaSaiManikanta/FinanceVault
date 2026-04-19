'use client';
import { useState } from 'react';
import { useAuthStore, getTrialDaysLeft } from '@/store/authStore';

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const trialDays = getTrialDaysLeft(user);

  const plans = [
    { id: 'MONTHLY', name: 'Monthly', price: '₹20', period: '/month', note: 'Billed monthly · Cancel anytime' },
    { id: 'YEARLY', name: 'Yearly', price: '₹150', period: '/year', note: 'Save ₹90 vs monthly', badge: 'Best value' },
  ];

  const features = [
    'Up to 10 customers (base plan)',
    'Gold, Vehicle, Personal, Property & Business loans',
    'KYC verification workflow',
    'EMI tracker & overdue alerts',
    'Email & SMS notifications',
    'AES-256 data encryption',
    'Security audit log',
    '99.5% uptime SLA',
  ];

  return (
    <div className="max-w-xl space-y-4">
      {/* Current plan */}
      <div className="card">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Plan</p>
            <p className="text-2xl font-semibold mt-0.5">
              {user?.plan === 'TRIAL' ? `Free Trial` : user?.plan === 'MONTHLY' ? 'Monthly Plan' : user?.plan === 'YEARLY' ? 'Yearly Plan' : user?.plan}
            </p>
          </div>
          <span className={`badge ${user?.plan === 'TRIAL' ? 'badge-pending' : 'badge-verified'}`}>{user?.plan}</span>
        </div>
        {user?.plan === 'TRIAL' && trialDays > 0 && (
          <p className="text-sm text-amber-700">{trialDays} days remaining in free trial</p>
        )}
        {user?.plan !== 'TRIAL' && user?.subscriptionEndsAt && (
          <p className="text-sm text-gray-500">Renews {new Date(user.subscriptionEndsAt).toLocaleDateString('en-IN')}</p>
        )}
      </div>

      {/* Plan selector */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-4">Upgrade Plan</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id as any)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${selected === p.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {p.badge && <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">{p.badge}</span>}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{p.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{p.price}<span className="text-sm font-normal text-gray-400">{p.period}</span></p>
              <p className="text-xs text-gray-400 mt-1">{p.note}</p>
            </button>
          ))}
        </div>

        <div className="space-y-2 mb-5">
          {features.map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#3B6D11" strokeWidth="2"><path d="M2.5 7l3 3 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {f}
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2">For 50+ customers — contact <strong>admin@vaultfinance.com</strong> for Pro pricing.</p>
        </div>

        <button
          onClick={() => alert(`Subscription: ${selected}\nPrice: ${selected === 'MONTHLY' ? '₹20/month' : '₹150/year'}\n\nIn production this opens Razorpay payment flow.\nIntegrate with:\n  razorpay.createOrder()\n  razorpay.on('payment.success', ...)\n\nContact admin@vaultfinance.com to activate manually for now.`)}
          className="btn btn-dark w-full justify-center py-2.5"
        >
          Subscribe {selected === 'MONTHLY' ? '₹20/month' : '₹150/year'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Payments powered by Razorpay · Secure & encrypted</p>
      </div>

      <div className="card bg-gray-50 border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} VaultFinance. All Rights Reserved.
          Your data is protected under India's DPDP Act 2023.
          AES-256 encrypted at rest.
        </p>
      </div>
    </div>
  );
}
