'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, Award, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { login, signInToFirebase, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.push(`/${locale}/dashboard`);
    }
  }, [_hasHydrated, isAuthenticated, router, locale]);

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
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Branded Visual Showcase (Desktop/Tablet) */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-amber-950 via-amber-900 to-slate-950 p-8 lg:p-10 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-45 pointer-events-none">
            <Image 
              src="/images/hero-harvest-pods.jpg" 
              alt="Ghana Cocoa Pods Harvest" 
              fill 
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-amber-950/80 to-transparent" />
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>COCOBOD Certified Exchange</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight leading-snug">
              Empowering Ghana's Cocoa Value Chain
            </h2>
            <p className="text-xs text-amber-100/80 font-normal leading-relaxed">
              Direct farmer-to-buyer transactions, IoT moisture verification, and instant Ghana Mobile Money escrow settlements.
            </p>
          </div>

          <div className="relative z-10 space-y-2.5 pt-6 border-t border-white/10 text-xs text-amber-200/90 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>100% Escrow Protection via MTN & Telecel</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Live In-Chat Bargaining & Counter-Offers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>AI Crop Disease Diagnosis in Twi & English</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Login Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
          
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to CocoaLink</h1>
            <p className="text-xs text-slate-500 font-medium">Enter your email and password to access your dashboard.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  placeholder="e.g. kofi.mensah@gmail.com"
                  className="w-full border border-slate-300 rounded-xl p-3 pl-10 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <Link href={`/${locale}/auth/forgot-password`} className="text-xs text-amber-700 font-bold hover:underline">
                  Forgot password?
                </Link>
              </div>
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
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            Don't have an account yet?{' '}
            <Link href={`/${locale}/auth/register`} className="text-amber-700 font-bold hover:underline">
              Create an account
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
