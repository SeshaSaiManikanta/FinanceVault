'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, applicationsApi } from '@/lib/api';

export default function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['customers-kyc-pending'],
    queryFn: () => customersApi.list({ kycStatus: 'PENDING' }).then(r => r.data),
  });
  const kycMutation = useMutation({
    mutationFn: ({ id, status }: any) => customersApi.update(id, { kycStatus: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers-kyc-pending'] }),
  });
  const pending = data?.data || [];

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="alert-amber">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1L.5 12.5h12L6.5 1z"/></svg>
          {pending.length} customer(s) awaiting KYC verification
        </div>
      )}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50"><tr>{['Customer','Phone','Type','KYC Status','Action'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
            : pending.length === 0 ? <tr><td colSpan={5} className="table-td text-center py-8 text-green-700">✅ All KYC up to date!</td></tr>
            : pending.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{c.name}</td>
                <td className="table-td text-sm">{c.phone}</td>
                <td className="table-td"><span className="badge badge-pending">{c.customerType}</span></td>
                <td className="table-td"><span className="badge badge-pending">{c.kycStatus}</span></td>
                <td className="table-td">
                  <div className="flex gap-1.5">
                    <button onClick={() => kycMutation.mutate({ id: c.id, status: 'VERIFIED' })} className="btn btn-green btn-sm">✓ Verify</button>
                    <button onClick={() => kycMutation.mutate({ id: c.id, status: 'REJECTED' })} className="btn btn-red btn-sm">✗ Reject</button>
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
