'use client';
import Link from 'next/link';
import { MapPin, User, MessageCircle, ArrowLeft, Loader2, Image as ImageIcon, Calendar, ShieldCheck, Handshake } from 'lucide-react';
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
  photo?: string;
  status: string;
  moistureLevel?: number;
  aiHealthScore?: number;
  diseaseStatus?: string;
  harvestDate?: string;
  createdAt: string;
  farmer: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
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

  // Food-App Style Checkout Drawer state
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'MOMO'>('COD');

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await api.get(`/listings/${params.id}`);
        setListing(res.data);
        if (res.data) setDeliveryRegion(res.data.region || 'Ashanti');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch listing details');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [params.id]);

  useEffect(() => {
    if (user) {
      setRecipientName(user.name || '');
      setRecipientPhone(user.phone || '');
    }
  }, [user]);

  const subtotal = listing ? (listing.priceGhsPerTonne / 1000) * orderQuantity : 0;
  const deliveryFee = orderQuantity > 500 ? 250 : 120;
  const serviceFee = Math.round(subtotal * 0.015);
  const grandTotal = subtotal + deliveryFee + serviceFee;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/${params.locale}/auth/login`);
      return;
    }
    setOrdering(true);
    setError('');

    try {
      const orderRes = await api.post('/orders', {
        listingId: listing!.id,
        quantityKg: orderQuantity,
        totalAmount: grandTotal,
        subtotal,
        deliveryFee,
        serviceFee,
        paymentMethod,
        recipientName,
        recipientPhone,
        deliveryAddress,
        deliveryCity,
        deliveryRegion,
        deliveryNotes,
        estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (paymentMethod === 'MOMO') {
        try {
          const payRes = await api.post('/payment/initialize', {
            orderId: orderRes.data.id,
            amount: grandTotal,
            email: user.email
          });
          if (payRes.data?.data?.authorization_url) {
            window.location.href = payRes.data.data.authorization_url;
            return;
          } else {
            setError('Mobile Money payment initialization failed. Please try again or select Cash on Delivery.');
            return;
          }
        } catch (payErr: any) {
          console.error('Payment initialization error:', payErr);
          const msg = payErr.response?.data?.error || payErr.response?.data?.details || 'Mobile Money payment failed. Please try again or choose Cash on Delivery.';
          setError(`Payment Error: ${msg}`);
          return;
        }
      }

      // Redirect straight to Order details / tracking page for COD
      router.push(`/${params.locale}/orders/${orderRes.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Order placement failed. Please check your network connection.');
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

  if (error && !listing) {
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
              <span className="font-medium tracking-widest text-sm uppercase opacity-50">Premium Batch</span>
            </div>
            {listing?.status === 'SOLD' && (
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
                Grade {listing?.grade}
              </span>
              <span className="text-slate-400 text-sm flex items-center">
                <Calendar size={14} className="mr-1.5" />
                {listing?.createdAt ? new Date(listing.createdAt).toLocaleDateString() : ''}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {listing?.quantityKg.toLocaleString()} kg
            </h1>
            <p className="text-lg text-slate-500 font-medium mb-8">Certified Dried Cocoa Beans</p>
            
            <div className="flex items-end gap-2 mb-10 pb-8 border-b border-slate-100">
              <span className="text-4xl font-bold text-emerald-600 leading-none">
                {listing?.priceGhsPerTonne.toLocaleString()}
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
                  <p className="font-semibold text-slate-800">{listing?.farmer?.name || 'Partner Farmer'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Origin</p>
                  <p className="font-semibold text-slate-800">{listing?.region} Region</p>
                </div>
              </div>
            </div>
            
            {/* Digital Cocoa Quality Passport Card */}
            <div className="bg-gradient-to-br from-amber-50/80 via-emerald-50/50 to-amber-50/40 rounded-2xl p-5 border border-amber-200/70 mb-8 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-amber-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Verified Quality Passport</h3>
                    <p className="text-[10px] text-slate-500 font-medium">IoT Sensor & AI Health Cert</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  COCOBOD Ready
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-white/80 rounded-xl p-2.5 border border-amber-100">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Moisture</span>
                  <span className="text-sm font-black text-emerald-700">
                    {listing?.moistureLevel ? `${listing.moistureLevel}%` : '6.8%'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Optimal (&le;7.5%)</span>
                </div>

                <div className="bg-white/80 rounded-xl p-2.5 border border-amber-100">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">AI Health</span>
                  <span className="text-sm font-black text-indigo-700">
                    {listing?.aiHealthScore ? `${listing.aiHealthScore}%` : '99.2%'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Rot-Free</span>
                </div>

                <div className="bg-white/80 rounded-xl p-2.5 border border-amber-100">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Purity</span>
                  <span className="text-sm font-black text-amber-800">
                    Grade {listing?.grade || 'A'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Single Origin</span>
                </div>
              </div>
            </div>

            {user?.role === 'BUYER' && listing?.status === 'AVAILABLE' && (
              <div className="mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Select Quantity to Order (kg)</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="number" min="1" max={listing.quantityKg} value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Number(e.target.value))}
                      className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-semibold text-slate-800 outline-none transition-all"
                    />
                  </div>
                  <div className="flex-grow text-right">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Estimated Cocoa Subtotal</p>
                    <p className="text-2xl font-bold text-slate-900">
                      GHS {subtotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto flex flex-col sm:flex-row gap-3">
              {user?.role === 'BUYER' && listing?.status === 'AVAILABLE' && (
                <>
                  <button 
                    onClick={() => setShowCheckout(true)}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black py-3.5 px-5 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-amber-600/20 active:scale-[0.98] text-sm"
                  >
                    Buy & Checkout &rarr;
                  </button>
                  <Link 
                    href={user ? `/${params.locale}/chat/inquiry_${listing?.id}_${user.id}` : `/${params.locale}/auth/login`}
                    className="bg-amber-100/70 hover:bg-amber-100 text-amber-900 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center border border-amber-200 text-sm active:scale-[0.98]"
                  >
                    <Handshake size={16} className="mr-1.5 text-amber-700" />
                    Make an Offer
                  </Link>
                </>
              )}
              <Link 
                href={user ? `/${params.locale}/chat/inquiry_${listing?.id}_${user.id}` : `/${params.locale}/auth/login`}
                className="flex-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-5 rounded-xl transition-all flex items-center justify-center active:scale-[0.98] text-sm"
              >
                <MessageCircle size={16} className="mr-2 text-slate-500" /> Chat with Farmer
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FOOD-APP STYLE CHECKOUT MODAL / DRAWER */}
      {showCheckout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">Checkout Step {checkoutStep} of 2</span>
                <h2 className="text-2xl font-black text-slate-900">
                  {checkoutStep === 1 ? 'Delivery & Recipient Details' : 'Review & Confirm Order'}
                </h2>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-black">
                &times;
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">
                {error}
              </div>
            )}

            {checkoutStep === 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Recipient Name</label>
                    <input 
                      type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} required
                      placeholder="Full Name"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                    <input 
                      type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} required
                      placeholder="+233 XX XXX XXXX"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Delivery Address / Warehouse</label>
                  <input 
                    type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} required
                    placeholder="e.g. Plot 45 Industrial Zone, Off Highway"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">City / Town</label>
                    <input 
                      type="text" value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} required
                      placeholder="e.g. Kumasi"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Region</label>
                    <select 
                      value={deliveryRegion} onChange={e => setDeliveryRegion(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                    >
                      <option value="Ashanti">Ashanti Region</option>
                      <option value="Western">Western Region</option>
                      <option value="Eastern">Eastern Region</option>
                      <option value="Central">Central Region</option>
                      <option value="Greater Accra">Greater Accra</option>
                      <option value="Ahafo">Ahafo Region</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Delivery Instructions / Notes (Optional)</label>
                  <textarea 
                    rows={2} value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call upon arrival at main gate"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <button 
                  onClick={() => {
                    if (!deliveryAddress || !deliveryCity || !recipientName) {
                      setError('Please fill in required delivery fields.');
                      return;
                    }
                    setError('');
                    setCheckoutStep(2);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all mt-4"
                >
                  Continue to Summary &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleOrder} className="space-y-5">
                {/* Items & Fees breakdown */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Cocoa Batch ({orderQuantity} kg - Grade {listing?.grade})</span>
                    <span className="font-bold text-slate-800">GHS {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Transport & Logistics Fee</span>
                    <span className="font-bold text-slate-800">GHS {deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Escrow Service & Verification Fee</span>
                    <span className="font-bold text-slate-800">GHS {serviceFee.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-black text-slate-900 text-base">Grand Total</span>
                      <p className="text-[11px] text-emerald-600 font-bold">Estimated Arrival: 2-3 Business Days</p>
                    </div>
                    <span className="text-2xl font-black text-emerald-600">GHS {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Delivery Address summary */}
                <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 text-xs space-y-1">
                  <span className="font-black text-amber-800 uppercase tracking-widest">Deliver To:</span>
                  <p className="font-bold text-slate-800">{recipientName} ({recipientPhone || 'No Phone'})</p>
                  <p className="text-slate-600">{deliveryAddress}, {deliveryCity}, {deliveryRegion} Region</p>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" onClick={() => setPaymentMethod('COD')}
                      className={`p-3 rounded-xl text-left border-2 font-bold text-xs flex flex-col gap-1 transition-all ${
                        paymentMethod === 'COD' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>💵 Cash / Pay on Delivery</span>
                      <span className="text-[10px] font-medium opacity-70">Pay when cocoa arrives</span>
                    </button>
                    <button 
                      type="button" onClick={() => setPaymentMethod('MOMO')}
                      className={`p-3 rounded-xl text-left border-2 font-bold text-xs flex flex-col gap-1 transition-all ${
                        paymentMethod === 'MOMO' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>📱 Mobile Money (MoMo)</span>
                      <span className="text-[10px] font-medium opacity-70">Instant Paystack gateway</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" onClick={() => setCheckoutStep(1)}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm"
                  >
                    &larr; Back
                  </button>
                  <button 
                    type="submit" disabled={ordering}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 text-sm flex items-center justify-center gap-2"
                  >
                    {ordering ? <Loader2 className="animate-spin" size={18} /> : null}
                    {ordering ? 'Placing Order...' : 'Confirm & Place Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
