'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, List, MessageSquare, User, LogOut, Package, Clock, CheckCircle2, Star, Loader2, Droplets, Brain } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders/my-orders');
        setOrders(res.data);
      } catch (err) {
        console.error('Failed to fetch orders', err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [isAuthenticated, router, locale]);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-8 mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-50 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Welcome, {user.name || user.email.split('@')[0]}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-widest">{user.role}</span>
              <p className="text-slate-500 font-medium text-sm">| CocoaLink Certified Partner</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <Link href={`/${locale}/profile`} className="bg-slate-50 text-slate-700 px-6 py-3 rounded-2xl font-black hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2">
            <User size={18} /> Profile
          </Link>
          <button 
            onClick={() => { logout(); router.push(`/${locale}/auth/login`); }}
            className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black hover:bg-red-100 transition-all border border-red-100 flex items-center gap-2"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Actions Section */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-4 ml-2">Quick Actions</h2>
          {user.role === 'FARMER' ? (
            <>
              <Link href={`/${locale}/dashboard/create-listing`} className="bg-gradient-to-br from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 p-8 rounded-3xl flex flex-col items-start text-white transition-all shadow-xl shadow-amber-600/20 hover:-translate-y-1 group">
                <PlusCircle size={40} className="mb-4 text-amber-100" />
                <h3 className="text-xl font-black">Create Listing</h3>
                <p className="text-amber-100/80 mt-2 font-medium text-sm">Post new cocoa batches to the marketplace.</p>
              </Link>
              <Link href={`/${locale}/dashboard/iot`} className="bg-white border-2 border-emerald-100 hover:border-emerald-500 p-8 rounded-3xl flex flex-col items-start transition-all hover:-translate-y-1 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:bg-emerald-100 transition-colors"></div>
                <Droplets size={40} className="mb-4 text-emerald-500 relative z-10" />
                <h3 className="text-xl font-black text-slate-800 relative z-10">Smart Farm IoT</h3>
                <p className="text-slate-500 mt-2 font-medium text-sm relative z-10">Monitor soil moisture & climate live.</p>
              </Link>
              <Link href={`/${locale}/dashboard/ai-advisor`} className="bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-500 p-8 rounded-3xl flex flex-col items-start transition-all hover:-translate-y-1 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200 rounded-bl-full -mr-8 -mt-8 opacity-20 group-hover:bg-indigo-300 transition-colors"></div>
                <Brain size={40} className="mb-4 text-indigo-600 relative z-10" />
                <h3 className="text-xl font-black text-slate-800 relative z-10">AI Disease Advisor</h3>
                <p className="text-slate-500 mt-2 font-medium text-sm relative z-10">Detect diseases using your camera.</p>
              </Link>
            </>
          ) : (
            <>
              <Link href={`/${locale}/listings`} className="bg-gradient-to-br from-amber-600 to-amber-50 hover:from-amber-700 hover:to-amber-600 p-8 rounded-3xl flex flex-col items-start text-white transition-all shadow-xl shadow-amber-600/20 hover:-translate-y-1 group">
                <Package size={40} className="mb-4 text-amber-100" />
                <h3 className="text-xl font-black">Browse Cocoa</h3>
                <p className="text-amber-100/80 mt-2 font-medium text-sm">Find premium beans across Ghana.</p>
              </Link>
              <div className="bg-white border border-slate-200 p-8 rounded-3xl hover:shadow-lg transition-all cursor-not-allowed opacity-60">
                <MessageSquare size={40} className="text-slate-400 mb-4" />
                <h3 className="text-xl font-black text-slate-800">Inquiries</h3>
                <p className="text-slate-500 mt-2 font-medium text-sm">Chat with active farmers.</p>
              </div>
            </>
          )}
        </div>

        {/* Transactions Section */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-4 ml-2">Recent Transactions</h2>
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
            {loadingOrders ? (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                <Loader2 className="animate-spin text-amber-500" size={40} />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading history...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-10">
                <Clock size={64} className="text-slate-200 mb-4" />
                <h4 className="text-lg font-black text-slate-800">No transactions yet</h4>
                <p className="text-slate-500 font-medium text-sm mt-2 max-w-xs">Your purchase and sales history will appear here once you start trading.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {order.status === 'PAID' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800">{order.listing.grade} Cocoa - {order.quantityKg}kg</h4>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                          {user.role === 'FARMER' ? `Buyer: ${order.buyer.name}` : `Farmer: ${order.farmer.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="text-lg font-black text-slate-900">GHS {order.totalAmount.toLocaleString()}</span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                        order.status === 'PAID' ? 'bg-emerald-500 text-white' : 
                        order.status === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
