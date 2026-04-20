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
  name: z.string().min(2, 'Min 2 characters'),
  companyName: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Must include uppercase, lowercase, number & special char'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit Indian mobile').optional().or(z.literal('')),
  securityPin: z.string().regex(/^\d{4}$/, '4 digits required').optional().or(z.literal('')),
  plan: z.enum(['TRIAL', 'MONTHLY', 'YEARLY']),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'TRIAL' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError('');
    try {
      const res = await authApi.register(data);
      setAuth(res.data.data.user, res.data.data.accessToken);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const Field = ({ name, label, type = 'text', placeholder }: any) => (
    <div>
      <label className="label">{label}</label>
      <input {...register(name)} type={type} placeholder={placeholder} className="input" />
      {errors[name as keyof typeof errors] && (
        <p className="text-red-500 text-xs mt-1">{(errors[name as keyof typeof errors] as any)?.message}</p>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gray-950 px-8 py-6 text-center">
          <div className="w-11 h-11 rounded-full bg-yellow-600 flex items-center justify-center mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 10.5l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-serif text-xl text-white">VaultFinance</h1>
          <p className="text-gray-400 text-xs mt-1">Start your 30-day free trial</p>
        </div>

        <div className="px-8 py-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create your account</h2>

          {error && <div className="alert-red mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field name="name" label="Your Name" placeholder="Ravi Kumar" />
              <Field name="companyName" label="Shop / Company" placeholder="Sri Ram Finance" />
            </div>
            <Field name="email" label="Email Address" type="email" placeholder="you@shop.com" />
            <div className="grid grid-cols-2 gap-3">
              <Field name="password" label="Password" type="password" placeholder="Min 8 chars" />
              <Field name="phone" label="Mobile (optional)" placeholder="9876543210" />
            </div>
            <Field name="securityPin" label="Security PIN (4 digits — protects Aadhaar/PAN)" type="password" placeholder="e.g. 1234" />

            <div>
              <label className="label">Plan</label>
              <select {...register('plan')} className="input">
                <option value="TRIAL">Free Trial — 30 days full access</option>
                <option value="MONTHLY">Monthly — ₹20/month</option>
                <option value="YEARLY">Yearly — ₹150/year (best value)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-950 text-white rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account & Start Free Trial'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
