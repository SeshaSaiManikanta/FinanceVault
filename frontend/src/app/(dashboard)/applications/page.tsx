'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, customersApi, adminApi, api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function calcEMI(p: number, r: number, n: number) {
  const mr = r / 12 / 100;
  return mr === 0 ? p / n : (p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
}

const appSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  loanTypeId: z.string().min(1, 'Select loan type'),
  principalAmount: z.number({ coerce: true }).positive('Enter amount'),
  interestRate: z.number({ coerce: true }).min(1).max(50),
  tenureMonths: z.number({ coerce: true }).int().min(1),
  processingFee: z.number({ coerce: true }).min(0).default(0),
});
type AppForm = z.infer<typeof appSchema>;

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [assetData, setAssetData] = useState<Record<string, string>>({});
  const [emiPreview, setEmiPreview] = useState<{ emi: number; interest: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const { data: appsData, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list({ status: 'PENDING' }).then(r => r.data),
  });
  const { data: custsData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.list({ limit: '100' }).then(r => r.data),
  });
  const { data: loanTypesData } = useQuery({
    queryKey: ['loan-types'],
    queryFn: () => api.get('/loans/types').then(r => r.data.data),
  });

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<AppForm>({
    resolver: zodResolver(appSchema),
    defaultValues: { processingFee: 0 },
  });

  const watchedLoanTypeId = watch('loanTypeId');
  const watchedAmount = watch('principalAmount');
  const watchedRate = watch('interestRate');
  const watchedTenure = watch('tenureMonths');

  const selectedLoanType = (loanTypesData || []).find((lt: any) => lt.id === watchedLoanTypeId);

  // Update EMI preview on field changes
  const updateEMI = () => {
    const p = Number(watchedAmount), r = Number(watchedRate), n = Number(watchedTenure);
    if (p > 0 && r > 0 && n > 0) {
      const e = calcEMI(p, r, n);
      setEmiPreview({ emi: e, interest: e * n - p, total: e * n });
    } else setEmiPreview(null);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => applicationsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setShowModal(false); reset(); setAssetData({}); setEmiPreview(null); },
    onError: (e: any) => setError(e.response?.data?.message || 'Failed to submit'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); alert('Loan approved and disbursed!'); },
    onError: (e: any) => alert(e.response?.data?.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) => applicationsApi.reject(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setRejectId(''); setRejectReason(''); },
  });

  const apps = appsData?.data || [];
  const customers = custsData?.data || [];
  const loanTypes = loanTypesData || [];

  const onSubmit = (data: AppForm) => {
    createMutation.mutate({ ...data, assetDetails: assetData });
  };

  const stageColors: Record<string, string> = {
    KYC_CHECK: 'badge-pending', DOC_VERIFICATION: 'badge-pending',
    ASSET_VALUATION: 'badge-pending', CREDIT_ASSESSMENT: 'badge-pending',
    MANAGER_APPROVAL: 'badge-active',
  };
  const stageLabels: Record<string, string> = {
    KYC_CHECK: 'KYC Check', DOC_VERIFICATION: 'Doc Verification',
    ASSET_VALUATION: 'Asset Valuation', CREDIT_ASSESSMENT: 'Credit Check',
    MANAGER_APPROVAL: 'Ready to Approve',
  };

  return (
    <div className="space-y-4">
      {apps.length > 0 && (
        <div className="alert-amber">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x=".5" y="1.5" width="12" height="10" rx="1.5"/><path d="M.5 5.5h12"/></svg>
          {apps.length} application(s) pending review and approval
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">{apps.length} pending applications</div>
        <button onClick={() => { setShowModal(true); setError(''); }} className="btn btn-amber">+ New Application</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>{['App ID','Customer','Loan Type','Amount','EMI/mo','Asset','Stage','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">Loading...</td></tr>
              : apps.length === 0
              ? <tr><td colSpan={8} className="table-td text-center py-8 text-gray-400">No pending applications. <button onClick={() => setShowModal(true)} className="text-amber-600 hover:underline">Create one →</button></td></tr>
              : apps.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-td font-mono text-xs text-amber-700 font-semibold">{a.applicationNo?.slice(-8)}</td>
                  <td className="table-td">
                    <p className="font-medium text-sm">{a.customer?.name}</p>
                    <p className="text-xs text-gray-400">{a.customer?.phone}</p>
                  </td>
                  <td className="table-td"><span className={`badge badge-${a.loanType?.slug}`}>{a.loanType?.icon} {a.loanType?.name}</span></td>
                  <td className="table-td font-semibold">{fmt(a.principalAmount)}</td>
                  <td className="table-td text-sm">{a.emiAmount ? fmt(a.emiAmount) : '—'}</td>
                  <td className="table-td text-xs text-gray-500 max-w-[120px] truncate">
                    {a.assetDetails && Object.values(a.assetDetails as Record<string,string>).filter(Boolean).slice(0,2).join(' · ') || '—'}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${stageColors[a.stage] || 'badge-pending'}`}>{stageLabels[a.stage] || a.stage}</span>
                  </td>
                  <td className="table-td">
                    {rejectId === a.id ? (
                      <div className="flex gap-1 items-center">
                        <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason..." className="input text-xs py-1 w-28" />
                        <button onClick={() => rejectMutation.mutate({ id: a.id, reason: rejectReason })} className="btn btn-red btn-sm">Confirm</button>
                        <button onClick={() => setRejectId('')} className="btn btn-sm">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => approveMutation.mutate(a.id)} disabled={approveMutation.isPending} className="btn btn-green btn-sm">✓ Approve</button>
                        <button onClick={() => setRejectId(a.id)} className="btn btn-red btn-sm">✗ Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* New Application Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold">New Loan Application</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="px-6 py-5">
              {error && <div className="alert-red mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Step 1: Customer & Loan Type */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Step 1 — Select Customer & Loan Type</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Customer</label>
                      <select {...register('customerId')} className="input">
                        <option value="">Select customer...</option>
                        {customers.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name} — {c.phone} {c.kycStatus !== 'VERIFIED' ? '⚠️ KYC pending' : ''}</option>
                        ))}
                      </select>
                      {errors.customerId && <p className="text-red-500 text-xs mt-0.5">{errors.customerId.message}</p>}
                    </div>
                    <div>
                      <label className="label">Loan Type</label>
                      <select {...register('loanTypeId')} onChange={e => { 
                        setValue('loanTypeId', e.target.value); 
                        const lt = loanTypes.find((t: any) => t.id === e.target.value); 
                        if (lt) {
                          setValue('interestRate', lt.defaultRate || 12);
                        }
                      }} className="input">
                        <option value="">Select loan type...</option>
                        {loanTypes.map((lt: any) => (
                          <option key={lt.id} value={lt.id}>{lt.icon} {lt.name} ({lt.minRate}%–{lt.maxRate}% p.a.)</option>
                        ))}
                      </select>
                      {errors.loanTypeId && <p className="text-red-500 text-xs mt-0.5">{errors.loanTypeId.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Step 2: Loan Terms */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Step 2 — Loan Terms</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Principal Amount (₹)</label>
                      <input {...register('principalAmount')} type="number" placeholder="100000" className="input" onChange={e => { register('principalAmount').onChange(e); setTimeout(updateEMI, 0); }} />
                      {errors.principalAmount && <p className="text-red-500 text-xs mt-0.5">{errors.principalAmount.message}</p>}
                    </div>
                    <div>
                      <label className="label">Interest Rate (% p.a.)</label>
                      <input {...register('interestRate')} type="number" step="0.1" placeholder="14" className="input" onChange={e => { register('interestRate').onChange(e); setTimeout(updateEMI, 0); }} />
                    </div>
                    <div>
                      <label className="label">Tenure (months)</label>
                      <select {...register('tenureMonths')} className="input" onChange={e => { register('tenureMonths').onChange(e); setTimeout(updateEMI, 0); }}>
                        <option value="">Select...</option>
                        {selectedLoanType ? (
                          Array.isArray(selectedLoanType.tenureOptions) 
                            ? selectedLoanType.tenureOptions.map((t: number) => (
                                <option key={t} value={t}>{t} months</option>
                              ))
                            : typeof selectedLoanType.tenureOptions === 'string'
                            ? JSON.parse(selectedLoanType.tenureOptions).map((t: number) => (
                                <option key={t} value={t}>{t} months</option>
                              ))
                            : [6,12,24,36,48,60].map((t: number) => (
                                <option key={t} value={t}>{t} months</option>
                              ))
                        ) : (
                          [6,12,24,36,48,60].map((t: number) => (
                            <option key={t} value={t}>{t} months</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="label">Processing Fee (₹)</label>
                      <input {...register('processingFee')} type="number" placeholder="500" className="input" />
                    </div>
                  </div>

                  {emiPreview && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 grid grid-cols-3 gap-3 text-center">
                      {[['Monthly EMI', fmt(emiPreview.emi)], ['Total Interest', fmt(emiPreview.interest)], ['Total Repayment', fmt(emiPreview.total)]].map(([l, v]) => (
                        <div key={l as string}><p className="text-xs text-amber-700 font-medium mb-0.5">{l}</p><p className="text-base font-semibold text-amber-900">{v}</p></div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 3: Asset Details (dynamic) */}
                {selectedLoanType && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Step 3 — {selectedLoanType.icon} {selectedLoanType.name} Asset Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {(typeof selectedLoanType.assetFields === 'string' ? JSON.parse(selectedLoanType.assetFields) : selectedLoanType.assetFields || []).map((f: any) => (
                        <div key={f.key}>
                          <label className="label">{f.label}</label>
                          {f.type === 'select'
                            ? <select className="input" value={assetData[f.key] || ''} onChange={e => setAssetData(p => ({ ...p, [f.key]: e.target.value }))}>
                                <option value="">Select...</option>
                                {(f.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            : <input type={f.type || 'text'} placeholder={f.placeholder || ''} className="input" value={assetData[f.key] || ''} onChange={e => setAssetData(p => ({ ...p, [f.key]: e.target.value }))} />
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)} className="btn">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn btn-amber">{createMutation.isPending ? 'Submitting...' : 'Submit Application'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
