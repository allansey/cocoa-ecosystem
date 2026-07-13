'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // TODO: wire to backend reset endpoint when available
      // await api.post('/auth/forgot-password', { email });
      await new Promise(r => setTimeout(r, 1000)); // simulate API call
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
      <Link
        href={`/${locale}/auth/login`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-amber-600 font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Login
      </Link>

      {submitted ? (
        <div className="text-center py-6 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Check your inbox</h2>
          <p className="text-slate-500 text-sm">
            If an account with <strong>{email}</strong> exists, you will receive a password reset link shortly.
          </p>
          <Link href={`/${locale}/auth/login`} className="mt-4 text-amber-600 font-semibold hover:underline text-sm">
            Return to Login
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
              <Mail size={28} />
            </div>
            <h2 className="text-2xl font-bold text-amber-900 text-center">Reset your password</h2>
            <p className="text-slate-500 text-sm text-center mt-2">
              Enter your registered email address and we'll send you a reset link.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg mt-2 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : 'Send Reset Link'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
