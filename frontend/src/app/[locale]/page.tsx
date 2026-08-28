'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, TrendingUp, Sprout, ShieldCheck, Droplets, 
  Brain, CheckCircle2, MessageSquare, Handshake, Truck, 
  Award, Sparkles, Phone, Mail, MapPin, ChevronRight,
  Globe, Check, Star, Lock, Smartphone
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Index');
  const [price, setPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingPrice(true);
      api.get('/price')
        .then(res => setPrice(res.data.priceGhsPerTonne))
        .catch(() => setPrice(35000))
        .finally(() => setLoadingPrice(false));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center w-full bg-slate-50/40 text-slate-900 overflow-x-hidden">
      
      {/* 1. HERO SECTION WITH COCOA IMAGES & LIVE MARKET TICKER */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-amber-950 via-amber-900 to-slate-950 text-white py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        
        {/* Background Ambient Cocoa Imagery & Dark Vignette */}
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
          <Image 
            src="/images/hero-pods.jpg" 
            alt="Ghana Cocoa Pods" 
            fill 
            className="object-cover scale-105 filter blur-[1px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-amber-950/90 to-amber-950/70" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
          
          {/* Hero Left Content */}
          <div className="flex-1 text-center lg:text-left space-y-5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold backdrop-blur-md shadow-xs">
              <Sprout size={15} className="text-amber-400" />
              <span>COCOBOD Grade-Certified Digital Exchange</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Direct Cocoa Trade with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">Guaranteed Escrow</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-amber-100/90 font-medium leading-relaxed">
              Connect verified Ghanaian smallholder cocoa farmers directly with licensed buyers. Backed by real-time IoT moisture sensors, AI pod health scans, and instant Ghana Mobile Money escrow settlements.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link 
                href={`/${locale}/listings`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <span>Explore Cocoa Batches</span>
                <ArrowRight size={16} />
              </Link>
              
              <Link 
                href={`/${locale}/auth/register?role=FARMER`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-7 py-3.5 rounded-xl font-bold text-sm backdrop-blur-md transition-all hover:border-white/40 active:scale-95"
              >
                <Award size={16} className="text-amber-300" />
                <span>Sell Your Harvest</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-3 text-xs text-amber-200/80 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>100% MoMo Escrow Protection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>COCOBOD Quality Standard</span>
              </div>
            </div>
          </div>

          {/* Hero Right: Dual Cocoa Showcase Card (Pods + Dried Beans + Live Price) */}
          <div className="w-full lg:w-[460px] shrink-0 space-y-4">
            
            {/* Top Cocoa Pods Visual Card */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900 group">
              <div className="h-52 relative">
                <Image 
                  src="/images/hero-pods.jpg" 
                  alt="Harvested Golden Cocoa Pods" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                <div className="absolute top-3.5 left-3.5 bg-amber-500/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <Award size={13} />
                  <span>Grade A Single Origin</span>
                </div>

                <div className="absolute top-3.5 right-3.5 bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>IoT Moisture 6.8%</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/90 backdrop-blur-md flex items-center justify-between border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden relative shrink-0 border border-white/20">
                    <Image src="/images/hero-beans.jpg" alt="Sun Dried Cocoa Beans" fill className="object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Sun-Dried Fermented Beans</h4>
                    <p className="text-[11px] text-amber-200/80 font-medium">Ashanti & Western Regions</p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                  AI Scan 99.4%
                </span>
              </div>
            </div>

            {/* Bottom Live Price Widget Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-xl text-white relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">Ghana Cocoa Exchange Rate</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">COCOBOD Benchmark Price</h3>
                </div>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {price ? price.toLocaleString() : '35,000'}
                </span>
                <span className="text-sm font-bold text-amber-200">GHS / Tonne</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/5 rounded-xl p-2.5">
                  <span className="text-amber-300/80 text-[10px] font-bold uppercase block">Per 64kg Bag</span>
                  <span className="text-sm font-bold text-white">~2,240 GHS</span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5">
                  <span className="text-amber-300/80 text-[10px] font-bold uppercase block">Escrow Protected</span>
                  <span className="text-sm font-bold text-emerald-300">MoMo Verified</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. THE 4 PILLARS OF COCOALINK */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Built for Ghana Agriculture</span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">The Modern Cocoa Trading Stack</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Everything farmers and agribusiness buyers need to trade safely and profitably.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 group">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">100% Escrow Protection</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Funds are held securely via MTN MoMo, Telecel Cash, or Card until the buyer verifies bean quality and weight.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 group">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Award size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Digital Quality Passport</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Transparent batch certifications including moisture content %, AI health score, and single-origin GPS coordinates.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 group">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Droplets size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Smart Farm IoT</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Real-time wireless soil moisture, temperature, and microclimate telemetry to optimize harvest drying.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 group">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Brain size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Twi & English AI Voice</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Instant voice and photo diagnosis for black pod disease and pests, tailored for Ghanaian farmers.
            </p>
          </div>

        </div>
      </section>

      {/* 3. STEP BY STEP TRADE FLOW */}
      <section className="w-full bg-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Simple & Reliable</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">How CocoaLink Works</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">From farm gate to port warehouse in 4 secure steps.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Post Harvest', desc: 'Farmers list certified cocoa batches with photos, grade, weight, and region.' },
              { step: '02', title: 'Bargain & Agree', desc: 'Buyers and farmers negotiate price per tonne via real-time persistent chat.' },
              { step: '03', title: 'MoMo Escrow', desc: 'Buyer deposits funds into protected escrow via Mobile Money (*170# / *110#).' },
              { step: '04', title: 'Dispatch & Release', desc: 'Assigned driver delivers cocoa. Funds are released instantly upon weighbridge verification.' }
            ].map((s, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 relative hover:border-amber-400/50 transition-colors">
                <span className="text-2xl font-black text-amber-400/80 font-mono">{s.step}</span>
                <h3 className="text-base font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. NEWS & MARKET INSIGHTS */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
          <div>
            <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Marketplace Intelligence</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">Latest Industry Updates</h2>
          </div>
          <Link 
            href={`/${locale}/news`}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200/80 transition-colors"
          >
            <span>View All Reports</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              date: 'May 06, 2026',
              title: 'Ghana Cocoa Output Forecasted to Rise 15% This Season',
              category: 'Market Report',
              img: '/images/farm.jpg'
            },
            {
              date: 'April 28, 2026',
              title: 'YOLOv8 Computer Vision Launches for Early Black Pod Diagnosis',
              category: 'Technology',
              img: '/images/news2.jpg'
            },
            {
              date: 'April 22, 2026',
              title: 'Moisture Control Best Practices for Export Quality Grade A Beans',
              category: 'Advisory',
              img: '/images/news3.jpg'
            }
          ].map((news, idx) => (
            <Link key={idx} href={`/${locale}/news`} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="h-44 relative overflow-hidden bg-slate-100">
                  <Image 
                    src={news.img} 
                    alt={news.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-800 uppercase tracking-wider shadow-xs">
                    {news.category}
                  </div>
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{news.date}</span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                    {news.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-white rounded-3xl p-8 sm:p-12 lg:p-16 text-center space-y-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">Ready to Trade with Confidence?</h2>
            <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
              Join thousands of licensed Ghanaian farmers and verified commodity buyers on CocoaLink today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 relative z-10 pt-2">
            <Link 
              href={`/${locale}/auth/register?role=FARMER`}
              className="w-full sm:w-auto bg-white text-slate-900 hover:bg-amber-50 px-7 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
            >
              Join as a Farmer
            </Link>
            <Link 
              href={`/${locale}/auth/register?role=BUYER`}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/40 px-7 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
            >
              Join as a Buyer
            </Link>
          </div>
        </div>
      </section>

      {/* 6. ENTERPRISE FOOTER */}
      <footer className="w-full bg-slate-950 text-slate-400 border-t border-slate-800 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          
          {/* Brand & About */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white font-black flex items-center justify-center text-base">
                C
              </div>
              <span className="text-lg font-black text-white tracking-tight">CocoaLink Ghana</span>
            </div>
            <p className="text-xs text-slate-400 font-medium max-w-sm leading-relaxed">
              Ghana's premier agricultural fintech and cocoa trade exchange platform. Connecting licensed cocoa farmers, agribusiness aggregators, and certified haulage drivers with escrow payment protection.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl w-max">
              <ShieldCheck size={14} />
              <span>COCOBOD Quality Standards Compliant</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ecosystem</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href={`/${locale}/listings`} className="hover:text-amber-400 transition-colors">Marketplace</Link></li>
              <li><Link href={`/${locale}/dashboard/iot`} className="hover:text-amber-400 transition-colors">Smart Farm IoT</Link></li>
              <li><Link href={`/${locale}/dashboard/ai-advisor`} className="hover:text-amber-400 transition-colors">AI Disease Advisor</Link></li>
              <li><Link href={`/${locale}/orders`} className="hover:text-amber-400 transition-colors">Order Tracking Hub</Link></li>
              <li><Link href={`/${locale}/news`} className="hover:text-amber-400 transition-colors">News & Reports</Link></li>
            </ul>
          </div>

          {/* Trade Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Security & Escrow</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-400">MTN Mobile Money (*170#)</span></li>
              <li><span className="text-slate-400">Telecel Cash (*110#)</span></li>
              <li><span className="text-slate-400">AT Money Integration</span></li>
              <li><span className="text-slate-400">Weighbridge Validation</span></li>
              <li><span className="text-slate-400">GPS Transport Verification</span></li>
            </ul>
          </div>

          {/* Regional Hubs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ghana Offices</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-1.5">
                <MapPin size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span>Kumasi Cocoa House, Ashanti</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span>Airport City, Accra</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span>Takoradi Port Terminal, Western</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
          <p>© 2026 CocoaLink Ghana. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span>Escrow Guidelines</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
