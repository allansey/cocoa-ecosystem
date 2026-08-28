'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, Lock, KeyRound } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'RESET' | 'SUCCESS'>('REQUEST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Reset token generated.');
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
      setStep('RESET');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        token: resetToken,
        newPassword
      });
      setMessage(res.data.message || 'Password has been reset successfully.');
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <Link
        href={`/${locale}/auth/login`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-amber-600 font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Login
      </Link>

      {step === 'SUCCESS' ? (
        <div className="text-center py-6 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Password Reset Complete</h2>
          <p className="text-slate-500 text-sm">
            Your password has been successfully updated. You can now login with your new credentials.
          </p>
          <Link 
            href={`/${locale}/auth/login`} 
            className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors text-center"
          >
            Login to Your Account
          </Link>
        </div>
      ) : step === 'RESET' ? (
        <>
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound size={28} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 text-center">Set New Password</h2>
            <p className="text-slate-500 text-sm text-center mt-2">
              Enter your new secure password for <strong>{email}</strong>.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium border border-red-100">{error}</div>
          )}

          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-medium"
                />
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={16} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl mt-2 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : 'Update Password'}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
              <Mail size={28} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 text-center">Reset your password</h2>
            <p className="text-slate-500 text-sm text-center mt-2">
              Enter your registered email address to set a new password.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium border border-red-100">{error}</div>
          )}

          <form onSubmit={handleRequestToken} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-medium"
                />
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={16} />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl mt-2 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : 'Continue to Reset'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
