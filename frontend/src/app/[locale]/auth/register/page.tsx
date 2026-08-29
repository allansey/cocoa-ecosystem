'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Mail, User, ArrowRight, Loader2, Award, CheckCircle2, Sprout, ShoppingBag } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations('Auth');
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'BUYER' | 'FARMER'>('FARMER');
  
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
    if (roleParam?.toUpperCase() === 'BUYER') {
      setRole('BUYER');
    } else if (roleParam?.toUpperCase() === 'FARMER') {
      setRole('FARMER');
    }
  }, [searchParams]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, signInToFirebase, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.push(`/${locale}/dashboard`);
    }
  }, [_hasHydrated, isAuthenticated, router, locale]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { email, password, role, name });
      const { user, token, firebaseToken } = res.data;

      login(user, token);
      if (firebaseToken) await signInToFirebase(firebaseToken);
      
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Branded Showcase */}
        <div className="hidden md:flex md:w-5/12 bg-stone-900 p-8 lg:p-10 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <Image 
              src="/images/hero-burlap-sack.jpg" 
              alt="Premium Ghana Cocoa Beans in Jute Sack" 
              fill 
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-stone-950/60" />
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>COCOBOD Grade-Certified Network</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight leading-snug">
              Direct Agricultural Commerce
            </h2>
            <p className="text-xs text-stone-300 font-normal leading-relaxed">
              Eliminate middlemen exploitation. Secure guaranteed escrow payments and verified bean grading across all regions in Ghana.
            </p>
          </div>

          <div className="relative z-10 space-y-3 pt-6 border-t border-stone-800 text-xs text-stone-300 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Instant Ghana MoMo Payouts (*170# / *110#)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Free IoT Soil Moisture & Weather Telemetry</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>COCOBOD Quality Standards Certification</span>
            </div>
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center">
          
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Your Account</h1>
            <p className="text-xs text-slate-500 font-medium">Select your primary role to get started.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Interactive Role Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select Your Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('FARMER')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                    role === 'FARMER'
                      ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    role === 'FARMER' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Sprout size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Cocoa Farmer</span>
                    <span className="text-[10px] text-slate-500 font-medium">Sell harvests & IoT</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('BUYER')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                    role === 'BUYER'
                      ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    role === 'BUYER' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Licensed Buyer</span>
                    <span className="text-[10px] text-slate-500 font-medium">Source beans in bulk</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Kwame Mensah"
                  className="w-full border border-slate-300 rounded-xl p-3 pl-10 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
                <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  placeholder="e.g. kwame@example.com"
                  className="w-full border border-slate-300 rounded-xl p-3 pl-10 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-xl p-3 pl-10 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
              
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`h-1.5 w-1/4 rounded-full ${strength >= level ? strengthColors[strength] : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Use 8+ characters with uppercase and numbers for best security.
                  </p>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create {role === 'FARMER' ? 'Farmer' : 'Buyer'} Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            Already have an account?{' '}
            <Link href={`/${locale}/auth/login`} className="text-amber-700 font-bold hover:underline">
              Sign in here
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin text-amber-600 mx-auto" size={32} /></div>}>
      <RegisterForm locale={locale} />
    </Suspense>
  );
}
