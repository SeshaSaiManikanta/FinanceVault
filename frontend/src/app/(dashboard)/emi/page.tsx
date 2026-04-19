'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repaymentsApi, loansApi } from '@/lib/api';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

export default function EMIPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['emi-due-today'],
    queryFn: () => repaymentsApi.dueToday().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const payMutation = useMutation({
    mutationFn: ({ loanId, repaymentId }: any) => loansApi.pay(loanId, repaymentId, { paymentMethod: 'cash' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emi-due-today'] }),
  });

  const due = data || [];
  const total = due.reduce((s: number, r: any) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4">
      {due.length > 0 && (
        <div className="alert-amber">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="6"/><path d="M6.5 3.5v3l2 1.5"/></svg>
          <span><strong>{due.length} EMIs</strong> due today — total {fmt(total)}</span>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>{['Customer', 'Loan ID', 'Type', 'EMI Amount', 'Due Date', 'EMI #', 'Status', 'Action'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
            : due.length === 0 ? <tr><td colSpan={8} className="table-td text-center py-8 text-green-700">🎉 No EMIs due today!</td></tr>
            : due.map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{r.loan?.customer?.name}</td>
                <td className="table-td font-mono text-xs text-amber-700">{r.loan?.loanNumber}</td>
                <td className="table-td"><span className={`badge badge-${r.loan?.loanType?.slug}`}>{r.loan?.loanType?.icon} {r.loan?.loanType?.name}</span></td>
                <td className="table-td font-semibold">{fmt(r.totalAmount)}</td>
                <td className="table-td text-xs">{new Date(r.dueDate).toLocaleDateString('en-IN')}</td>
                <td className="table-td text-sm">{r.installmentNo}</td>
                <td className="table-td"><span className="badge badge-pending">{r.status}</span></td>
                <td className="table-td">
                  <button
                    onClick={() => payMutation.mutate({ loanId: r.loanId, repaymentId: r.id })}
                    disabled={payMutation.isPending}
                    className="btn btn-green btn-sm"
                  >Mark Paid</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
