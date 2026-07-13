'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, List, MessageSquare, User, LogOut, Package, Clock, CheckCircle2, Star, Loader2, Droplets, Brain, TrendingUp, Archive, Truck, Thermometer, Wind } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'transactions' | 'listings'>('transactions');
  const [orders, setOrders] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [iotData, setIotData] = useState<any>(null);

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

    if (user?.role === 'FARMER') {
      const fetchListings = async () => {
        setLoadingListings(true);
        try {
          const res = await api.get(`/listings?farmerId=${user.id}`);
          const payload = res.data?.data ?? res.data;
          setListings(Array.isArray(payload) ? payload : []);
        } catch (err) {
          console.error('Failed to fetch listings', err);
          setListings([]);
        } finally {
          setLoadingListings(false);
        }
      };
      fetchListings();
      
      let unsubscribeLive = () => {};
      if (db) {
        const liveRef = ref(db, `telemetry/${user.id}/current`);
        unsubscribeLive = onValue(liveRef, (snapshot) => {
          const data = snapshot.val();
          if (data) setIotData(data);
        });
      }
      return () => unsubscribeLive();
    }
  }, [isAuthenticated, router, locale, user]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update order status.');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateListingStatus = async (listingId: string, newStatus: string) => {
    setUpdating(listingId);
    try {
      await api.put(`/listings/${listingId}`, { status: newStatus });
      setListings(listings.map(l => l.id === listingId ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error('Failed to update listing', err);
      alert('Failed to update listing status.');
    } finally {
      setUpdating(null);
    }
  };

  if (!isAuthenticated || !user) return null;

  const totalRevenue = orders.filter(o => o.status !== 'PENDING' && o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalSpent = orders.filter(o => o.status !== 'PENDING' && o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPurchasedKg = orders.filter(o => o.status !== 'PENDING' && o.status !== 'CANCELLED').reduce((sum, o) => sum + o.quantityKg, 0);

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-8 mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6 w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-50 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <User size={32} />
          </div>
          <div className="flex-grow">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Welcome, {user.name || user.email.split('@')[0]}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-widest">{user.role}</span>
              <p className="text-slate-500 font-medium text-sm">| CocoaLink Certified Partner</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Actions Section */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-4 ml-2">Quick Actions</h2>
          {user.role === 'FARMER' ? (
            <>
              <Link href={`/${locale}/dashboard/iot`} className="bg-white border border-slate-200 hover:border-amber-300 p-6 rounded-3xl flex flex-col gap-4 transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-lg font-black text-slate-800">Smart Farm IoT</h3>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase tracking-widest">Live</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 w-full">
                  <div className="bg-blue-50/50 rounded-2xl p-3 flex flex-col items-center justify-center border border-blue-100">
                    <Droplets size={18} className="text-blue-500 mb-1" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Moisture</span>
                    <span className="text-sm font-black text-slate-800">{iotData?.soilMoisture || '--'}%</span>
                  </div>
                  <div className="bg-orange-50/50 rounded-2xl p-3 flex flex-col items-center justify-center border border-orange-100">
                    <Thermometer size={18} className="text-orange-500 mb-1" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Temp</span>
                    <span className="text-sm font-black text-slate-800">{iotData?.temperature || '--'}°C</span>
                  </div>
                  <div className="bg-indigo-50/50 rounded-2xl p-3 flex flex-col items-center justify-center border border-indigo-100">
                    <Wind size={18} className="text-indigo-500 mb-1" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Humidity</span>
                    <span className="text-sm font-black text-slate-800">{iotData?.humidity || '--'}%</span>
                  </div>
                </div>
                <div className="text-center text-xs font-bold text-amber-600 group-hover:text-amber-700 mt-2">
                  View Full History &rarr;
                </div>
              </Link>
              
              <Link href={`/${locale}/dashboard/create-listing`} className="bg-gradient-to-br from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 p-8 rounded-3xl flex flex-col items-start text-white transition-all shadow-xl shadow-amber-600/20 hover:-translate-y-1 group">
                <PlusCircle size={40} className="mb-4 text-amber-100" />
                <h3 className="text-xl font-black">Create Listing</h3>
                <p className="text-amber-100/80 mt-2 font-medium text-sm">Post new cocoa batches to the marketplace.</p>
              </Link>
              
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex flex-col items-start">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-emerald-600" />
                  <h3 className="text-lg font-black text-emerald-900">Total Revenue</h3>
                </div>
                <p className="text-3xl font-black text-emerald-600">GHS {totalRevenue.toLocaleString()}</p>
              </div>

              <Link href={`/${locale}/dashboard/ai-advisor`} className="bg-white border-2 border-slate-100 hover:border-slate-300 p-6 rounded-3xl flex items-center gap-4 transition-all hover:-translate-y-1 group relative overflow-hidden">
                <Brain size={24} className="text-indigo-600" />
                <h3 className="text-lg font-black text-slate-800">AI Disease Advisor</h3>
              </Link>
              
              <Link href={`/${locale}/chat`} className="bg-white border-2 border-slate-100 hover:border-slate-300 p-6 rounded-3xl flex items-center gap-4 transition-all hover:-translate-y-1 group relative overflow-hidden">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors">Inquiries & Chats</h3>
                  <p className="text-slate-500 text-xs font-bold mt-1">Reply to buyer negotiations.</p>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link href={`/${locale}/listings`} className="bg-gradient-to-br from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 p-8 rounded-3xl flex flex-col items-start text-white transition-all shadow-xl shadow-amber-600/20 hover:-translate-y-1 group">
                <Package size={40} className="mb-4 text-amber-100" />
                <h3 className="text-xl font-black">Browse Cocoa</h3>
                <p className="text-amber-100/80 mt-2 font-medium text-sm">Find premium beans across Ghana.</p>
              </Link>

              <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex flex-col items-start shadow-sm">
                <div className="flex justify-between w-full mb-4">
                  <div>
                    <span className="text-xs font-black text-blue-500 uppercase tracking-widest block mb-1">Total Purchased</span>
                    <h3 className="text-3xl font-black text-slate-800">{totalPurchasedKg.toLocaleString()} <span className="text-lg text-slate-500 font-bold">kg</span></h3>
                  </div>
                  <Package className="text-blue-300" size={32} />
                </div>
                <div className="w-full bg-white/60 p-4 rounded-2xl flex justify-between items-center border border-blue-100/50">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Spent</span>
                  <span className="font-black text-blue-700 text-lg">GHS {totalSpent.toLocaleString()}</span>
                </div>
              </div>

              <Link href={`/${locale}/chat`} className="bg-white border-2 border-slate-100 hover:border-slate-300 p-6 rounded-3xl flex items-center gap-4 transition-all hover:-translate-y-1 group relative overflow-hidden">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">Inquiries & Chats</h3>
                  <p className="text-slate-500 text-xs font-bold mt-1">Talk with active farmers.</p>
                </div>
              </Link>
            </>
          )}
        </div>

        {/* Dashboard Content */}
        <div className="lg:col-span-2">
          {user.role === 'FARMER' && (
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-3 rounded-2xl font-black transition-all ${activeTab === 'transactions' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                Orders
              </button>
              <button 
                onClick={() => setActiveTab('listings')}
                className={`px-6 py-3 rounded-2xl font-black transition-all ${activeTab === 'listings' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                My Listings
              </button>
            </div>
          )}
          
          {user.role !== 'FARMER' && (
             <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-4 ml-2">My Orders</h2>
          )}

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
            {activeTab === 'transactions' && (
              loadingOrders ? (
                <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                  <Loader2 className="animate-spin text-amber-500" size={40} />
                  <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading history...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center px-10">
                  <Clock size={64} className="text-slate-200 mb-4" />
                  <h4 className="text-lg font-black text-slate-800">No orders yet</h4>
                  <p className="text-slate-500 font-medium text-sm mt-2 max-w-xs">Your purchase and sales history will appear here once you start trading.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                          order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' :
                          order.status === 'PAID' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {order.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : order.status === 'SHIPPED' ? <Truck size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800">{order.listing.grade} Cocoa - {order.quantityKg}kg</h4>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {user.role === 'FARMER' ? `Buyer: ${order.buyer.name}` : `Farmer: ${order.farmer.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto">
                        <span className="text-lg font-black text-slate-900">GHS {order.totalAmount.toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                            order.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : 
                            order.status === 'SHIPPED' ? 'bg-blue-500 text-white' : 
                            order.status === 'PAID' ? 'bg-indigo-500 text-white' : 
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {order.status}
                          </span>
                          
                          {/* Order Actions */}
                          {user.role === 'FARMER' && order.status === 'PAID' && (
                            <button 
                              disabled={updating === order.id}
                              onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                              className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-md hover:bg-blue-100 disabled:opacity-50"
                            >
                              {updating === order.id ? 'Updating...' : 'Mark Shipped'}
                            </button>
                          )}
                          {user.role === 'BUYER' && order.status === 'SHIPPED' && (
                            <button 
                              disabled={updating === order.id}
                              onClick={() => handleUpdateOrderStatus(order.id, 'COMPLETED')}
                              className="text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {updating === order.id ? 'Updating...' : 'Confirm Delivery'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'listings' && user.role === 'FARMER' && (
              loadingListings ? (
                <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                  <Loader2 className="animate-spin text-amber-500" size={40} />
                </div>
              ) : listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center px-10">
                  <Archive size={64} className="text-slate-200 mb-4" />
                  <h4 className="text-lg font-black text-slate-800">No listings found</h4>
                  <p className="text-slate-500 font-medium text-sm mt-2 max-w-xs">You haven't posted any cocoa for sale yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {listings.map((listing) => (
                    <div key={listing.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          listing.status === 'AVAILABLE' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Package size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800">Grade {listing.grade} - {listing.quantityKg}kg</h4>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {listing.region} Region
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto">
                        <span className="text-lg font-black text-emerald-600">GHS {listing.priceGhsPerTonne.toLocaleString()}/Tonne</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                            listing.status === 'AVAILABLE' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
                          }`}>
                            {listing.status}
                          </span>
                          
                          {listing.status === 'AVAILABLE' && (
                            <button 
                              disabled={updating === listing.id}
                              onClick={() => handleUpdateListingStatus(listing.id, 'SOLD')}
                              className="text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-md hover:bg-slate-200 disabled:opacity-50"
                            >
                              {updating === listing.id ? 'Updating...' : 'Mark Sold'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
