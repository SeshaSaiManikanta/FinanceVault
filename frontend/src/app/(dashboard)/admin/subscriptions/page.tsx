'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../../lib/api';

export default function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-subs'],
    queryFn: () => adminApi.users({ limit: '100' }).then(r => r.data),
  });
  const planMutation = useMutation({
    mutationFn: ({ id, plan, days }: any) => adminApi.updatePlan(id, { plan, daysToAdd: days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users-subs'] }),
  });

  const users = data?.data || [];

  const planBadge = (u: any) => {
    if (u.plan === 'TRIAL') {
      const days = Math.max(0, Math.ceil((new Date(u.trialEndsAt || 0).getTime() - Date.now()) / 86400000));
      return days > 0 ? <span className="badge badge-pending">Trial {days}d</span> : <span className="badge badge-overdue">Expired</span>;
    }
    return <span className="badge badge-verified">{u.plan}</span>;
  };

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>{['User','Company','Plan','Customers','Status','Registered','Expires','Action'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
        </thead>
        <tbody>
          {isLoading ? <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
          : users.map((u: any) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="table-td"><p className="font-medium text-sm">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></td>
              <td className="table-td text-sm">{u.companyName}</td>
              <td className="table-td">{planBadge(u)}</td>
              <td className="table-td text-sm">{u._count?.customers || 0}/10</td>
              <td className="table-td"><span className={`badge ${u.isActive ? 'badge-verified' : 'badge-overdue'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
              <td className="table-td text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
              <td className="table-td text-xs text-gray-400">
                {u.subscriptionEndsAt ? new Date(u.subscriptionEndsAt).toLocaleDateString('en-IN') :
                 u.trialEndsAt ? `Trial: ${new Date(u.trialEndsAt).toLocaleDateString('en-IN')}` : '—'}
              </td>
              <td className="table-td">
                <div className="flex gap-1">
                  {u.plan === 'TRIAL'
                    ? <button onClick={() => planMutation.mutate({ id: u.id, plan: 'MONTHLY', days: 30 })} className="btn btn-green btn-sm">Grant Sub</button>
                    : <button onClick={() => planMutation.mutate({ id: u.id, plan: 'TRIAL' })} className="btn btn-red btn-sm">Revoke</button>
                  }
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
