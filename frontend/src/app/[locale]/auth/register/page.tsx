'use client';
import { useTranslations } from 'next-intl';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations('Auth');
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('BUYER');
  
  // Basic password strength logic
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4);
  };
  const strength = getPasswordStrength(password);
  const strengthColors = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'];

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam?.toUpperCase() === 'FARMER') {
      setRole('FARMER');
    }
  }, [searchParams]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const signInToFirebase = useAuthStore(state => state.signInToFirebase);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { email, password, role, name });
      const { user, token, firebaseToken } = res.data;

      // Log the user in immediately after registration
      login(user, token);

      // Sign into Firebase so Realtime Database rules work
      if (firebaseToken) await signInToFirebase(firebaseToken);

      // Redirect to dashboard
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className={`h-1.5 w-1/4 rounded-full ${strength >= level ? strengthColors[strength] : 'bg-slate-200'}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Password must be at least 8 characters long, contain a number, and an uppercase letter.
              </p>
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors disabled:opacity-50">
          {loading ? 'Registering...' : t('register')}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link href={`/${locale}/auth/login`} className="text-amber-600 font-medium hover:underline">{t('login')}</Link>
      </div>
    </div>
  );
}

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <RegisterForm locale={locale} />
    </Suspense>
  );
}
