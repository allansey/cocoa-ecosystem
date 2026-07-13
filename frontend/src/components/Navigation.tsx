'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Menu, X } from 'lucide-react';

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string || 'en';

  const { isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    router.push(`/${locale}`);
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-amber-100/50 shadow-sm transition-all">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href={`/${locale}/`} onClick={closeMenu} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30 flex items-center justify-center transform transition-transform hover:rotate-12">
            <span className="text-white font-black text-xl leading-none">C</span>
          </div>
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-800 to-amber-600 tracking-tight">
            CocoaLink
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8 items-center">
          <Link href={`/${locale}/`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">
            Home
          </Link>
          <Link href={`/${locale}/listings`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">
            Marketplace
          </Link>

          {isMounted && isAuthenticated ? (
            <>
              <Link href={`/${locale}/dashboard`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">
                Dashboard
              </Link>
              <Link href={`/${locale}/profile`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">
                Profile
              </Link>
              <button 
                onClick={handleLogout}
                className="text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            isMounted && (
              <>
                <Link href={`/${locale}/auth/register`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">
                  Register
                </Link>
                <Link href={`/${locale}/auth/login`} className="text-sm font-black bg-amber-100 text-amber-800 px-6 py-2.5 rounded-full hover:bg-amber-200 transition-all active:scale-95 shadow-sm">
                  Login
                </Link>
              </>
            )
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-slate-600 hover:text-amber-700 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-amber-100 shadow-xl py-4 flex flex-col items-center gap-4 animate-in slide-in-from-top-2">
          <Link href={`/${locale}/`} onClick={closeMenu} className="w-full text-center text-base font-bold text-slate-600 hover:text-amber-700 py-2 transition-colors">
            Home
          </Link>
          <Link href={`/${locale}/listings`} onClick={closeMenu} className="w-full text-center text-base font-bold text-slate-600 hover:text-amber-700 py-2 transition-colors">
            Marketplace
          </Link>

          {isMounted && isAuthenticated ? (
            <>
              <Link href={`/${locale}/dashboard`} onClick={closeMenu} className="w-full text-center text-base font-bold text-slate-600 hover:text-amber-700 py-2 transition-colors">
                Dashboard
              </Link>
              <Link href={`/${locale}/profile`} onClick={closeMenu} className="w-full text-center text-base font-bold text-slate-600 hover:text-amber-700 py-2 transition-colors">
                Profile
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full text-center text-base font-bold text-rose-600 hover:text-rose-700 py-2 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            isMounted && (
              <>
                <Link href={`/${locale}/auth/register`} onClick={closeMenu} className="w-full text-center text-base font-bold text-slate-600 hover:text-amber-700 py-2 transition-colors">
                  Register
                </Link>
                <Link href={`/${locale}/auth/login`} onClick={closeMenu} className="w-3/4 mx-auto text-center text-base font-black bg-amber-100 text-amber-800 px-6 py-3 rounded-full hover:bg-amber-200 transition-all active:scale-95 shadow-sm">
                  Login
                </Link>
              </>
            )
          )}
        </div>
      )}
    </header>
  );
}
