'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, TrendingUp, Clock, PlusCircle, User, 
  Brain, Droplets, Thermometer, Wind, CheckCircle2, 
  Truck, Archive, Loader2, Handshake
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface IoTData {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  cropHealthStatus: string;
}

interface Order {
  id: string;
  quantityKg: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  listing: { grade: string };
  buyer: { name: string };
  farmer: { name: string };
}

interface Listing {
  id: string;
  grade: string;
  quantityKg: number;
  priceGhsPerTonne: number;
  region: string;
  status: string;
}

interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  priceGhsPerTonne: number;
  quantityKg: number;
  totalAmount: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
  counterPrice?: number;
  counterQuantity?: number;
  note?: string;
  chatId?: string;
  orderId?: string;
  createdAt: string;
  buyer: { name: string; email: string };
  farmer: { name: string; email: string };
  listing: { grade: string; region: string };
}

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  
  const [iotData, setIotData] = useState<IoTData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'listings' | 'offers'>('transactions');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    if (user.role === 'FARMER') {
      api.get('/iot/realtime')
        .then(res => setIotData(res.data))
        .catch(() => {});
    }

    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders/my-orders?status=ALL');
        const ordersData = res.data?.data || res.data || [];
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch (err) {
        console.warn('Could not fetch orders:', err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();

    const fetchOffers = async () => {
      try {
        const res = await api.get('/offers/my-offers');
        setOffers(res.data || []);
      } catch (err) {
        console.warn('Could not fetch offers:', err);
      } finally {
        setLoadingOffers(false);
      }
    };
    fetchOffers();

    if (user.role === 'FARMER') {
      const fetchListings = async () => {
        try {
          const res = await api.get('/listings/my-listings');
          const payload = res.data?.data || res.data;
          setListings(Array.isArray(payload) ? payload : []);
        } catch (err) {
          console.warn('Could not fetch listings:', err);
        } finally {
          setLoadingListings(false);
        }
      };
      fetchListings();
    } else {
      setLoadingListings(false);
    }
  }, [isAuthenticated, _hasHydrated, router, locale, user]);

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

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;
    setUpdating(listingId);
    try {
      await api.delete(`/listings/${listingId}`);
      setListings(listings.filter(l => l.id !== listingId));
    } catch (err: any) {
      console.error('Failed to delete listing', err);
      alert(err.response?.data?.error || 'Failed to delete listing.');
    } finally {
      setUpdating(null);
    }
  };

  if (!_hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-amber-600" size={32} />
      </div>
    );
  }

  const totalRevenue = orders.filter(o => o.status !== 'PENDING' && o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalSpent = orders.filter(o => o.status !== 'PENDING' && o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPurchasedKg = orders.filter(o => o.status !== 'PENDING' && o.status !== 'CANCELLED').reduce((sum, o) => sum + o.quantityKg, 0);

  return (
    <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6">
      
      {/* Refined Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center text-white shadow-xs font-black text-lg">
            {user.name ? user.name[0].toUpperCase() : <User size={20} />}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user.name || user.email.split('@')[0]}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {user.role}
              </span>
              <span className="text-xs text-slate-400 font-medium">CocoaLink Verified</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Actions Column */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Quick Actions</h2>
          
          {user.role === 'FARMER' ? (
            <>
              {/* AI Disease Advisor (Top Priority for Farmers) */}
              <Link 
                href={`/${locale}/dashboard/ai-advisor`} 
                className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl flex items-center justify-between transition-all hover:shadow-md hover:shadow-indigo-900/10 hover:-translate-y-0.5 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-indigo-300 flex items-center justify-center backdrop-blur-sm group-hover:scale-105 transition-transform">
                    <Brain size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">AI Disease Advisor</h3>
                      <span className="text-[9px] font-bold bg-indigo-500/40 text-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Twi Voice + AI
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 font-normal mt-0.5">Diagnose black pod & crop health</p>
                  </div>
                </div>
              </Link>

              {/* Smart Farm IoT */}
              <Link 
                href={`/${locale}/dashboard/iot`} 
                className="bg-white border border-slate-200 hover:border-amber-300 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 transition-all hover:shadow-sm hover:-translate-y-0.5 group"
              >
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-sm font-bold text-slate-800">Smart Farm IoT</h3>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 w-full">
                  <div className="bg-blue-50/60 rounded-xl p-2 flex flex-col items-center justify-center border border-blue-100">
                    <Droplets size={14} className="text-blue-500 mb-0.5" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Moisture</span>
                    <span className="text-xs font-bold text-slate-800">{iotData?.soilMoisture || '--'}%</span>
                  </div>
                  <div className="bg-orange-50/60 rounded-xl p-2 flex flex-col items-center justify-center border border-orange-100">
                    <Thermometer size={14} className="text-orange-500 mb-0.5" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Temp</span>
                    <span className="text-xs font-bold text-slate-800">{iotData?.temperature || '--'}°C</span>
                  </div>
                  <div className="bg-indigo-50/60 rounded-xl p-2 flex flex-col items-center justify-center border border-indigo-100">
                    <Wind size={14} className="text-indigo-500 mb-0.5" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Humidity</span>
                    <span className="text-xs font-bold text-slate-800">{iotData?.humidity || '--'}%</span>
                  </div>
                </div>
                <div className="text-right text-[11px] font-bold text-amber-700 group-hover:text-amber-800">
                  View Full History &rarr;
                </div>
              </Link>
              
              {/* Create Listing */}
              <Link 
                href={`/${locale}/dashboard/create-listing`} 
                className="bg-gradient-to-br from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 p-5 rounded-2xl flex flex-col items-start text-white transition-all shadow-xs hover:-translate-y-0.5 group"
              >
                <PlusCircle size={24} className="mb-2 text-amber-100" />
                <h3 className="text-base font-bold">Create Listing</h3>
                <p className="text-amber-100/90 text-xs mt-0.5">Post new harvest batches to the marketplace.</p>
              </Link>
              
              {/* Total Revenue */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Total Revenue</span>
                </div>
                <p className="text-xl font-bold text-emerald-700">GHS {totalRevenue.toLocaleString()}</p>
              </div>
            </>
          ) : (
            <>
              <Link 
                href={`/${locale}/listings`} 
                className="bg-gradient-to-br from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 p-5 rounded-2xl flex flex-col items-start text-white transition-all shadow-xs hover:-translate-y-0.5 group"
              >
                <Package size={24} className="mb-2 text-amber-100" />
                <h3 className="text-base font-bold">Browse Cocoa</h3>
                <p className="text-amber-100/90 text-xs mt-0.5">Find verified single-origin beans across Ghana.</p>
              </Link>

              <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex flex-col items-start shadow-xs">
                <div className="flex justify-between items-center w-full mb-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Total Purchased</span>
                  <Package className="text-blue-400" size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{totalPurchasedKg.toLocaleString()} <span className="text-xs text-slate-500 font-medium">kg</span></h3>
                <div className="w-full bg-white/70 p-2.5 rounded-xl flex justify-between items-center border border-blue-100 mt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Total Spent</span>
                  <span className="font-bold text-blue-800 text-sm">GHS {totalSpent.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dashboard Content Tabs */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-xl font-bold transition-all text-xs ${
                  activeTab === 'transactions' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Orders ({orders.length})
              </button>

              <button 
                onClick={() => setActiveTab('offers')}
                className={`px-4 py-2 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 ${
                  activeTab === 'offers' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Offers & Bargaining</span>
                {offers.filter(o => o.status === 'PENDING').length > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 rounded-full">
                    {offers.filter(o => o.status === 'PENDING').length}
                  </span>
                )}
              </button>

              {user.role === 'FARMER' && (
                <button 
                  onClick={() => setActiveTab('listings')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all text-xs ${
                    activeTab === 'listings' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  My Listings ({listings.length})
                </button>
              )}
            </div>

            <Link 
              href={`/${locale}/orders`} 
              className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80 transition-colors"
            >
              Tracking Hub &rarr;
            </Link>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden min-h-[360px]">
            
            {/* ORDERS TAB */}
            {activeTab === 'transactions' && (
              loadingOrders ? (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-2">
                  <Loader2 className="animate-spin text-amber-600" size={32} />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6 space-y-2">
                  <Clock size={40} className="text-slate-200" />
                  <h4 className="text-base font-bold text-slate-800">No orders yet</h4>
                  <p className="text-slate-400 text-xs max-w-xs">Your sales and purchase history will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'DELIVERED' ? 'bg-teal-100 text-teal-700' :
                          order.status === 'PAID' ? 'bg-indigo-100 text-indigo-700' :
                          order.status === 'CANCELLED' ? 'bg-slate-100 text-slate-400' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status === 'COMPLETED' ? <CheckCircle2 size={18} /> : order.status === 'IN_TRANSIT' || order.status === 'DELIVERED' ? <Truck size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{order.listing.grade} Cocoa · {order.quantityKg}kg</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {user.role === 'FARMER' ? `Buyer: ${order.buyer.name}` : `Farmer: ${order.farmer.name}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-sm font-bold text-slate-900">GHS {order.totalAmount.toLocaleString()}</span>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'PAID' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>

                          <Link
                            href={`/${locale}/orders/${order.id}`}
                            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* LISTINGS TAB */}
            {activeTab === 'listings' && user.role === 'FARMER' && (
              loadingListings ? (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-2">
                  <Loader2 className="animate-spin text-amber-600" size={32} />
                </div>
              ) : listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6 space-y-2">
                  <Archive size={40} className="text-slate-200" />
                  <h4 className="text-base font-bold text-slate-800">No listings found</h4>
                  <p className="text-slate-400 text-xs max-w-xs">You haven't posted any cocoa for sale yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {listings.map((listing) => (
                    <div key={listing.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          listing.status === 'AVAILABLE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Package size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Grade {listing.grade} · {listing.quantityKg}kg</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{listing.region} Region</p>
                        </div>
                      </div>

                      <div className="text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        <span className="text-sm font-bold text-slate-900">GHS {listing.priceGhsPerTonne.toLocaleString()}/Tonne</span>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            listing.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {listing.status}
                          </span>
                          
                          {listing.status === 'AVAILABLE' && (
                            <button 
                              disabled={updating === listing.id}
                              onClick={() => handleUpdateListingStatus(listing.id, 'SOLD')}
                              className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-200"
                            >
                              Mark Sold
                            </button>
                          )}
                          <button 
                            disabled={updating === listing.id}
                            onClick={() => handleDeleteListing(listing.id)}
                            className="text-xs font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* OFFERS TAB */}
            {activeTab === 'offers' && (
              loadingOffers ? (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-2">
                  <Loader2 className="animate-spin text-amber-600" size={32} />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Loading offers...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6 space-y-2">
                  <Handshake size={40} className="text-slate-200" />
                  <h4 className="text-base font-bold text-slate-800">No active offers yet</h4>
                  <p className="text-slate-400 text-xs max-w-xs">
                    {user.role === 'FARMER' 
                      ? 'When buyers propose bargaining terms, they will appear here.'
                      : 'Offers you make on marketplace listings will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {offers.map((offer) => {
                    const isAccepted = offer.status === 'ACCEPTED';
                    const isDeclined = offer.status === 'DECLINED';
                    const isCountered = offer.status === 'COUNTERED';
                    const isFarmer = user.role === 'FARMER';
                    const otherParty = isFarmer ? offer.buyer : offer.farmer;
                    const chatId = offer.chatId || `inquiry_${offer.listingId}_${offer.buyerId}`;

                    return (
                      <div key={offer.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isAccepted ? 'bg-emerald-100 text-emerald-700' :
                            isDeclined ? 'bg-red-100 text-red-600' :
                            isCountered ? 'bg-amber-100 text-amber-700' :
                            'bg-amber-500 text-white shadow-xs'
                          }`}>
                            ₵
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">
                                {offer.listing?.grade || 'Grade A'} Cocoa · {(offer.counterQuantity || offer.quantityKg).toLocaleString()} kg
                              </h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isAccepted ? 'bg-emerald-100 text-emerald-800' :
                                isDeclined ? 'bg-red-100 text-red-700' :
                                isCountered ? 'bg-amber-100 text-amber-900' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {offer.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {isFarmer ? `Buyer: ${otherParty?.name || 'Trading Partner'}` : `Farmer: ${otherParty?.name || 'Partner'}`} · {offer.listing?.region || 'Ghana'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                          <div>
                            <span className="text-sm font-bold text-emerald-700">
                              {(offer.counterPrice || offer.priceGhsPerTonne).toLocaleString()} GHS
                            </span>
                            <span className="text-xs text-slate-400">/Tonne</span>
                          </div>

                          <Link
                            href={`/${locale}/chat/${chatId}`}
                            className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors"
                          >
                            Open Chat &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
