'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Menu, X, ShoppingBag, Truck, MessageSquare,
  LayoutDashboard, User, LogOut, Droplets, Newspaper
} from 'lucide-react';

export default function Navigation({ locale }: { locale: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    router.push(`/${locale}`);
  };

  const isActive = (path: string) => {
    if (path === `/${locale}` && pathname === `/${locale}`) return true;
    if (path !== `/${locale}` && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-white/90 border-b border-amber-100/70 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Brand Logo */}
        <Link href={`/${locale}/`} className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 shadow-md shadow-amber-600/25 flex items-center justify-center transform transition-transform group-hover:scale-105 group-hover:rotate-6">
            <span className="text-white font-black text-lg leading-none tracking-tight">C</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-900 via-amber-800 to-amber-700 tracking-tight leading-none">
              CocoaLink
            </span>
            <span className="text-[9px] font-extrabold text-amber-600/90 uppercase tracking-widest leading-none mt-1">
              Ghana Ecosystem
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links (Visible on md/lg/xl screens) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <Link 
            href={`/${locale}/`} 
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all ${
              isActive(`/${locale}`) 
                ? 'bg-amber-100/90 text-amber-900 shadow-xs' 
                : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/70'
            }`}
          >
            Home
          </Link>

          <Link 
            href={`/${locale}/listings`} 
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all ${
              isActive(`/${locale}/listings`) 
                ? 'bg-amber-100/90 text-amber-900 shadow-xs' 
                : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/70'
            }`}
          >
            Marketplace
          </Link>

          {user?.role !== 'BUYER' && (
            <Link 
              href={`/${locale}/dashboard/iot`} 
              className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all ${
                isActive(`/${locale}/dashboard/iot`) 
                  ? 'bg-emerald-100/90 text-emerald-900 shadow-xs' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
              }`}
            >
              <Droplets size={14} className="text-emerald-600 shrink-0" />
              <span>Smart Farm</span>
            </Link>
          )}

          <Link 
            href={`/${locale}/news`} 
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all ${
              isActive(`/${locale}/news`) 
                ? 'bg-amber-100/90 text-amber-900 shadow-xs' 
                : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/70'
            }`}
          >
            News
          </Link>

          {/* Authenticated Nav Items */}
          {_hasHydrated && isAuthenticated && user && (
            <>
              <div className="h-4 w-px bg-slate-200/80 mx-0.5 shrink-0" />

              <Link 
                href={`/${locale}/orders`} 
                className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all border ${
                  isActive(`/${locale}/orders`) 
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                    : 'bg-amber-50/90 text-amber-900 border-amber-200/80 hover:bg-amber-100'
                }`}
              >
                <Truck size={14} className="shrink-0" />
                <span>My Orders</span>
              </Link>

              <Link 
                href={`/${locale}/chat`} 
                className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all ${
                  isActive(`/${locale}/chat`) 
                    ? 'bg-indigo-100 text-indigo-900 shadow-xs' 
                    : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/70'
                }`}
              >
                <MessageSquare size={14} className="shrink-0" />
                <span>Chats</span>
              </Link>

              <Link 
                href={`/${locale}/dashboard`} 
                className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all ${
                  isActive(`/${locale}/dashboard`) && !isActive(`/${locale}/dashboard/iot`) 
                    ? 'bg-amber-100/90 text-amber-900 shadow-xs' 
                    : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/70'
                }`}
              >
                <LayoutDashboard size={14} className="shrink-0" />
                <span>Dashboard</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Section: Language + User Pill / Auth CTAs */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Language Switcher */}
          <div className="flex bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/70 shrink-0">
            <Link 
              href="/en" 
              className={`text-[11px] font-black px-2 py-0.5 rounded-lg transition-all ${
                locale === 'en' 
                  ? 'bg-white text-amber-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              EN
            </Link>
            <Link 
              href="/tw" 
              className={`text-[11px] font-black px-2 py-0.5 rounded-lg transition-all ${
                locale === 'tw' 
                  ? 'bg-white text-amber-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              TW
            </Link>
          </div>

          {/* User Profile Pill or Login/Register */}
          {_hasHydrated && isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Link 
                href={`/${locale}/profile`}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-200 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-bold text-slate-800 max-w-[90px] lg:max-w-[120px] truncate">
                  {user.name || user.email.split('@')[0]}
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 tracking-wider">
                  {user.role}
                </span>
              </Link>

              <button 
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            _hasHydrated && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Link 
                  href={`/${locale}/auth/register`} 
                  className="text-xs font-bold text-slate-600 hover:text-amber-800 px-2.5 py-1.5 transition-colors"
                >
                  Register
                </Link>
                <Link 
                  href={`/${locale}/auth/login`} 
                  className="text-xs font-black bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white px-4 py-1.5 rounded-full shadow-xs transition-all hover:shadow-sm active:scale-95"
                >
                  Login
                </Link>
              </div>
            )
          )}
        </div>

        {/* Mobile Hamburger Toggle (Visible only on small screens < 768px) */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Link href="/en" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${locale === 'en' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500'}`}>EN</Link>
            <Link href="/tw" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${locale === 'tw' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500'}`}>TW</Link>
          </div>

          <button 
            className="p-2 text-slate-700 hover:text-amber-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/98 backdrop-blur-2xl border-b border-amber-100 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-md mx-auto px-6 py-6 flex flex-col gap-2.5">
            {_hasHydrated && isAuthenticated && user && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black shadow-sm">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{user.name || user.email}</p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Logout
                </button>
              </div>
            )}

            <Link 
              href={`/${locale}/`} 
              className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                isActive(`/${locale}`) ? 'bg-amber-100 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>

            <Link 
              href={`/${locale}/listings`} 
              className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                isActive(`/${locale}/listings`) ? 'bg-amber-100 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag size={18} />
              Marketplace
            </Link>

            {user?.role !== 'BUYER' && (
              <Link 
                href={`/${locale}/dashboard/iot`} 
                className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                  isActive(`/${locale}/dashboard/iot`) ? 'bg-emerald-100 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Droplets size={18} className="text-emerald-600" />
                Smart Farm IoT
              </Link>
            )}

            <Link 
              href={`/${locale}/news`} 
              className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                isActive(`/${locale}/news`) ? 'bg-amber-100 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Newspaper size={18} />
              News & Insights
            </Link>

            {_hasHydrated && isAuthenticated ? (
              <>
                <div className="h-px bg-slate-100 my-1" />
                <Link 
                  href={`/${locale}/orders`} 
                  className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                    isActive(`/${locale}/orders`) ? 'bg-amber-100 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Truck size={18} className="text-amber-600" />
                  🚚 My Orders & Tracking
                </Link>

                <Link 
                  href={`/${locale}/chat`} 
                  className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                    isActive(`/${locale}/chat`) ? 'bg-indigo-100 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare size={18} className="text-indigo-600" />
                  💬 Chats & Inquiries
                </Link>

                <Link 
                  href={`/${locale}/dashboard`} 
                  className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                    isActive(`/${locale}/dashboard`) && !isActive(`/${locale}/dashboard/iot`) ? 'bg-amber-100 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard size={18} className="text-slate-600" />
                  Dashboard Overview
                </Link>

                <Link 
                  href={`/${locale}/profile`} 
                  className={`p-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                    isActive(`/${locale}/profile`) ? 'bg-amber-100 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <User size={18} className="text-slate-600" />
                  Profile Settings
                </Link>
              </>
            ) : (
              _hasHydrated && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Link 
                    href={`/${locale}/auth/register`} 
                    className="w-full text-center py-3 rounded-2xl font-bold border-2 border-slate-200 text-slate-700 hover:border-amber-500"
                  >
                    Register
                  </Link>
                  <Link 
                    href={`/${locale}/auth/login`} 
                    className="w-full text-center py-3 rounded-2xl font-black bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                  >
                    Login
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
