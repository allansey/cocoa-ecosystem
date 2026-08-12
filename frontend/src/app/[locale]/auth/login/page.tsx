'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';

import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const signInToFirebase = useAuthStore(state => state.signInToFirebase);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, token, firebaseToken } = res.data;
      
      // Save to Zustand
      login(user, token);

      // Sign into Firebase so Realtime Database rules work
      if (firebaseToken) await signInToFirebase(firebaseToken);
      
      // Redirect to dashboard
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
      <h2 className="text-3xl font-bold text-amber-900 mb-6 text-center">{t('login')}</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
          <input 
            type="email" 
            className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={email} onChange={e => setEmail(e.target.value)} required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
          <input 
            type="password" 
            className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={password} onChange={e => setPassword(e.target.value)} required 
          />
        </div>
        <div className="flex justify-end">
          <Link href={`/${locale}/auth/forgot-password`} className="text-sm text-amber-600 font-medium hover:underline">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors">
          {t('login')}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account? <Link href={`/${locale}/auth/register`} className="text-amber-600 font-medium hover:underline">{t('register')}</Link>
      </div>
    </div>
  );
}
