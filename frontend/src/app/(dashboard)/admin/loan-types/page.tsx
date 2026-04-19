'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../../lib/api';
import { useForm } from 'react-hook-form';

export default function AdminLoanTypesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-loan-types'],
    queryFn: () => adminApi.loanTypes().then(r => r.data.data),
  });

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { icon: '💰', color: '#BA7517', minRate: 10, maxRate: 24, defaultRate: 16, assetFieldsRaw: '' },
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => {
      const fields = d.assetFieldsRaw.split('\n').filter(Boolean).map((line: string) => {
        const [label] = line.split(':');
        return { key: label.trim().toLowerCase().replace(/\s+/g, '_'), label: label.trim(), type: 'text', placeholder: label.trim() };
      });
      return adminApi.createLoanType({ ...d, assetFields: fields, tenureOptions: [6,12,24,36,48,60], sortOrder: 10, assetFieldsRaw: undefined });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-loan-types'] }); setShowModal(false); reset(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleLoanType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-loan-types'] }),
  });

  const loanTypes = data || [];
  const watchIcon = watch('icon');
  const watchName = watch('name' as any);
  const watchColor = watch('color');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Manage loan products available to all finance users. Changes apply instantly.</p>
        <button onClick={() => setShowModal(true)} className="btn btn-amber">+ Add Loan Type</button>
      </div>

      {isLoading ? <p className="text-gray-400 text-sm">Loading...</p> : (
        <div className="space-y-3">
          {loanTypes.map((lt: any) => (
            <div key={lt.id} className={`card flex items-center gap-4 ${!lt.isEnabled ? 'opacity-50' : ''}`}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: lt.color + '22' }}>{lt.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm">{lt.name}</p>
                  <span className="text-xs text-gray-400">· {lt.minRate}%–{lt.maxRate}% p.a. · Default: {lt.defaultRate}%</span>
                </div>
                <p className="text-xs text-gray-400">{lt.description}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(typeof lt.assetFields === 'string' ? JSON.parse(lt.assetFields) : lt.assetFields || []).map((f: any) => (
                    <span key={f.key} className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs">{f.label}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toggleMutation.mutate(lt.id)}
                className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${lt.isEnabled ? 'bg-amber-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${lt.isEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold">Add New Loan Product</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="px-6 py-5">
              {error && <div className="alert-red mb-3 text-sm">{error}</div>}
              <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Loan Type Name</label><input {...register('name' as any)} className="input" placeholder="Jewellery Loan" /></div>
                  <div><label className="label">Slug (unique ID)</label><input {...register('slug' as any)} className="input" placeholder="jewellery" /></div>
                  <div><label className="label">Icon (emoji)</label><input {...register('icon')} className="input text-2xl" placeholder="💎" maxLength={2} /></div>
                  <div><label className="label">Color (hex)</label><input {...register('color')} className="input" placeholder="#BA7517" /></div>
                  <div><label className="label">Min Rate (%)</label><input {...register('minRate', { valueAsNumber: true })} type="number" className="input" /></div>
                  <div><label className="label">Max Rate (%)</label><input {...register('maxRate', { valueAsNumber: true })} type="number" className="input" /></div>
                  <div><label className="label">Default Rate (%)</label><input {...register('defaultRate', { valueAsNumber: true })} type="number" className="input" /></div>
                </div>
                <div><label className="label">Description</label><input {...register('description' as any)} className="input" placeholder="Short description" /></div>
                <div>
                  <label className="label">Asset Fields (one per line)</label>
                  <textarea {...register('assetFieldsRaw')} className="input h-24 resize-none" placeholder={'Weight (grams)\nPurity\nMarket Value\nLTV Ratio'} />
                  <p className="text-xs text-gray-400 mt-0.5">One field label per line. These become the asset form fields for this loan type.</p>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: (watchColor || '#BA7517') + '22' }}>{watchIcon || '💰'}</div>
                  <div>
                    <p className="font-semibold text-sm">{watchName || 'New Loan Type'}</p>
                    <p className="text-xs text-gray-400">Preview</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowModal(false)} className="btn">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn btn-amber">{createMutation.isPending ? 'Adding...' : 'Add Loan Type'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
