'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const ALERT_TYPES = [
  { key: 'emiDue', label: 'EMI Due Reminders', desc: '3 days before & day of due date' },
  { key: 'payment', label: 'Payment Received', desc: 'On every successful EMI payment' },
  { key: 'overdue', label: 'Overdue Alerts', desc: 'Immediate alert when EMI is missed' },
  { key: 'kyc', label: 'KYC Updates', desc: 'When KYC is approved or rejected' },
];

export default function AlertsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['alert-prefs'],
    queryFn: () => settingsApi.getAlerts().then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (prefs: any) => settingsApi.updateAlerts(prefs),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alert-prefs'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const prefs = data?.alertPrefs || {};

  const toggle = (alertKey: string, channel: 'email' | 'sms' | 'whatsapp') => {
    const current = prefs[alertKey]?.[channel] ?? false;
    const updated = { ...prefs, [alertKey]: { ...(prefs[alertKey] || {}), [channel]: !current } };
    saveMutation.mutate(updated);
  };

  if (isLoading) return <div className="text-sm text-gray-400 p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      {saved && <div className="alert-green">Alert preferences saved!</div>}

      <div className="card">
        <h3 className="text-sm font-semibold mb-1">Email Alerts</h3>
        <p className="text-xs text-gray-400 mb-4">Connected: {user?.email}</p>
        <div className="space-y-3">
          {ALERT_TYPES.map(t => (
            <div key={t.key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-gray-400">{t.desc}</p></div>
              <button
                onClick={() => toggle(t.key, 'email')}
                className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${prefs[t.key]?.email ? 'bg-amber-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[t.key]?.email ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-1">SMS / WhatsApp Alerts</h3>
        <p className="text-xs text-gray-400 mb-4">Mobile: {user?.phone || 'Not set'}</p>
        <div className="space-y-3">
          {ALERT_TYPES.map(t => (
            <div key={t.key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-gray-400">{t.desc}</p></div>
              <button
                onClick={() => toggle(t.key, 'sms')}
                className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${prefs[t.key]?.sms ? 'bg-amber-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[t.key]?.sms ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-3">Test Alerts</h3>
        <p className="text-xs text-gray-400 mb-4">Send a test notification to verify your settings are working.</p>
        <div className="flex gap-3 flex-wrap">
          {[['📧 Test Email', 'email'], ['📱 Test SMS', 'sms'], ['💬 Test WhatsApp', 'whatsapp']].map(([label, ch]) => (
            <button key={ch} onClick={() => alert(`Test ${ch} sent to ${ch === 'email' ? user?.email : user?.phone}\n\nIn production this calls:\n• Email: Resend API\n• SMS: MSG91 / Twilio\n• WhatsApp: WABA API`)} className="btn">
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <strong>Production integration:</strong> Connect MSG91 (India SMS), Resend (email), and Twilio WhatsApp API by adding the keys to your <code>.env</code> file.
        </div>
      </div>
    </div>
  );
}
