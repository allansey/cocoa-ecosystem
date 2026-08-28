'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import {
  Droplets, Thermometer, Wind, ArrowLeft, Loader2,
  AlertTriangle, TrendingUp, RefreshCw, Cpu, CheckCircle2, Zap, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '@/lib/api';

function IoTDashboardContent({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [currentData, setCurrentData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState('');

  const effectiveUserId = user?.id || 'demo_farmer';

  // 1. Fetch Historical Data from Backend or Demo Fallback
  const fetchHistory = async () => {
    try {
      if (isAuthenticated) {
        const res = await api.get('/iot/history');
        const formattedHistory = res.data.map((item: any) => ({
          ...item,
          time: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setHistory(formattedHistory);
        if (formattedHistory.length > 0) {
          const latest = formattedHistory[formattedHistory.length - 1];
          setCurrentData({
            soilMoisture: latest.soilMoisture,
            temperature: latest.temperature,
            humidity: latest.humidity
          });
        }
      } else {
        // Unauthenticated demo mode data
        const demoPoints = [];
        const now = Date.now();
        for (let i = 12; i >= 0; i--) {
          demoPoints.push({
            soilMoisture: Math.round(58 + Math.sin(i / 2) * 10),
            temperature: Math.round((28 + Math.cos(i / 3) * 2.5) * 10) / 10,
            humidity: Math.round(74 + Math.sin(i / 3) * 6),
            time: new Date(now - i * 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
        setHistory(demoPoints);
        setCurrentData(demoPoints[demoPoints.length - 1]);
      }
    } catch (err) {
      console.error('History fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // 2. Listen for Live Updates from Firebase if available
    let unsubscribeLive = () => {};
    if (db && isAuthenticated && user?.id) {
      const liveRef = ref(db, `telemetry/${user.id}/current`);
      unsubscribeLive = onValue(liveRef, (snapshot) => {
        const data = snapshot.val();
        if (data) setCurrentData(data);
      });
    }

    return () => unsubscribeLive();
  }, [isAuthenticated, user?.id]);

  // Handle manual simulation trigger
  const handleSimulateReading = async () => {
    setSimulating(true);
    setSimMessage('');
    try {
      if (isAuthenticated) {
        const res = await api.post('/iot/simulate', {});
        const newReading = res.data.reading;
        setCurrentData(newReading);
        setHistory(prev => [
          ...prev.slice(1),
          {
            ...newReading,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setSimMessage('📡 Sensor pulse sent & processed!');
      } else {
        // Simulate in frontend state for guests
        const randomSoil = Math.round(50 + Math.random() * 25);
        const randomTemp = Math.round((26 + Math.random() * 6) * 10) / 10;
        const randomHum = Math.round(68 + Math.random() * 15);
        const newPoint = {
          soilMoisture: randomSoil,
          temperature: randomTemp,
          humidity: randomHum,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setCurrentData(newPoint);
        setHistory(prev => [...prev.slice(1), newPoint]);
        setSimMessage('✨ Demo sensor pulse simulated!');
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
      setTimeout(() => setSimMessage(''), 3500);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
      <Loader2 className="animate-spin text-amber-500" size={48} />
      <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Connecting to Sensor Stream...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <Link 
          href={isAuthenticated ? `/${locale}/dashboard` : `/${locale}/`} 
          className="inline-flex items-center text-amber-600 hover:text-amber-800 font-bold bg-amber-50 px-4 py-2 rounded-full shadow-sm transition-all hover:shadow-md"
        >
          <ArrowLeft size={18} className="mr-2" /> {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateReading}
            disabled={simulating}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {simulating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Trigger Sensor Pulse
          </button>
        </div>
      </div>

      {simMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {simMessage}
        </div>
      )}

      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-5 rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-800">You are viewing Smart Farm Demo Mode</h4>
              <p className="text-xs text-slate-600 font-medium">Create a free farmer account to bind your ESP32 hardware sensors and track private plantation telemetry.</p>
            </div>
          </div>
          <Link
            href={`/${locale}/auth/register?role=FARMER`}
            className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-full font-bold text-xs shadow-md transition-all"
          >
            Register as Farmer
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Telemetry Stream
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Smart Farming Dashboard</h1>
            <p className="text-slate-500 font-medium mt-1">Real-time soil and ambient conditions from IoT nodes across your cocoa grove.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
            <Cpu size={16} className="text-emerald-500" /> Node ID: <span className="text-slate-700">GH-NODE-01</span>
          </div>
        </header>

        {/* Live Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Soil Moisture */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-white flex flex-col items-center text-center relative overflow-hidden group hover:shadow-2xl transition-all">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform">
              <Droplets size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Soil Moisture</p>
            <h3 className="text-4xl font-black text-slate-800">{currentData?.soilMoisture ?? 62}%</h3>
            <div className="mt-4">
              {(currentData?.soilMoisture ?? 62) < 35 ? (
                <span className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  <AlertTriangle size={12} /> Critical: Needs Irrigation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  <CheckCircle2 size={12} /> Optimal Range (50-75%)
                </span>
              )}
            </div>
          </div>

          {/* Temperature */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-white flex flex-col items-center text-center relative overflow-hidden group hover:shadow-2xl transition-all">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform">
              <Thermometer size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Ambient Temperature</p>
            <h3 className="text-4xl font-black text-slate-800">{currentData?.temperature ?? 28.5}°C</h3>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                <CheckCircle2 size={12} /> Ideal for Pod Growth
              </span>
            </div>
          </div>

          {/* Air Humidity */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-white flex flex-col items-center text-center relative overflow-hidden group hover:shadow-2xl transition-all">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform">
              <Wind size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Relative Humidity</p>
            <h3 className="text-4xl font-black text-slate-800">{currentData?.humidity ?? 76}%</h3>
            <div className="mt-4">
              {(currentData?.humidity ?? 76) > 85 ? (
                <span className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  <AlertTriangle size={12} /> High Humidity: Monitor Black Pod
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  <CheckCircle2 size={12} /> Balanced Tropical Climate
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Historical Chart */}
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Historical Telemetry</h3>
                <p className="text-xs text-slate-400 font-medium">Tracking Soil Moisture (%) vs Temperature (°C)</p>
              </div>
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              {history.length} Data Points
            </span>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700}}
                />
                <Area type="monotone" dataKey="soilMoisture" name="Soil Moisture (%)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" />
                <Area type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(IoTDashboardContent), { ssr: false });
