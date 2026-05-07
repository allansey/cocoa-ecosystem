'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('BUYER');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', { email, password, role, name });
      // Redirect to login after successful registration
      router.push(`/${locale}/auth/login`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const [name, setName] = useState('');

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
      <h2 className="text-3xl font-bold text-amber-900 mb-6 text-center">{t('register')}</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input 
            type="text" 
            className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={name} onChange={e => setName(e.target.value)} required 
            placeholder="e.g. Kofi Mensah"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('role')}</label>
          <select 
            className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            value={role} onChange={e => setRole(e.target.value)}
          >
            <option value="BUYER">{t('buyer')}</option>
            <option value="FARMER">{t('farmer')}</option>
          </select>
        </div>
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
        <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors">
          {t('register')}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link href={`/${locale}/auth/login`} className="text-amber-600 font-medium hover:underline">{t('login')}</Link>
      </div>
    </div>
  );
}
