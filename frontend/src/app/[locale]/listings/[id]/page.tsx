'use client';
import Link from 'next/link';
import { MapPin, User, MessageCircle, ArrowLeft, Loader2, Image as ImageIcon, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

interface ListingDetails {
  id: string;
  grade: string;
  quantityKg: number;
  priceGhsPerTonne: number;
  region: string;
  status: string;
  createdAt: string;
  farmer: {
    name: string;
    phone: string;
  };
}

export default function ListingDetailsPage({ params }: { params: { locale: string, id: string } }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await api.get(`/listings/${params.id}`);
        setListing(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch listing details');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [params.id]);

  const handleOrder = async () => {
    if (!user) {
      router.push(`/${params.locale}/auth/login`);
      return;
    }
    setOrdering(true);
    try {
      const totalAmount = (listing!.priceGhsPerTonne / 1000) * orderQuantity;
      const orderRes = await api.post('/orders', {
        listingId: listing!.id,
        quantityKg: orderQuantity,
        totalAmount,
        paymentMethod: 'MOMO'
      });

      const payRes = await api.post('/payment/initialize', {
        orderId: orderRes.data.id,
        amount: totalAmount,
        email: user.email
      });

      window.location.href = payRes.data.data.authorization_url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Order failed');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[50vh]">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-6 text-center">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl shadow-sm mb-8 inline-block font-medium">{error || 'Listing not found'}</div>
        <br />
        <Link href={`/${params.locale}/listings`} className="inline-flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Return to Listings
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link href={`/${params.locale}/listings`} className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-8 font-medium transition-colors group">
          <div className="p-2 bg-white rounded-full shadow-sm mr-3 group-hover:shadow border border-slate-100 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to marketplace
        </Link>
        
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col md:flex-row border border-slate-100/60">
          {/* Image Placeholder Section */}
          <div className="md:w-[45%] h-80 md:h-auto bg-slate-100 relative group overflow-hidden">
            <div className="absolute inset-0 bg-amber-900/5 group-hover:bg-amber-900/0 transition-colors duration-500 z-10" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <ImageIcon size={48} strokeWidth={1} className="mb-4 opacity-50" />
              <span className="font-medium tracking-widest text-sm uppercase opacity-50">Image unavailable</span>
            </div>
            {listing.status === 'SOLD' && (
              <div className="absolute top-6 left-6 z-20">
                <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-sm">
                  SOLD OUT
                </span>
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="md:w-[55%] p-8 md:p-12 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-amber-100/80 text-amber-800 font-semibold px-4 py-1 rounded-full text-xs tracking-wide">
                Grade {listing.grade}
              </span>
              <span className="text-slate-400 text-sm flex items-center">
                <Calendar size={14} className="mr-1.5" />
                {new Date(listing.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {listing.quantityKg.toLocaleString()} kg
            </h1>
            <p className="text-lg text-slate-500 font-medium mb-8">Premium Cocoa Beans</p>
            
            <div className="flex items-end gap-2 mb-10 pb-8 border-b border-slate-100">
              <span className="text-4xl font-bold text-emerald-600 leading-none">
                {listing.priceGhsPerTonne.toLocaleString()}
              </span>
              <span className="text-slate-500 font-medium mb-1">GHS / Tonne</span>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-600">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Farmer</p>
                  <p className="font-semibold text-slate-800">{listing.farmer?.name || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                  <p className="font-semibold text-slate-800">{listing.region} Region</p>
                </div>
              </div>
            </div>
            
            {user?.role === 'BUYER' && listing.status === 'AVAILABLE' && (
              <div className="mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Order Quantity (kg)</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="number" min="1" max={listing.quantityKg} value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Number(e.target.value))}
                      className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-semibold text-slate-800 outline-none transition-all"
                    />
                  </div>
                  <div className="flex-grow text-right">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Total Price</p>
                    <p className="text-2xl font-bold text-slate-900">
                      GHS {((listing.priceGhsPerTonne / 1000) * orderQuantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto flex flex-col sm:flex-row gap-4">
              {user?.role === 'BUYER' && listing.status === 'AVAILABLE' && (
                <button 
                  onClick={handleOrder} disabled={ordering}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {ordering ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                  {ordering ? 'Processing...' : 'Buy Now'}
                </button>
              )}
              <Link 
                href={`/${params.locale}/chat/inquiry_${listing.id}`}
                className="flex-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center active:scale-[0.98]"
              >
                <MessageCircle size={18} className="mr-2" /> Message
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
