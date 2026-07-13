'use client';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function NavbarAuth({ locale }: { locale: string }) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - only render auth state after client mount
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    // Render a placeholder with the same dimensions to prevent layout shift
    return <div className="w-[72px] h-[40px] ml-2" />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-4 ml-2">
        <Link href={`/${locale}/dashboard`} prefetch={true} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">
          Dashboard
        </Link>
        <Link href={`/${locale}/profile`} prefetch={true} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">
          Profile
        </Link>
        <div className="h-4 w-px bg-slate-200"></div>
        <button 
          onClick={() => logout()}
          className="text-sm font-black bg-red-50 text-red-600 px-6 py-2.5 rounded-full hover:bg-red-100 transition-all active:scale-95 shadow-sm"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <Link href={`/${locale}/auth/login`} prefetch={true} className="text-sm font-black bg-amber-100 text-amber-800 px-6 py-2.5 rounded-full hover:bg-amber-200 transition-all active:scale-95 shadow-sm ml-2">
      Login
    </Link>
  );
}
