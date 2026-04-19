'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditApi, settingsApi } from '@/lib/api';
import { useForm } from 'react-hook-form';

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function SecurityPage() {
  const qc = useQueryClient();
  const [pinMsg, setPinMsg] = useState('');

  const { data: logsData } = useQuery({
    queryKey: ['audit'],
    queryFn: () => auditApi.list({ limit: '30' }).then(r => r.data),
  });
  const logs = logsData?.data || [];

  const { register, handleSubmit, reset } = useForm<any>();
  const pinMutation = useMutation({
    mutationFn: (d: any) => settingsApi.updatePin(d),
    onSuccess: () => { setPinMsg('PIN updated successfully!'); reset(); },
    onError: (e: any) => setPinMsg(e.response?.data?.message || 'Failed to update PIN'),
  });

  const severityColor: Record<string, string> = { LOW: 'text-green-700 bg-green-50', MEDIUM: 'text-amber-700 bg-amber-50', HIGH: 'text-red-700 bg-red-50', CRITICAL: 'text-red-800 bg-red-100 font-bold' };

  return (
    <div className="space-y-4">
      {/* Security features */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Active Security Features</h3>
          {[
            { label: 'AES-256 field encryption', sub: 'Aadhaar & PAN encrypted at rest', on: true },
            { label: 'PIN-gated sensitive data', sub: 'View requires 4-digit PIN', on: true },
            { label: 'JWT HttpOnly cookies', sub: 'Tokens not accessible by JavaScript', on: true },
            { label: 'Session auto-timeout', sub: '15-minute inactivity lock', on: true },
            { label: 'Login lockout', sub: '5 failed attempts → 15 min lock', on: true },
            { label: 'Rate limiting', sub: 'Brute force protection on all endpoints', on: true },
            { label: 'HTTPS enforced', sub: 'TLS 1.3 in production', on: true },
            { label: 'Security headers', sub: 'Helmet.js — CSP, HSTS, X-Frame-Options', on: true },
          ].map(f => (
            <div key={f.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-gray-400">{f.sub}</p>
              </div>
              <span className="badge badge-verified text-xs">Active</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Change Security PIN</h3>
          <form onSubmit={handleSubmit(d => pinMutation.mutate(d))} className="space-y-3">
            <div>
              <label className="label">Current PIN</label>
              <input {...register('currentPin')} type="password" maxLength={4} className="input" placeholder="••••" />
            </div>
            <div>
              <label className="label">New PIN (4 digits)</label>
              <input {...register('newPin')} type="password" maxLength={4} className="input" placeholder="••••" />
            </div>
            <button type="submit" disabled={pinMutation.isPending} className="btn btn-amber w-full justify-center">Update PIN</button>
            {pinMsg && <p className={`text-xs text-center ${pinMsg.includes('success') ? 'text-green-700' : 'text-red-700'}`}>{pinMsg}</p>}
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold mb-2">Security Summary</h4>
            <div className="space-y-2 text-sm">
              {[
                ['Security Level', <span className="text-green-700 font-semibold">High</span>],
                ['Sensitive views', <span>{logs.filter((l: any) => l.severity !== 'LOW').length} (PIN verified)</span>],
                ['Failed logins', <span>{logs.filter((l: any) => l.action === 'FAILED_LOGIN').length}</span>],
              ].map(([k, v]: any) => (
                <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span>{v}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">Audit Log <span className="text-gray-400 font-normal text-xs">({logs.length} events)</span></h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">No audit events yet.</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold flex-shrink-0 mt-0.5 ${severityColor[log.severity] || 'text-gray-500 bg-gray-50'}`}>{log.severity}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.action}</p>
                  {log.details && <p className="text-xs text-gray-400 truncate">{log.details}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
