'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, TrendingUp, ShieldCheck, Leaf } from 'lucide-react';

export default function NewsPage({ params: { locale } }: { params: { locale: string } }) {
  const newsItems = [
    {
      id: 1,
      date: "May 06, 2026",
      title: "Ghana Cocoa Output Set to Rise by 15% This Season",
      category: "Market Report",
      icon: <TrendingUp size={20} />,
      img: "https://images.unsplash.com/photo-1548678967-f1fc5d761ae1?auto=format&fit=crop&q=80&w=800",
      excerpt: "Favorable weather conditions and improved farming practices have led to an optimistic forecast for the upcoming harvest season across major producing regions."
    },
    {
      id: 2,
      date: "April 28, 2026",
      title: "New AI Detection Model Launches for Black Pod Disease",
      category: "Technology",
      icon: <ShieldCheck size={20} />,
      img: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800",
      excerpt: "Farmers can now use their smartphones to detect early signs of black pod disease with 95% accuracy, allowing for targeted intervention and saving up to 20% of yield."
    },
    {
      id: 3,
      date: "April 22, 2026",
      title: "Sustainable Farming: Tips for the Upcoming Rain Season",
      category: "Advisory",
      icon: <Leaf size={20} />,
      img: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=800",
      excerpt: "Expert agronomists share the top 5 preparation strategies for the heavy rains to prevent waterlogging and ensure healthy pod development."
    },
    {
      id: 4,
      date: "April 15, 2026",
      title: "Global Chocolate Demand Shifts Towards Ethically Sourced Beans",
      category: "Global Market",
      icon: <TrendingUp size={20} />,
      img: "https://images.unsplash.com/photo-1614088685112-0a760b71a3c8?auto=format&fit=crop&q=80&w=800",
      excerpt: "European and North American buyers are increasingly paying premiums for fully traceable, fair-trade certified cocoa, representing a major opportunity for platforms like CocoaLink."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="mb-12">
        <Link href={`/${locale}`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-6 font-bold bg-amber-50 px-4 py-2 rounded-full shadow-sm transition-all hover:shadow-md">
          <ArrowLeft size={16} className="mr-2" /> Back to Home
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">News & Insights</h1>
        <p className="text-xl text-slate-500 font-medium mt-4 max-w-2xl">
          Stay updated with the latest market trends, agricultural technology, and farming advisory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {newsItems.map((news) => (
          <article key={news.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer flex flex-col">
            <div className="relative h-64 overflow-hidden">
              <img src={news.img} alt={news.title} className="w-full h-full object-cover transform transition-transform group-hover:scale-110 duration-700" />
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 shadow-lg">
                {news.icon} {news.category}
              </div>
            </div>
            <div className="p-8 flex-grow flex flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-3">
                  <Clock size={16} /> {news.date}
                </p>
                <h2 className="text-2xl font-black text-slate-800 group-hover:text-amber-600 transition-colors mb-4 leading-snug">
                  {news.title}
                </h2>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {news.excerpt}
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center text-amber-600 font-bold group-hover:text-amber-700">
                Read Full Article <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
