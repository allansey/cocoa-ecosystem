'use client';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, TrendingUp, Sprout, ShieldCheck, Globe, Loader2, Droplets, Heart, Zap, Users, CheckCircle, Smartphone, MessageSquare } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

// Lazy load brain icon since it's not used immediately
const Brain = lazy(() => import('lucide-react').then(m => ({ default: m.Brain })));

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Index');
  const [price, setPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false); // Don't block render

  // Defer non-critical price fetch
  useEffect(() => {
    // Add a small delay so this doesn't block initial paint
    const timer = setTimeout(() => {
      setLoadingPrice(true);
      api.get('/price')
        .then(res => setPrice(res.data.priceGhsPerTonne))
        .catch(err => console.error('Failed to fetch price', err))
        .finally(() => setLoadingPrice(false));
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center w-full bg-slate-50/50">
      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-center px-6 pt-24 pb-32 text-center overflow-hidden bg-white">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-300 via-orange-100 to-emerald-200 rounded-full blur-3xl mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
        </div>
        
        <div className="relative z-10 max-w-4xl flex flex-col items-center gap-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/80 border border-amber-200/50 text-amber-800 text-sm font-bold backdrop-blur-sm shadow-sm mb-4">
            <Sprout size={16} />
            <span>The Future of Cocoa Trading</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tight leading-[1.1]">
            {t('title') || 'Connecting Cocoa Farmers & Buyers'}
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl font-medium leading-relaxed">
            {t('subtitle') || 'A transparent, fair, and efficient marketplace for the modern agricultural ecosystem.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Link 
              href={`/${locale}/listings`}
              prefetch={true}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-amber-500/20 transition-all hover:-translate-y-1 hover:shadow-amber-500/40 active:scale-95"
            >
              {t('getStarted') || 'Explore Marketplace'} <ArrowRight size={20} className="stroke-[3]" />
            </Link>
            <Link 
              href={`/${locale}/dashboard/iot`}
              prefetch={true}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1 active:scale-95"
            >
              <Droplets size={20} /> Smart Farm
            </Link>
          </div>
          <div className="flex gap-6 mt-4 opacity-70">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
              <ShieldCheck size={16} className="text-emerald-500" /> Secure Payments
            </div>
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
              <Brain size={16} className="text-indigo-500" /> Smart Farm AI
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Price Feed Section */}
      <section className="w-full max-w-6xl px-6 py-12 -mt-16 z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Price Feed Card */}
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white flex flex-col gap-4 transform transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 p-3 rounded-2xl text-emerald-600 shadow-inner">
                <TrendingUp size={28} />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{t('priceFeed') || 'Market Price'}</h2>
              <div className="flex items-baseline gap-2">
                {loadingPrice ? (
                  <Loader2 className="animate-spin text-slate-400" size={24} />
                ) : (
                  <>
                    <div className="text-4xl font-black text-slate-800">{price ? price.toLocaleString() : '35,000'}</div>
                    <div className="text-lg font-bold text-slate-500">GHS/Ton</div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 font-medium">+2.4% from last week</p>
            </div>
          </div>

          {/* Feature Card 1 */}
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-white flex flex-col gap-4 transform transition-transform hover:scale-[1.02]">
             <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-3 rounded-2xl text-blue-600 shadow-inner w-max">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Secure Escrow</h3>
              <p className="text-slate-600 font-medium">Your funds are protected. Payments are only released when both parties are satisfied.</p>
          </div>

          {/* Feature Card 2 */}
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-white flex flex-col gap-4 transform transition-transform hover:scale-[1.02]">
             <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-3 rounded-2xl text-purple-600 shadow-inner w-max">
                <Globe size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Global Reach</h3>
              <p className="text-slate-600 font-medium">Connect with verified buyers and sellers across the country and beyond.</p>
          </div>

        </div>
      </section>

      {/* About / Mission Section */}
      <section className="w-full max-w-6xl px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-100 rounded-full blur-3xl opacity-50"></div>
            <div className="relative bg-white p-2 rounded-[2.5rem] shadow-3xl transform -rotate-2">
              <Image 
                src="/images/farm.jpg" 
                alt="Cocoa Farm" 
                width={800}
                height={1000}
                className="rounded-[2.2rem] w-full aspect-[4/5] object-cover"
                loading="lazy"
                quality={75}
              />
              <div className="absolute -bottom-6 -right-6 bg-slate-900 text-white p-8 rounded-3xl shadow-2xl max-w-[240px]">
                <Heart className="text-rose-500 mb-2" size={32} />
                <p className="font-bold text-lg leading-snug italic">&quot;Empowering the hands that feed the nation.&quot;</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-8">
            <div className="space-y-4">
              <h2 className="text-amber-600 font-black uppercase tracking-[0.2em] text-xs">Our Mission</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight">Eliminating Middlemen, Maximizing Value.</h3>
              <p className="text-lg text-slate-600 font-medium leading-relaxed">
                CocoaLink was founded on a simple belief: Ghanaian cocoa farmers deserve the full value of their hard work. By connecting them directly with international and local buyers, we use technology to foster trust and prosperity.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <Zap className="text-amber-500 mb-3" size={24} />
                <h4 className="font-bold text-slate-800">Fast Trading</h4>
                <p className="text-sm text-slate-500">Sell your harvest in minutes.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <Users className="text-emerald-500 mb-3" size={24} />
                <h4 className="font-bold text-slate-800">Verified Pro</h4>
                <p className="text-sm text-slate-500">Trust-based community.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="w-full bg-slate-900 py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-amber-400 font-black uppercase tracking-[0.2em] text-xs">The Workflow</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white">How CocoaLink Works</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connector Lines (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2"></div>
            
            <div className="relative flex flex-col items-center text-center gap-6 group">
              <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-amber-400 transform transition-transform group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-slate-900 duration-500">
                <Smartphone size={40} />
              </div>
              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-black text-white">1. List Harvest</h3>
                <p className="text-slate-400 font-medium">Farmers post listings with grade, weight, and region.</p>
              </div>
            </div>

            <div className="relative flex flex-col items-center text-center gap-6 group">
              <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-emerald-400 transform transition-transform group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-slate-900 duration-500">
                <MessageSquare size={40} />
              </div>
              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-black text-white">2. Negotiate</h3>
                <p className="text-slate-400 font-medium">Connect via secure in-app chat to finalize terms.</p>
              </div>
            </div>

            <div className="relative flex flex-col items-center text-center gap-6 group">
              <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-blue-400 transform transition-transform group-hover:scale-110 group-hover:bg-blue-400 group-hover:text-slate-900 duration-500">
                <CheckCircle size={40} />
              </div>
              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-black text-white">3. Get Paid</h3>
                <p className="text-slate-400 font-medium">Secure MoMo payments on delivery completion.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News & Updates Section */}
      <section className="w-full max-w-6xl px-6 py-32">
        <div className="flex justify-between items-end mb-16">
          <div className="space-y-4">
            <h2 className="text-amber-600 font-black uppercase tracking-[0.2em] text-xs">Cocoa Hub</h2>
            <h3 className="text-4xl md:text-5xl font-black text-slate-800">News & Insights</h3>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-800 font-black border-b-4 border-amber-400 pb-1">
            Latest Industry Updates
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              date: "May 06, 2026",
              title: "Ghana Cocoa Output Set to Rise by 15% This Season",
              category: "Market Report",
              img: "/images/news1.jpg"
            },
            {
              date: "April 28, 2026",
              title: "New AI Detection Model Launches for Black Pod Disease",
              category: "Technology",
              img: "/images/news2.jpg"
            },
            {
              date: "April 22, 2026",
              title: "Sustainable Farming: Tips for the Upcoming Rain Season",
              category: "Advisory",
              img: "/images/news3.jpg"
            }
          ].map((news, idx) => (
            <div key={idx} className="group block">
              <div className="relative overflow-hidden rounded-[2rem] mb-6 shadow-lg">
                <Image src={news.img} alt={news.title} width={400} height={300} className="w-full aspect-[4/3] object-cover transform transition-transform group-hover:scale-105 duration-700" loading="lazy" quality={70} />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-800">
                  {news.category}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 tracking-wider">{news.date}</p>
                <h4 className="text-xl font-black text-slate-800 leading-tight">
                  {news.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Statistics */}
      <section className="w-full max-w-6xl px-6 mb-32">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black text-white">2.5k+</h2>
              <p className="text-emerald-100 font-bold tracking-widest uppercase text-[10px]">Verified Farmers</p>
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black text-white">GHS 12M</h2>
              <p className="text-emerald-100 font-bold tracking-widest uppercase text-[10px]">Total Traded</p>
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black text-white">15+</h2>
              <p className="text-emerald-100 font-bold tracking-widest uppercase text-[10px]">Active Regions</p>
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black text-white">99%</h2>
              <p className="text-emerald-100 font-bold tracking-widest uppercase text-[10px]">Trust Rating</p>
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-[10px] text-emerald-300/50 uppercase tracking-widest font-bold">Target figures for Q4 2026 pilot program</p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="w-full max-w-4xl px-6 py-24 text-center space-y-10">
        <h2 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter">Ready to revolutionize your harvest?</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            href={`/${locale}/auth/register?role=FARMER`}
            prefetch={true}
            className="bg-slate-900 text-white px-10 py-5 rounded-full font-black text-xl shadow-2xl transition-all hover:-translate-y-1 active:scale-95"
          >
            Join as Farmer
          </Link>
          <Link 
            href={`/${locale}/auth/register?role=BUYER`}
            prefetch={true}
            className="bg-white text-slate-900 border-2 border-slate-900 px-10 py-5 rounded-full font-black text-xl transition-all hover:-translate-y-1 active:scale-95 shadow-lg shadow-slate-200"
          >
            Become a Buyer
          </Link>
        </div>
      </section>
    </div>
  );
}
