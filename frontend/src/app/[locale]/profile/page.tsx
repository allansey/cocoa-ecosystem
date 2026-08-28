'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, Phone, Mail, Lock, Save, Loader2, ArrowLeft, Star, Award, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface ReviewData {
  averageRating: number;
  totalReviews: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    badges: string;
    createdAt: string;
    user: { name: string; role: string };
  }>;
}

export default function ProfilePage({ params: { locale } }: { params: { locale: string } }) {
  const { user, login, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [reviewStats, setReviewStats] = useState<ReviewData | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
    } else if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');

      // Fetch user reviews and trust score
      api.get(`/reviews/user/${user.id}`)
        .then(res => setReviewStats(res.data))
        .catch(err => console.warn('Could not fetch reviews:', err));
    }
  }, [_hasHydrated, isAuthenticated, user, router, locale]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/auth/profile', { name, phone, password });
      login(res.data, useAuthStore.getState().token!);
      setSuccess('Profile updated successfully!');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!_hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-amber-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-8 font-bold">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-8 sm:p-10 space-y-8">
        
        {/* Header Profile Info */}
        <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-500 rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
            <User size={40} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{user.name || 'Your Profile'}</h1>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {user.role}
              </span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Verified Trust & Rating Card */}
        <div className="bg-gradient-to-br from-amber-50/80 via-emerald-50/50 to-amber-50/40 rounded-2xl p-5 border border-amber-200/70 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Star size={18} className="fill-white" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Trust & Reputation Score</h3>
                <p className="text-[10px] text-slate-500 font-medium">Verified by Transporters & Trading Partners</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-amber-900">{reviewStats?.averageRating || '5.0'}</span>
              <span className="text-xs text-amber-700 font-bold ml-1">/ 5.0</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] font-bold bg-white text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-xs">
              <ShieldCheck size={13} className="text-emerald-600" /> COCOBOD Verified Partner
            </span>
            <span className="text-[11px] font-bold bg-white text-amber-900 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1 shadow-xs">
              <Award size={13} className="text-amber-600" /> {reviewStats?.totalReviews || 0} Successful Orders
            </span>
          </div>

          {/* Recent feedback snippet */}
          {reviewStats?.reviews && reviewStats.reviews.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200/50 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latest Partner Reviews:</span>
              {reviewStats.reviews.slice(0, 2).map(r => (
                <div key={r.id} className="bg-white/90 rounded-xl p-2.5 text-xs text-slate-700 border border-amber-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">{r.user.name} ({r.user.role})</span>
                    <span className="text-amber-500 font-black">{'⭐'.repeat(r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-slate-600 italic">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold border border-red-100">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl font-bold border border-emerald-100">{success}</div>}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium text-sm"
                value={name} onChange={e => setName(e.target.value)} required 
              />
              <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 bg-slate-100 text-slate-400 cursor-not-allowed font-medium text-sm"
                value={user.email} disabled 
              />
              <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest ml-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Ghana Phone Number</label>
            <div className="relative">
              <input 
                type="tel" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium text-sm"
                placeholder="+233 XX XXX XXXX"
                value={phone} onChange={e => setPhone(e.target.value)} 
              />
              <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">New Password (leave blank to keep current)</label>
            <div className="relative">
              <input 
                type="password" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium text-sm"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} 
              />
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>Save Profile Settings</span>
          </button>
        </form>
      </div>
    </div>
  );
}
