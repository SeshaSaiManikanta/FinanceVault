'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ResetPinPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-pin', { token, newPin: pin });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to reset PIN. The link may have expired. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">PIN Reset Successful</h2>
          <p className="text-gray-600 text-sm mb-6">Your security PIN has been reset. Redirecting to login...</p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Security PIN</h1>
        <p className="text-gray-600 text-sm mb-6">Enter your new 4-digit security PIN below.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              New PIN (4 digits)
            </label>
            <input
              type="text"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
              maxLength={4}
              placeholder="0000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
            />
          </div>

          <div>
            <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm PIN
            </label>
            <input
              type="text"
              id="confirmPin"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
              maxLength={4}
              placeholder="0000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Resetting...' : 'Reset PIN'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
