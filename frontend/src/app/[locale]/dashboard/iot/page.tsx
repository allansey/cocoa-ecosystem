'use client';
import { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { Droplets, Thermometer, Wind, ArrowLeft, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '@/lib/api';

export default function IoTDashboard({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [currentData, setCurrentData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    // 1. Listen for Live Updates from Firebase
    const liveRef = ref(db, `telemetry/${user?.id}/current`);
    const unsubscribeLive = onValue(liveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setCurrentData(data);
    });

    // 2. Fetch Historical Data from Backend
    const fetchHistory = async () => {
      try {
        const res = await api.get('/iot/history');
        const formattedHistory = res.data.map((item: any) => ({
          ...item,
          time: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setHistory(formattedHistory);
      } catch (err) {
        console.error('History fetch failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();

    return () => unsubscribeLive();
  }, [isAuthenticated, router, locale, user?.id]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
      <Loader2 className="animate-spin text-amber-500" size={48} />
      <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Syncing with Farm Sensors...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-8 font-bold bg-amber-50 px-4 py-2 rounded-full shadow-sm transition-all hover:shadow-md">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>

      <div className="flex flex-col gap-10">
        <header>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">Smart Farming Dashboard</h1>
          <p className="text-slate-500 font-medium">Real-time telemetry from your cocoa plantation IoT nodes.</p>
        </header>

        {/* Live Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-white flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Droplets size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Soil Moisture</p>
            <h3 className="text-4xl font-black text-slate-800">{currentData?.soilMoisture || '--'}%</h3>
            {currentData?.soilMoisture < 30 && (
              <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                <AlertTriangle size={12} /> Critical: Needs Water
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-white flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Thermometer size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Temperature</p>
            <h3 className="text-4xl font-black text-slate-800">{currentData?.temperature || '--'}°C</h3>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-white flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Wind size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Air Humidity</p>
            <h3 className="text-4xl font-black text-slate-800">{currentData?.humidity || '--'}%</h3>
          </div>
        </div>

        {/* Historical Chart */}
        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-white">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Historical Trends</h3>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Last 50 Readings</p>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700}}
                />
                <Area type="monotone" dataKey="soilMoisture" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" />
                <Area type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
