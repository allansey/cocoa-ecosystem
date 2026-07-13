'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('IoT Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
        <AlertOctagon size={48} />
      </div>
      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-4">Connection Failed</h2>
      <p className="text-lg text-slate-500 max-w-md mx-auto mb-8 font-medium">
        We encountered a problem connecting to your Smart Farm sensors. Please try again or return to the dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-amber-500/20 transition-all hover:-translate-y-1 active:scale-95"
        >
          <RotateCcw size={20} /> Try Again
        </button>
        <Link
          href="/en/dashboard"
          className="inline-flex items-center justify-center bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-4 rounded-full font-bold shadow-sm transition-all hover:-translate-y-1 active:scale-95"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
