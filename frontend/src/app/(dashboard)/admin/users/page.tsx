'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../../lib/api';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-list', search, planFilter],
    queryFn: () => adminApi.users({ search, plan: planFilter || undefined, limit: '50' }).then(r => r.data),
  });

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user-detail', selectedUser?.id],
    queryFn: () => adminApi.user(selectedUser.id).then(r => r.data.data),
    enabled: !!selectedUser?.id,
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan, days }: any) => adminApi.updatePlan(id, { plan, daysToAdd: days }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users-list'] }); qc.invalidateQueries({ queryKey: ['admin-user-detail'] }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users-list'] }); qc.invalidateQueries({ queryKey: ['admin-user-detail'] }); },
  });

  const users = data?.data || [];

  const planBadge = (u: any) => {
    if (u.plan === 'TRIAL') {
      const days = Math.max(0, Math.ceil((new Date(u.trialEndsAt || 0).getTime() - Date.now()) / 86400000));
      return days > 0
        ? <span className="badge badge-pending">Trial · {days}d left</span>
        : <span className="badge badge-overdue">Trial Expired</span>;
    }
    if (u.plan === 'MONTHLY') return <span className="badge badge-verified">Monthly ₹20</span>;
    if (u.plan === 'YEARLY') return <span className="badge badge-verified">Yearly ₹150</span>;
    return <span className="badge badge-active">{u.plan}</span>;
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Users list */}
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, company..." className="input pl-8 text-sm" />
            <svg className="absolute left-2.5 top-2.5 text-gray-400" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l2.5 2.5"/></svg>
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="input w-auto text-sm">
            <option value="">All plans</option>
            <option value="TRIAL">Trial</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['User', 'Company', 'Plan', 'Custs', 'Loans', 'Registered', ''].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
                : users.length === 0
                ? <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No users found</td></tr>
                : users.map((u: any) => (
                  <tr
                    key={u.id}
                    className={`cursor-pointer hover:bg-amber-50 ${selectedUser?.id === u.id ? 'bg-amber-50' : ''}`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <td className="table-td">
                      <p className="font-semibold text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="table-td text-sm">{u.companyName}</td>
                    <td className="table-td">{planBadge(u)}</td>
                    <td className="table-td text-sm font-medium">{u._count?.customers || 0}</td>
                    <td className="table-td text-sm font-medium">{u._count?.loans || 0}</td>
                    <td className="table-td text-xs text-gray-400">{fmtDate(u.createdAt)}</td>
                    <td className="table-td">
                      <span className={`w-2 h-2 rounded-full inline-block ${u.isActive ? 'bg-green-500' : 'bg-red-400'}`}></span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: User detail panel */}
      {selectedUser && (
        <div className="w-80 flex-shrink-0 space-y-3">
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold">{userDetail?.name || selectedUser.name}</p>
                <p className="text-xs text-gray-400">{userDetail?.email || selectedUser.email}</p>
                <p className="text-xs text-gray-400">{userDetail?.companyName || selectedUser.companyName}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
            </div>

            <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
              {[
                ['Plan', planBadge(userDetail || selectedUser)],
                ['Phone', userDetail?.phone || '—'],
                ['Customers', `${userDetail?._count?.customers || 0} / 10`],
                ['Loans', userDetail?._count?.loans || 0],
                ['Last Login', userDetail?.lastLoginAt ? fmtDate(userDetail.lastLoginAt) : 'Never'],
                ['Last Login IP', userDetail?.lastLoginIp || '—'],
                ['Registered', fmtDate(userDetail?.createdAt || selectedUser.createdAt)],
                ['Account', <span className={`badge ${(userDetail || selectedUser).isActive ? 'badge-verified' : 'badge-overdue'}`}>{(userDetail || selectedUser).isActive ? 'Active' : 'Disabled'}</span>],
              ].map(([k, v]: any) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin Actions</p>
              <button
                onClick={() => planMutation.mutate({ id: selectedUser.id, plan: selectedUser.plan === 'TRIAL' ? 'MONTHLY' : 'TRIAL', days: selectedUser.plan === 'TRIAL' ? 30 : undefined })}
                disabled={planMutation.isPending}
                className={`btn w-full justify-center text-sm ${selectedUser.plan === 'TRIAL' ? 'btn-green' : 'btn-amber'}`}
              >
                {selectedUser.plan === 'TRIAL' ? '✓ Grant Subscription (30 days)' : '↩ Revert to Trial'}
              </button>
              <button
                onClick={() => planMutation.mutate({ id: selectedUser.id, plan: 'MONTHLY', days: 365 })}
                disabled={planMutation.isPending}
                className="btn w-full justify-center text-sm"
              >
                Grant 1-Year Subscription
              </button>
              <button
                onClick={() => toggleMutation.mutate(selectedUser.id)}
                disabled={toggleMutation.isPending}
                className={`btn w-full justify-center text-sm ${selectedUser.isActive ? 'btn-red' : 'btn-green'}`}
              >
                {selectedUser.isActive ? '⊘ Disable Account' : '✓ Enable Account'}
              </button>
            </div>
          </div>

          {/* Customer list */}
          {userDetail?.customers?.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customers ({userDetail.customers.length})</p>
              <div className="space-y-2">
                {userDetail.customers.slice(0, 8).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className={`badge text-xs ml-2 flex-shrink-0 ${c.kycStatus === 'VERIFIED' ? 'badge-verified' : 'badge-pending'}`}>{c.kycStatus}</span>
                  </div>
                ))}
                {userDetail.customers.length > 8 && (
                  <p className="text-xs text-gray-400">+{userDetail.customers.length - 8} more</p>
                )}
              </div>
            </div>
          )}

          {/* Recent loans */}
          {userDetail?.loans?.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Loans ({userDetail.loans.length})</p>
              <div className="space-y-2">
                {userDetail.loans.slice(0, 5).map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-xs text-amber-700">{l.loanNumber}</span>
                      <span className="text-gray-400 ml-1">{l.loanType?.icon}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{fmt(l.principalAmount)}</span>
                      <span className={`badge text-xs badge-${l.status.toLowerCase()}`}>{l.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent audit */}
          {userDetail?.auditLogs?.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Activity</p>
              <div className="space-y-1.5">
                {userDetail.auditLogs.slice(0, 6).map((l: any, i: number) => (
                  <div key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className={`flex-shrink-0 mt-0.5 ${l.severity === 'HIGH' ? 'text-red-500' : l.severity === 'MEDIUM' ? 'text-amber-500' : 'text-gray-400'}`}>●</span>
                    <span className="truncate">{l.action}{l.details ? ` — ${l.details}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
