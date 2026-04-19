'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function AdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminApi.auditLogs({ limit: '50' }).then(r => r.data),
  });
  const logs = data?.data || [];
  const sc: Record<string, string> = { LOW: 'text-green-700 bg-green-50', MEDIUM: 'text-amber-700 bg-amber-50', HIGH: 'text-red-700 bg-red-50', CRITICAL: 'text-red-900 bg-red-100 font-bold' };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold mb-3">Platform Security Events ({logs.length})</h3>
      {isLoading ? <p className="text-gray-400 text-sm">Loading...</p> : (
        <table className="w-full">
          <thead className="bg-gray-50"><tr>{['User','Action','Details','Severity','Time'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
          <tbody>
            {logs.map((l: any) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="table-td">
                  <p className="font-medium text-sm">{l.user?.name}</p>
                  <p className="text-xs text-gray-400">{l.user?.email}</p>
                </td>
                <td className="table-td font-mono text-xs">{l.action}</td>
                <td className="table-td text-xs text-gray-500 max-w-[200px] truncate">{l.details || '—'}</td>
                <td className="table-td"><span className={`badge text-xs ${sc[l.severity] || ''}`}>{l.severity}</span></td>
                <td className="table-td text-xs text-gray-400">{timeAgo(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
