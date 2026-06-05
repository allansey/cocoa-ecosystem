'use client';
import Link from 'next/link';
import { MapPin, User, MessageCircle, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
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
    id: string;
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
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    setDeleting(true);
    try {
      await api.delete(`/listings/${listing!.id}`);
      router.push(`/${params.locale}/dashboard`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete listing');
    } finally {
      setDeleting(false);
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
      <div className="max-w-4xl mx-auto py-8 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl shadow-sm mb-6 inline-block font-semibold">{error || 'Listing not found'}</div>
        <br />
        <Link href={`/${params.locale}/listings`} className="inline-flex items-center text-amber-600 hover:text-amber-800 font-bold underline">
          <ArrowLeft size={16} className="mr-1" /> Return to Listings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <Link href={`/${params.locale}/listings`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-6 font-bold bg-amber-50 px-4 py-2 rounded-full shadow-sm hover:shadow transition-all">
        <ArrowLeft size={16} className="mr-2" /> Back to Listings
      </Link>
      
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white flex flex-col md:flex-row transform transition-all hover:shadow-amber-900/5">
        <div className="md:w-1/2 h-64 md:h-auto bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center relative border-r border-slate-100">
          <span className="text-amber-800/40 font-black tracking-widest text-2xl uppercase">No Image</span>
          {listing.status === 'SOLD' && (
            <div className="absolute top-6 left-6 bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-black shadow-lg transform -rotate-12">SOLD OUT</div>
          )}
        </div>
        
        <div className="md:w-1/2 p-10 flex flex-col">
          <div className="inline-block bg-gradient-to-r from-amber-200 to-amber-100 text-amber-800 font-black px-4 py-1.5 rounded-full text-sm self-start mb-6 shadow-sm border border-amber-200">{listing.grade}</div>
          <h2 className="text-4xl font-black text-slate-800 mb-2 leading-tight">{listing.quantityKg} kg <span className="text-2xl text-slate-500 font-bold">Cocoa Beans</span></h2>
          <div className="text-3xl font-black text-emerald-600 mb-8">{listing.priceGhsPerTonne.toLocaleString()} <span className="text-xl font-bold text-slate-500">GHS / Tonne</span></div>
          
          <div className="bg-slate-50/50 p-6 rounded-2xl mb-8 space-y-4 border border-slate-100 shadow-inner">
            <div className="flex items-center text-slate-700 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <User size={20} className="mr-4 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Farmer</p>
                <span className="font-bold text-lg">{listing.farmer?.name || 'Unknown'}</span>
              </div>
            </div>
            <div className="flex items-center text-slate-700 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <MapPin size={20} className="mr-4 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                <span className="font-bold text-lg">{listing.region} Region</span>
              </div>
            </div>
          </div>
          
          {user?.role === 'BUYER' && listing.status === 'AVAILABLE' && (
            <div className="mb-8 p-6 bg-amber-50 rounded-2xl border border-amber-100">
              <label className="block text-sm font-black text-amber-800 uppercase tracking-widest mb-3">Order Quantity (kg)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" min="1" max={listing.quantityKg} value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="w-24 border border-amber-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-bold text-amber-900"
                />
                <div className="flex-grow text-right">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Total Price</p>
                  <p className="text-xl font-black text-amber-900">GHS {((listing.priceGhsPerTonne / 1000) * orderQuantity).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto grid grid-cols-1 gap-4">
            {user?.role === 'BUYER' && listing.status === 'AVAILABLE' && (
              <button 
                onClick={handleOrder} disabled={ordering}
                className="flex items-center justify-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              >
                {ordering ? <Loader2 className="animate-spin mr-2" /> : null}
                {ordering ? 'Processing...' : 'Pay with Mobile Money'}
              </button>
            )}
            <Link 
              href={`/${params.locale}/chat/inquiry_${listing.id}`}
              className="flex items-center justify-center w-full bg-white border-2 border-amber-600 text-amber-600 hover:bg-amber-50 font-black text-lg py-4 rounded-2xl transition-all hover:-translate-y-1 active:scale-95"
            >
              <MessageCircle size={24} className="mr-3" /> Contact Farmer
            </Link>
            {user?.role === 'FARMER' && user?.id === listing.farmer.id && (
              <button 
                onClick={handleDelete} disabled={deleting}
                className="flex items-center justify-center w-full mt-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-lg py-4 rounded-2xl transition-all border border-red-200 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="animate-spin mr-2" /> : <Trash2 size={24} className="mr-3" />}
                {deleting ? 'Deleting...' : 'Delete Listing'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
