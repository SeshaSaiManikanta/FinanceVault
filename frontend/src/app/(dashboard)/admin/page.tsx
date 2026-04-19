'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useState } from 'react';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtK(n: number) { return n >= 100000 ? '₹' + (n / 100000).toFixed(1) + 'L' : fmt(n); }

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', search, planFilter],
    queryFn: () => adminApi.users({ search, plan: planFilter || undefined, limit: '20' }).then(r => r.data),
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan, days }: any) => adminApi.updatePlan(id, { plan, daysToAdd: days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = usersData?.data || [];
  const kpis = [
    { label: 'Total Users', value: stats?.totalUsers || 0, sub: 'Registered' },
    { label: 'Subscribed', value: stats?.subscribedUsers || 0, sub: 'Paying', green: true },
    { label: 'Trial', value: stats?.trialUsers || 0, sub: 'Free trial', amber: true },
    { label: 'Total Customers', value: stats?.totalCustomers || 0, sub: 'Platform-wide' },
    { label: 'Total Loans', value: stats?.totalLoans || 0, sub: 'All time' },
    { label: 'Total Disbursed', value: fmtK(stats?.totalDisbursed || 0), sub: 'Portfolio' },
  ];

  const planBadge = (u: any) => {
    if (u.plan === 'TRIAL') {
      const days = Math.max(0, Math.ceil((new Date(u.trialEndsAt || 0).getTime() - Date.now()) / 86400000));
      return days > 0
        ? <span className="badge badge-pending">Trial · {days}d</span>
        : <span className="badge badge-overdue">Expired</span>;
    }
    return <span className="badge badge-verified">{u.plan}</span>;
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-semibold ${k.green ? 'text-green-700' : k.amber ? 'text-amber-700' : 'text-gray-900'}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold flex-1">Finance Users</h3>
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input pl-7 text-xs" style={{ width: 180 }} />
            <svg className="absolute left-2 top-2 text-gray-400" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="4"/><path d="M8.5 8.5l2 2"/></svg>
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="input text-xs w-auto">
            <option value="">All plans</option>
            <option value="TRIAL">Trial</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>{['User','Company','Plan','Customers','Loans','Last Login','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
            : users.length === 0 ? <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No users found</td></tr>
            : users.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-td">
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="table-td text-sm">{u.companyName}</td>
                <td className="table-td">{planBadge(u)}</td>
                <td className="table-td text-sm">{u._count?.customers || 0}/10</td>
                <td className="table-td text-sm">{u._count?.loans || 0}</td>
                <td className="table-td text-xs text-gray-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</td>
                <td className="table-td">
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => planMutation.mutate({ id: u.id, plan: u.plan === 'TRIAL' ? 'MONTHLY' : 'TRIAL', days: u.plan === 'TRIAL' ? 30 : undefined })}
                      className={`btn btn-sm ${u.plan === 'TRIAL' ? 'btn-green' : ''}`}
                    >
                      {u.plan === 'TRIAL' ? 'Grant Sub' : 'Revoke Sub'}
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate(u.id)}
                      className={`btn btn-sm ${u.isActive ? 'btn-red' : 'btn-green'}`}
                    >
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
