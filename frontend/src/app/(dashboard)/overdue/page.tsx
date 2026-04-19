'use client';
import { useQuery } from '@tanstack/react-query';
import { repaymentsApi } from '@/lib/api';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

export default function OverduePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['overdue'],
    queryFn: () => repaymentsApi.overdue().then(r => r.data.data),
  });
  const overdue = data || [];
  const total = overdue.reduce((s: number, r: any) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="alert-red">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1L.5 12.5h12L6.5 1z"/><path d="M6.5 5v3M6.5 9.5v.8"/></svg>
          <span><strong>{overdue.length} overdue accounts</strong> — total outstanding {fmt(total)}</span>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>{['Customer', 'Loan ID', 'Type', 'Overdue Amt', 'Days Late', 'Phone', 'Action'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
            : overdue.length === 0 ? <tr><td colSpan={7} className="table-td text-center py-8 text-green-700">🎉 No overdue accounts!</td></tr>
            : overdue.map((r: any) => {
              const daysLate = Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000);
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{r.loan?.customer?.name}</td>
                  <td className="table-td font-mono text-xs text-amber-700">{r.loan?.loanNumber}</td>
                  <td className="table-td"><span className={`badge badge-${r.loan?.loanType?.slug}`}>{r.loan?.loanType?.icon} {r.loan?.loanType?.name}</span></td>
                  <td className="table-td font-semibold text-red-700">{fmt(r.totalAmount)}</td>
                  <td className="table-td"><span className="badge badge-overdue">{daysLate}d late</span></td>
                  <td className="table-td text-sm">{r.loan?.customer?.phone}</td>
                  <td className="table-td">
                    <div className="flex gap-1.5">
                      <button onClick={() => alert(`Calling ${r.loan?.customer?.phone}...`)} className="btn btn-sm">📞 Call</button>
                      <button onClick={() => alert(`SMS reminder sent to ${r.loan?.customer?.name}`)} className="btn btn-sm">📱 SMS</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
