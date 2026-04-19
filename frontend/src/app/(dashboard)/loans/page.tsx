'use client';
// Loans page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loansApi } from '@/lib/api';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

export default function LoansPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['loans', search, status],
    queryFn: () => loansApi.list({ search, status: status || undefined }).then(r => r.data),
  });
  const loans = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search loans or customers..." className="input pl-8" />
          <svg className="absolute left-2.5 top-2.5 text-gray-400" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l2.5 2.5"/></svg>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input w-auto">
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>{['Loan ID', 'Customer', 'Type', 'Principal', 'EMI/mo', 'Repaid', 'Next Due', 'Status'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
            : loans.length === 0 ? <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">No loans found.</td></tr>
            : loans.map((l: any) => {
              const pct = l.paidCount / l.tenureMonths * 100;
              return (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="table-td font-mono text-xs text-amber-700 font-semibold">{l.loanNumber}</td>
                  <td className="table-td font-medium text-sm">{l.customer?.name}</td>
                  <td className="table-td"><span className={`badge badge-${l.loanType?.slug}`}>{l.loanType?.icon} {l.loanType?.name}</span></td>
                  <td className="table-td font-semibold">{fmt(l.principalAmount)}</td>
                  <td className="table-td">{fmt(l.emiAmount)}</td>
                  <td className="table-td">
                    <div className="text-xs font-semibold mb-1">{Math.round(pct)}% ({l.paidCount}/{l.tenureMonths})</div>
                    <div className="w-full bg-gray-100 rounded h-1"><div className="h-1 rounded transition-all" style={{ width: `${pct}%`, background: l.status === 'OVERDUE' ? '#E24B4A' : '#BA7517' }} /></div>
                  </td>
                  <td className="table-td text-xs text-gray-500">{l.nextDue ? new Date(l.nextDue).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="table-td"><span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
