'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, Phone, Mail, Lock, Save, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage({ params: { locale } }: { params: { locale: string } }) {
  const { user, login, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
    }
  }, [isAuthenticated, router, locale]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/auth/profile', { name, phone, password });
      login(res.data, useAuthStore.getState().token!); // Update store with new user info
      setSuccess('Profile updated successfully!');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-8 font-bold">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-10">
        <div className="flex items-center gap-6 mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <User size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Your Profile</h1>
            <p className="text-slate-500 font-medium">Manage your personal information and security.</p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold border border-red-100">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 font-bold border border-emerald-100">{success}</div>}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium"
                value={name} onChange={e => setName(e.target.value)} required 
              />
              <User className="absolute left-4 top-4 text-slate-400" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-4 bg-slate-100 text-slate-400 cursor-not-allowed font-medium"
                value={user.email} disabled 
              />
              <Mail className="absolute left-4 top-4 text-slate-300" size={20} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest ml-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Phone Number</label>
            <div className="relative">
              <input 
                type="tel" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium"
                value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +233 ..."
              />
              <Phone className="absolute left-4 top-4 text-slate-400" size={20} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-8">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Change Password</label>
            <div className="relative">
              <input 
                type="password" 
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current"
              />
              <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-amber-600/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
