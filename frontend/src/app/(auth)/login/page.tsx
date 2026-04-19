'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError('');
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.data.data.user, res.data.data.accessToken);
      router.push('/dashboard');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-950 px-8 py-7 text-center">
          <div className="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="9" fill="rgba(255,255,255,.15)"/>
              <path d="M7 11.5l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-serif text-xl text-white mb-1">VaultFinance</h1>
          <p className="text-gray-400 text-sm">Secure Gold & Vehicle Loan Management</p>
        </div>

        {/* Form */}
        <div className="px-8 py-7">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

          {error && (
            <div className="alert-red mb-4 text-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="6"/><path d="M7 4v3M7 8.5v.5"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input {...register('email')} type="email" placeholder="you@company.com" className="input" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input {...register('password')} type="password" placeholder="••••••••" className="input" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-950 text-white rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In Securely'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link href="/register" className="text-amber-600 font-semibold hover:underline">
              Create one free
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-3">
            Demo: demo@sriramnance.com / Demo@123!
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        © {new Date().getFullYear()} VaultFinance. All Rights Reserved.
      </p>
    </div>
  );
}
