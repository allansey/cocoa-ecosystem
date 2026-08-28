'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import {
  Package, Search, Filter, Truck, Clock, CheckCircle2,
  AlertTriangle, MapPin, ChevronRight, Loader2, ArrowLeft,
  Calendar, Phone, Banknote, ShieldAlert
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantityKg: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  deliveryCity?: string;
  deliveryRegion?: string;
  estimatedDeliveryDate?: string;
  transporterName?: string;
  vehicleNumber?: string;
  createdAt: string;
  listing: { id: string; grade: string; region: string; priceGhsPerTonne: number };
  buyer: { id: string; name: string; email: string; phone: string };
  farmer: { id: string; name: string; email: string; phone: string };
}

const STATUS_PROGRESS: Record<string, number> = {
  PENDING_APPROVAL: 15,
  ACCEPTED: 30,
  PAYMENT_PENDING: 45,
  PAID: 60,
  IN_TRANSIT: 80,
  DELIVERED: 95,
  COMPLETED: 100,
  CANCELLED: 0,
  DISPUTED: 50,
};

const STATUS_BADGE_STYLE: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
  ACCEPTED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  PAYMENT_PENDING: 'bg-purple-100 text-purple-800 border-purple-200',
  PAID: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_TRANSIT: 'bg-amber-500 text-white animate-pulse',
  DELIVERED: 'bg-teal-100 text-teal-800 border-teal-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  DISPUTED: 'bg-red-100 text-red-700 border-red-200',
};

export default function OrdersHubPage({ params }: { params: { locale: string } }) {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/my-orders?status=${selectedTab}&search=${encodeURIComponent(searchQuery)}`);
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push(`/${params.locale}/auth/login`);
      return;
    }
    fetchOrders();
  }, [_hasHydrated, isAuthenticated, selectedTab, searchQuery]);

  if (!_hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-amber-600" size={40} />
      </div>
    );
  }

  const activeOrdersCount = orders.filter(o => !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(o.status)).length;
  const completedOrdersCount = orders.filter(o => o.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-50/60 pt-8 pb-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href={`/${params.locale}/dashboard`} className="inline-flex items-center text-slate-500 hover:text-amber-700 font-bold text-xs uppercase tracking-wider mb-2 transition-colors">
              <ArrowLeft size={14} className="mr-1.5" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Order Tracking & History</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Manage live cocoa dispatches, delivery progress, and completed trade receipts.
            </p>
          </div>

          <Link href={`/${params.locale}/listings`} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
            <Package size={18} /> Browse Marketplace
          </Link>
        </div>

        {/* Stats Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <Truck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Deliveries</p>
              <h3 className="text-2xl font-black text-slate-800">{activeOrdersCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Orders</p>
              <h3 className="text-2xl font-black text-slate-800">{completedOrdersCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
              <Banknote size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</p>
              <h3 className="text-2xl font-black text-slate-800">{orders.length}</h3>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Tab Buttons */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedTab === tab
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {tab === 'ALL' ? 'All Orders' : tab === 'ACTIVE' ? 'Active / In Transit' : tab === 'COMPLETED' ? 'Completed' : 'Cancelled / Disputed'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, Grade, City..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 gap-4">
            <Loader2 className="animate-spin text-amber-500" size={40} />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading dispatches...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center flex flex-col items-center">
            <Truck size={48} className="text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-800">No Orders Found</h3>
            <p className="text-slate-500 font-medium text-sm mt-1 max-w-sm">
              No orders matched your current tab filter or search keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {orders.map((order) => {
              const otherParty = user.role === 'FARMER' ? order.buyer : order.farmer;
              const progressPct = STATUS_PROGRESS[order.status] || 20;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col gap-5 overflow-hidden group"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-black text-slate-900 text-lg">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${STATUS_BADGE_STYLE[order.status] || 'bg-slate-100 text-slate-600'}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Cost</p>
                      <p className="text-2xl font-black text-slate-900">GHS {order.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Middle Content */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Item Details */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item Batch</p>
                      <p className="font-black text-slate-800 text-base">{order.quantityKg.toLocaleString()} kg</p>
                      <p className="text-xs font-semibold text-amber-700">Grade {order.listing.grade} Cocoa Beans</p>
                    </div>

                    {/* Parties Details */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {user.role === 'FARMER' ? 'Buyer Contact' : 'Farmer Contact'}
                      </p>
                      <p className="font-bold text-slate-800">{otherParty.name}</p>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" /> {order.deliveryCity || order.listing.region} ({order.deliveryRegion || order.listing.region})
                      </p>
                    </div>

                    {/* Delivery & Transporter Preview */}
                    <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                      <p className="font-bold text-slate-700 flex items-center justify-between">
                        <span>ETA: {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : '2-3 Days'}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-md">
                          {order.paymentMethod === 'COD' ? 'COD' : 'MoMo'}
                        </span>
                      </p>
                      {order.transporterName ? (
                        <p className="text-slate-600 font-medium mt-1">
                          🚚 Driver: <span className="font-bold text-slate-800">{order.transporterName}</span> ({order.vehicleNumber || 'Truck'})
                        </p>
                      ) : (
                        <p className="text-slate-400 font-medium mt-1">Driver assignment pending...</p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {!['CANCELLED', 'DISPUTED'].includes(order.status) && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Order Processed</span>
                        <span>{order.status === 'COMPLETED' ? 'Delivered & Complete' : `${progressPct}% Delivered`}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Link */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-amber-700 group-hover:underline flex items-center gap-1">
                      Track Live & View Details
                    </span>
                    <Link
                      href={`/${params.locale}/orders/${order.id}`}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                    >
                      View Order Details <ChevronRight size={14} />
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
