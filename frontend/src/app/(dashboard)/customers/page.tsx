'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS']),
  aadhaar: z.string().regex(/^\d{12}$/, '12 digits').optional().or(z.literal('')),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional().or(z.literal('')),
  kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
});
type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [revealData, setRevealData] = useState<Record<string, any>>({});
  const [pinState, setPinState] = useState<{ open: boolean; custId: string; fields: string[] }>({ open: false, custId: '', fields: [] });
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, kycFilter],
    queryFn: () => customersApi.list({ search, kycStatus: kycFilter || undefined }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerType: 'INDIVIDUAL', kycStatus: 'PENDING' },
  });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowModal(false); reset(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Failed to add customer'),
  });

  const kycMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => customersApi.update(id, { kycStatus: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const revealMutation = useMutation({
    mutationFn: ({ id, pin, fields }: any) => customersApi.reveal(id, pin, fields),
    onSuccess: (res, vars) => {
      setRevealData(prev => ({ ...prev, [vars.id]: res.data.data }));
      setPinState({ open: false, custId: '', fields: [] });
      setPin(''); setPinErr('');
    },
    onError: (e: any) => setPinErr(e.response?.data?.message || 'Incorrect PIN'),
  });

  const handleReveal = (custId: string) => {
    if (revealData[custId]) { setRevealData(prev => { const n = {...prev}; delete n[custId]; return n; }); return; }
    setPinState({ open: true, custId, fields: ['aadhaar', 'pan'] });
    setPin(''); setPinErr('');
  };

  const submitPin = () => {
    if (pin.length !== 4) { setPinErr('Enter 4-digit PIN'); return; }
    revealMutation.mutate({ id: pinState.custId, pin, fields: pinState.fields });
  };

  const customers = data?.data || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone..." className="input pl-8 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
          <svg className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-600" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l2.5 2.5"/></svg>
        </div>
        <select value={kycFilter} onChange={e => setKycFilter(e.target.value)} className="input w-auto dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
          <option value="">All KYC</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button onClick={() => setShowModal(true)} className="btn btn-amber">+ Add Customer</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Customer', 'Phone', 'KYC', 'Loans', 'Outstanding', 'Aadhaar', 'PAN', 'Actions'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">No customers found. Add your first customer!</td></tr>
            ) : customers.map((c: any) => {
              const revealed = revealData[c.id];
              const outstandingAmount = c.loans?.reduce((sum: number, loan: any) => {
                if (['ACTIVE', 'OVERDUE'].includes(loan.status)) {
                  return sum + (loan.principalAmount - loan.paidAmount);
                }
                return sum;
              }, 0) || 0;
              return (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="table-td">
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.customerType}</p>
                    </div>
                  </td>
                  <td className="table-td text-sm">{c.phone}</td>
                  <td className="table-td">
                    <span className={`badge badge-${c.kycStatus === 'VERIFIED' ? 'verified' : 'pending'}`}>{c.kycStatus}</span>
                    {c.kycStatus === 'PENDING' && (
                      <button onClick={() => kycMutation.mutate({ id: c.id, status: 'VERIFIED' })} className="ml-2 text-xs text-green-700 dark:text-green-400 hover:underline">Verify</button>
                    )}
                  </td>
                  <td className="table-td text-sm font-semibold">{c._count?.loans || 0}</td>
                  <td className="table-td text-sm font-semibold text-amber-700 dark:text-amber-400">{fmt(outstandingAmount)}</td>
                  <td className="table-td font-mono text-xs">{revealed?.aadhaar || '••••-••••-????'}</td>
                  <td className="table-td font-mono text-xs">{revealed?.pan || '••••••••••'}</td>
                  <td className="table-td space-x-1 flex">
                    <button onClick={() => handleReveal(c.id)} className="btn btn-sm text-xs">
                      {revealed ? '🔒' : '🔓'}
                    </button>
                    <button onClick={() => router.push(`/loans?customerId=${c.id}`)} className="btn btn-sm btn-amber text-xs">Loans</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PIN Modal */}
      {pinState.open && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-7 w-72 text-center shadow-2xl">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#BA7517" strokeWidth="1.5"><path d="M10 1L2 4.5v5C2 14.5 5.5 18.5 10 19.5c4.5-1 8-5 8-10v-5L10 1z"/></svg>
            </div>
            <h3 className="font-semibold mb-1 dark:text-gray-100">Security PIN Required</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Enter your 4-digit PIN to view Aadhaar & PAN</p>
            {/* PIN dots */}
            <div className="flex gap-2 justify-center mb-4">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full border-2 transition-colors ${pin.length > i ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`} />
              ))}
            </div>
            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (k === '⌫') setPin(p => p.slice(0,-1));
                    else if (k !== '' && pin.length < 4) setPin(p => p + k);
                  }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors ${k === '' ? 'invisible' : ''}`}
                >
                  {k}
                </button>
              ))}
            </div>
            {pinErr && <p className="text-red-500 text-xs mb-2">{pinErr}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setPinState({ open: false, custId: '', fields: [] }); setPin(''); setPinErr(''); }} className="btn flex-1 justify-center text-sm">Cancel</button>
              <button onClick={submitPin} disabled={revealMutation.isPending} className="btn btn-amber flex-1 justify-center text-sm">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold dark:text-gray-100">Add New Customer</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 text-xl">×</button>
            </div>
            <div className="px-6 py-5">
              {error && <div className="alert-red mb-3 text-sm">{error}</div>}
              <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Full Name</label><input {...register('name')} className="input" placeholder="Ravi Kumar" />{errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name.message}</p>}</div>
                  <div><label className="label">Phone / WhatsApp</label><input {...register('phone')} className="input" placeholder="9876543210" />{errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone.message}</p>}</div>
                  <div><label className="label">Aadhaar (12 digits)</label><input {...register('aadhaar')} className="input" placeholder="XXXX XXXX XXXX" maxLength={12} />{errors.aadhaar && <p className="text-red-500 text-xs mt-0.5">{errors.aadhaar.message}</p>}</div>
                  <div><label className="label">PAN</label><input {...register('pan')} className="input" placeholder="ABCDE1234F" maxLength={10} style={{ textTransform: 'uppercase' }} />{errors.pan && <p className="text-red-500 text-xs mt-0.5">{errors.pan.message}</p>}</div>
                  <div><label className="label">KYC Status</label><select {...register('kycStatus')} className="input"><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option></select></div>
                  <div><label className="label">Type</label><select {...register('customerType')} className="input"><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select></div>
                </div>
                <div><label className="label">Address</label><input {...register('address')} className="input" placeholder="Street, City, PIN" /></div>
                <div><label className="label">Email (for alerts)</label><input {...register('email')} type="email" className="input" placeholder="customer@email.com" /></div>
                <div className="alert-blue text-xs">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="5"/><path d="M6 3.5v3M6 7.5v.5"/></svg>
                  Aadhaar & PAN are encrypted with AES-256 before storage. Only accessible via PIN.
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="btn">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn btn-amber">{createMutation.isPending ? 'Saving...' : 'Add & Encrypt'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
