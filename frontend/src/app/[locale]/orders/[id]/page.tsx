'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { db } from '@/firebase';
import { ref, push, onValue, update } from 'firebase/database';
import {
  ArrowLeft, Send, CheckCircle2, Package, Truck, Clock, CreditCard,
  AlertTriangle, MessageCircle, ShieldAlert, MapPin, Phone, User,
  Banknote, ChevronRight, Activity, Star, Camera, ExternalLink, Award, Sparkles
} from 'lucide-react';

interface Order {
  id: string;
  quantityKg: number;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  serviceFee?: number;
  proposedPrice?: number;
  status: string;
  paymentMethod: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryRegion?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryNotes?: string;
  transporterName?: string;
  transporterPhone?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
  loadingProofPhoto?: string;
  weighbridgeReceipt?: string;
  review?: {
    id: string;
    rating: number;
    comment: string;
    badges: string;
  };
  createdAt: string;
  listing: { id: string; grade: string; region: string; priceGhsPerTonne: number; photo?: string };
  buyer: { id: string; name: string; email: string; phone: string };
  farmer: { id: string; name: string; email: string; phone: string };
  activities: Activity[];
}

interface Activity {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  note: string;
  createdAt: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

const STATUS_STEPS = [
  { id: 'PENDING_APPROVAL', label: 'Order Placed', icon: Clock, desc: 'Waiting for farmer to accept' },
  { id: 'ACCEPTED', label: 'Order Accepted', icon: CheckCircle2, desc: 'Farmer accepted the order' },
  { id: 'PAYMENT_PENDING', label: 'Payment Arranged', icon: CreditCard, desc: 'Buyer confirmed payment arrangement' },
  { id: 'PAID', label: 'Payment Confirmed', icon: Banknote, desc: 'Farmer confirmed payment received' },
  { id: 'IN_TRANSIT', label: 'In Transit', icon: Truck, desc: 'Cocoa dispatched and on the way' },
  { id: 'DELIVERED', label: 'Delivered', icon: MapPin, desc: 'Cocoa delivered to buyer' },
  { id: 'COMPLETED', label: 'Completed', icon: CheckCircle2, desc: 'Transaction complete' },
];

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Order Placed',
  ACCEPTED: 'Order Accepted',
  PAYMENT_PENDING: 'Payment Arranged',
  PAID: 'Payment Received',
  IN_TRANSIT: 'Batch Dispatched',
  LOGISTICS_UPDATED: 'Driver Assigned',
  DELIVERED: 'Batch Delivered',
  COMPLETED: 'Order Completed',
  DISPUTED: 'Dispute Raised',
  CANCELLED: 'Order Cancelled',
  REVIEWED: 'Rated & Reviewed'
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAYMENT_PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-green-50 text-green-700 border-green-200',
  IN_TRANSIT: 'bg-purple-50 text-purple-700 border-purple-200',
  LOGISTICS_UPDATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-teal-50 text-teal-700 border-teal-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  DISPUTED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-50 text-slate-700 border-slate-200',
  REVIEWED: 'bg-amber-50 text-amber-800 border-amber-300'
};

export default function OrderDetailsPage({ params }: { params: { locale: string, id: string } }) {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'chat'>('timeline');

  // Dispatch Logistics Modal state for Farmer
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [trackingRef, setTrackingRef] = useState('');
  const [loadingPhotoBase64, setLoadingPhotoBase64] = useState<string | null>(null);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [orderChatError, setOrderChatError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${params.id}`);
      setOrder(res.data);
      if (res.data) {
        setDriverName(res.data.transporterName || '');
        setDriverPhone(res.data.transporterPhone || '');
        setTruckNumber(res.data.vehicleNumber || '');
        setTrackingRef(res.data.trackingNumber || `TRK-${params.id.slice(0, 8).toUpperCase()}`);
        if (res.data.loadingProofPhoto) setLoadingPhotoBase64(res.data.loadingProofPhoto);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load order');
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
    fetchOrder();
  }, [params.id, isAuthenticated, _hasHydrated, router, params.locale]);

  // Real-time Chat Sync
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !order) return;

    if (!db) {
      setOrderChatError('Firebase Realtime Database is not configured.');
      return;
    }

    const chatId = `order_${order.id}`;
    const chatRef = ref(db, `chats/${chatId}`);

    const unsubscribe = onValue(
      chatRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const parsed: Message[] = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          })).sort((a, b) => a.timestamp - b.timestamp);
          setMessages(parsed);
        } else {
          setMessages([]);
        }
        setOrderChatError('');
      },
      (err) => {
        console.error('[Firebase Order Chat Error]:', err);
        setOrderChatError(`Chat Offline: ${err.message || 'Error'}`);
      }
    );

    return () => unsubscribe();
  }, [order?.id, isAuthenticated, _hasHydrated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !order || !db) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const chatId = `order_${order.id}`;
      const chatRef = ref(db, `chats/${chatId}`);
      const timestamp = Date.now();

      await push(chatRef, {
        senderId: user.id,
        senderName: user.name || user.email.split('@')[0],
        text: msgText,
        timestamp,
      });

      const recipientId = user.id === order.farmer.id ? order.buyer.id : order.farmer.id;
      const recipientName = user.id === order.farmer.id ? order.buyer.name : order.farmer.name;

      const updates: Record<string, any> = {};
      updates[`userChats/${user.id}/${chatId}`] = {
        id: chatId,
        title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
        otherPartyName: recipientName,
        otherPartyId: recipientId,
        lastMessage: msgText,
        timestamp,
        unread: false
      };

      updates[`userChats/${recipientId}/${chatId}`] = {
        id: chatId,
        title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
        otherPartyName: user.name || 'User',
        otherPartyId: user.id,
        lastMessage: msgText,
        timestamp,
        unread: true
      };

      await update(ref(db), updates);
    } catch (err) { console.error('Error sending message:', err); }
  };

  const updateStatus = async (newStatus: string, note?: string, logisticsData?: any) => {
    if (!order) return;
    setActionLoading(true);
    try {
      const payload: any = { status: newStatus, note };
      if (logisticsData) {
        payload.transporterName = logisticsData.driverName;
        payload.transporterPhone = logisticsData.driverPhone;
        payload.vehicleNumber = logisticsData.truckNumber;
        payload.trackingNumber = logisticsData.trackingRef;
        if (logisticsData.loadingProofPhoto) payload.loadingProofPhoto = logisticsData.loadingProofPhoto;
      }
      const res = await api.put(`/orders/${order.id}/status`, payload);
      setOrder(res.data);
      setShowDispatchModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        orderId: order.id,
        rating: reviewRating,
        comment: reviewComment,
        badges: selectedBadges
      });
      setShowReviewModal(false);
      fetchOrder();
      alert('Thank you! Your verified review and trust badges have been published.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-slate-50">
      {error || 'Order not found'}
    </div>
  );

  const isFarmer = user?.id === order.farmer.id;
  const isBuyer = user?.id === order.buyer.id;
  const isDisputed = order.status === 'DISPUTED';
  const isCancelled = order.status === 'CANCELLED';
  const isCompleted = order.status === 'COMPLETED';
  const isTerminal = isDisputed || isCancelled || isCompleted;

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === order.status);
  const otherParty = isFarmer ? order.buyer : order.farmer;
  const otherRole = isFarmer ? 'Buyer' : 'Farmer';

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Back Button & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href={`/${params.locale}/orders`} className="inline-flex items-center text-slate-500 hover:text-slate-800 font-semibold transition-colors">
            <div className="p-2 bg-white rounded-full shadow-xs mr-2 border border-slate-100">
              <ArrowLeft size={16} />
            </div>
            Back to Orders
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Order ID:</span>
            <span className="font-mono text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Top Summary Banner */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
              <Package size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900">{order.listing.grade} Cocoa Beans</h1>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  {order.listing.region} Region
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Ordered on {new Date(order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400">Quantity</p>
              <p className="text-xl font-black text-slate-900">{order.quantityKg.toLocaleString()} kg</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400">Grand Total</p>
              <p className="text-2xl font-black text-emerald-600">GHS {order.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* MAIN GRID: 2 COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT COLUMN — Tracking, Details & Actions (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Financial Breakdown Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Financial Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Cocoa Batch ({order.quantityKg} kg)</span>
                  <span className="font-bold text-slate-800">GHS {(order.subtotal || order.totalAmount).toLocaleString()}</span>
                </div>
                {order.deliveryFee ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Logistics & Haulage</span>
                    <span className="font-bold text-slate-800">GHS {order.deliveryFee.toLocaleString()}</span>
                  </div>
                ) : null}
                {order.serviceFee ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Platform & Escrow Fee</span>
                    <span className="font-bold text-slate-800">GHS {order.serviceFee.toLocaleString()}</span>
                  </div>
                ) : null}
                <div className="pt-2 border-t border-slate-100 flex justify-between text-base">
                  <span className="font-black text-slate-800">Grand Total</span>
                  <span className="font-black text-emerald-600 text-lg">GHS {order.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-400 font-medium">Payment Method</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {order.paymentMethod === 'COD' ? 'Cash / Pay on Delivery' : 'Mobile Money (MoMo)'}
                  </span>
                </div>
                <div className={`mt-3 text-center py-2.5 rounded-xl font-black text-xs uppercase tracking-widest ${
                  isDisputed ? 'bg-red-100 text-red-700' :
                  isCancelled ? 'bg-slate-100 text-slate-600' :
                  isCompleted ? 'bg-emerald-100 text-emerald-700' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  Status: {order.status.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* Delivery Destination & Recipient Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                <span>Delivery Destination</span>
                <MapPin size={14} className="text-amber-600" />
              </h3>
              <div className="text-sm space-y-1">
                <p className="font-black text-slate-800">{order.recipientName || order.buyer.name}</p>
                <p className="text-slate-600 font-medium">{order.deliveryAddress || 'Warehouse Address Pending'}</p>
                <p className="text-slate-500 text-xs">{order.deliveryCity || order.listing.region}, {order.deliveryRegion || order.listing.region} Region</p>
                {order.recipientPhone && (
                  <a href={`tel:${order.recipientPhone}`} className="inline-flex items-center gap-1 text-xs text-amber-700 font-bold mt-1 hover:underline">
                    <Phone size={12} /> Call Recipient: {order.recipientPhone}
                  </a>
                )}
                {order.deliveryNotes && (
                  <div className="mt-2 bg-amber-50/70 p-3 rounded-xl border border-amber-100 text-xs text-slate-700">
                    <span className="font-bold text-amber-900 block mb-0.5">Delivery Instructions:</span>
                    {order.deliveryNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Driver / Transporter Dispatch Card & Visual Proof */}
            {(order.transporterName || order.status === 'IN_TRANSIT' || order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Assigned Driver & Logistics</span>
                  <Truck size={18} className="text-amber-400" />
                </div>
                
                <div className="space-y-1">
                  <p className="font-black text-lg text-white">{order.transporterName || 'Haulage Driver Assigned'}</p>
                  <p className="text-xs text-slate-300">Truck / Plate: <span className="font-bold text-white">{order.vehicleNumber || 'Pending'}</span></p>
                  <p className="text-xs text-slate-300">Tracking Code: <span className="font-bold text-amber-300">#{order.trackingNumber || order.id.slice(0, 8).toUpperCase()}</span></p>
                </div>

                {/* 1-Tap Transporter Actions */}
                {order.transporterPhone && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a 
                      href={`tel:${order.transporterPhone}`} 
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Phone size={13} /> Direct Call
                    </a>
                    <a 
                      href={`https://wa.me/${order.transporterPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(order.transporterName || 'Driver')},%20inquiring%20about%20Cocoa%20Order%20%23${order.id.slice(0, 8).toUpperCase()}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  </div>
                )}

                {/* Loading Proof Photo Preview (If Present) */}
                {order.loadingProofPhoto && (
                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
                        <Camera size={12} /> Loading & Weigh Photo Proof
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        Verified
                      </span>
                    </div>
                    <img 
                      src={order.loadingProofPhoto} 
                      alt="Proof of Loading" 
                      className="w-full h-32 object-cover rounded-xl border border-slate-700 shadow-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Other Party Contact */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{otherRole} Profile</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-lg">
                  {otherParty.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-slate-800">{otherParty.name}</p>
                  <p className="text-xs text-slate-500">{otherParty.email}</p>
                  {otherParty.phone && (
                    <a href={`tel:${otherParty.phone}`} className="inline-flex items-center gap-1 text-xs text-amber-600 font-bold hover:underline">
                      <Phone size={12} /> {otherParty.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Tracker */}
            {!isDisputed && !isCancelled && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Delivery Progress</h3>
                <div className="relative">
                  <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-100 z-0" />
                  <div className="flex flex-col gap-5">
                    {STATUS_STEPS.map((step, index) => {
                      const done = currentStepIndex >= index;
                      const active = currentStepIndex === index;
                      const Icon = step.icon;
                      return (
                        <div key={step.id} className="relative z-10 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                            done ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200' : 'bg-white border-slate-200 text-slate-300'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${active ? 'text-amber-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                              {step.label}
                            </p>
                            {active && <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {isDisputed && (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex items-start gap-4">
                <ShieldAlert className="text-red-500 shrink-0 mt-1" size={24} />
                <div>
                  <p className="font-black text-red-800">Dispute Active</p>
                  <p className="text-sm text-red-600 mt-1">An admin support agent has been assigned. Please communicate inside the order chat tab.</p>
                </div>
              </div>
            )}

            {/* Action Center */}
            {!isTerminal && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Stage Actions</h3>
                <div className="flex flex-col gap-3">

                  {/* FARMER: Accept */}
                  {isFarmer && order.status === 'PENDING_APPROVAL' && (
                    <button disabled={actionLoading} onClick={() => updateStatus('ACCEPTED')}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-amber-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} /> Accept & Process Order
                    </button>
                  )}

                  {/* FARMER: Reject */}
                  {isFarmer && order.status === 'PENDING_APPROVAL' && (
                    <button disabled={actionLoading} onClick={() => updateStatus('CANCELLED', 'Order rejected by farmer')}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-black transition-all disabled:opacity-50">
                      Reject Order
                    </button>
                  )}

                  {/* BUYER: Confirm Payment Arranged (COD) */}
                  {isBuyer && order.status === 'ACCEPTED' && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                        💡 Confirm that your payment / cash arrangement is ready for when the cocoa is delivered.
                      </p>
                      <button disabled={actionLoading} onClick={() => updateStatus('PAYMENT_PENDING')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                        <CreditCard size={18} /> Confirm Payment Arranged
                      </button>
                    </div>
                  )}

                  {/* FARMER: Confirm Payment Received */}
                  {isFarmer && order.status === 'PAYMENT_PENDING' && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                        💡 Buyer confirmed payment arrangement. Confirm payment or escrow agreement below.
                      </p>
                      <button disabled={actionLoading} onClick={() => updateStatus('PAID')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Banknote size={18} /> Confirm Payment Received
                      </button>
                    </div>
                  )}

                  {/* FARMER: Dispatch Modal Trigger */}
                  {isFarmer && order.status === 'PAID' && (
                    <button disabled={actionLoading} onClick={() => setShowDispatchModal(true)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-amber-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                      <Truck size={18} /> Dispatch Batch & Add Transporter Details
                    </button>
                  )}

                  {/* FARMER: Mark Delivered */}
                  {isFarmer && order.status === 'IN_TRANSIT' && (
                    <button disabled={actionLoading} onClick={() => updateStatus('DELIVERED')}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-teal-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                      <MapPin size={18} /> Mark as Delivered to Destination
                    </button>
                  )}

                  {/* BUYER: Confirm Receipt */}
                  {isBuyer && order.status === 'DELIVERED' && (
                    <button disabled={actionLoading} onClick={() => updateStatus('COMPLETED')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} /> Inspect Cocoa & Confirm Receipt
                    </button>
                  )}

                  {/* Waiting state badges */}
                  {isFarmer && order.status === 'ACCEPTED' && (
                    <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl">
                      <Clock size={20} className="mx-auto mb-2" />
                      Waiting for buyer to confirm payment arrangement...
                    </div>
                  )}
                  {isBuyer && order.status === 'PENDING_APPROVAL' && (
                    <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl">
                      <Clock size={20} className="mx-auto mb-2" />
                      Waiting for farmer to accept your order...
                    </div>
                  )}
                  {isBuyer && order.status === 'IN_TRANSIT' && (
                    <div className="text-center py-4 text-amber-700 text-xs font-bold bg-amber-50 rounded-2xl border border-amber-100">
                      <Truck size={20} className="mx-auto mb-2 animate-pulse" />
                      Your cocoa dispatch is currently in transit!
                    </div>
                  )}

                  {/* Dispute button */}
                  <button disabled={actionLoading} onClick={() => updateStatus('DISPUTED')}
                    className="w-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 py-3 rounded-2xl font-bold transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-2">
                    <AlertTriangle size={16} /> Raise a Dispute / Request Support
                  </button>

                </div>
              </div>
            )}

            {isCompleted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-4">
                <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
                <div>
                  <p className="font-black text-emerald-900 text-lg">Transaction Completed</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Cocoa inspected, weigh confirmed & payment settled.</p>
                </div>

                {order.review ? (
                  <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-800">Your Verified Rating:</span>
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < order.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} 
                          />
                        ))}
                      </div>
                    </div>
                    {order.review.comment && (
                      <p className="text-xs text-slate-600 italic">"{order.review.comment}"</p>
                    )}
                    {order.review.badges && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {order.review.badges.split(',').map((b, i) => (
                          <span key={i} className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                            ⭐ {b.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowReviewModal(true)}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black py-3 rounded-2xl text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Star size={16} className="fill-white" />
                    <span>Rate Your Experience & Award Badges</span>
                  </button>
                )}
              </div>
            )}

            {isCancelled && (
              <div className="bg-slate-100 border border-slate-200 rounded-3xl p-6 text-center">
                <AlertTriangle className="mx-auto text-slate-400 mb-3" size={36} />
                <p className="font-black text-slate-600 text-lg">Order Cancelled</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Timeline + Chat */}
          <div className="lg:col-span-3 flex flex-col gap-0 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" style={{ height: '85vh', minHeight: '600px' }}>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-4 font-black text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'timeline' ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50' : 'text-slate-400 hover:text-slate-600'}`}>
                <Activity size={16} /> Activity Log
              </button>
              <button onClick={() => setActiveTab('chat')}
                className={`flex-1 py-4 font-black text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50' : 'text-slate-400 hover:text-slate-600'}`}>
                <MessageCircle size={16} /> Chat
                {messages.length > 0 && <span className="bg-amber-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{messages.length}</span>}
              </button>
            </div>

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="flex-1 overflow-y-auto p-6">
                {order.activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                    <Activity size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">No activity yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-100 z-0" />
                    <div className="flex flex-col gap-6">
                      {[...order.activities].reverse().map((act) => (
                        <div key={act.id} className="relative z-10 flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${ACTION_COLORS[act.action] || 'bg-slate-100 text-slate-500'}`}>
                            {act.actorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-800 text-sm">{act.actorName}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ACTION_COLORS[act.action] || 'bg-slate-100 text-slate-500'}`}>
                                {ACTION_LABELS[act.action] || act.action}
                              </span>
                            </div>
                            {act.note && <p className="text-xs text-slate-600 mt-1 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">{act.note}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(act.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col bg-slate-50/50">
                  {orderChatError && (
                    <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl border border-amber-200">
                      ⚠️ {orderChatError}
                    </div>
                  )}
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                      <MessageCircle size={48} className="text-slate-300 mb-4" />
                      <p className="text-slate-500 font-bold">No messages yet</p>
                      <p className="text-sm text-slate-400 mt-2">Use this chat to discuss delivery, payment, or any issue.</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id}
                        className={`flex flex-col max-w-[80%] ${msg.senderId === user?.id ? 'self-end items-end' : 'self-start items-start'}`}>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 mx-2">
                          {msg.senderId === user?.id ? 'You' : msg.senderName}
                        </span>
                        <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed font-medium ${
                          msg.senderId === user?.id
                            ? 'bg-amber-600 text-white rounded-tr-none shadow-amber-200'
                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-slate-100'
                        }`}>
                          {msg.text}
                        </div>
                        {msg.timestamp && (
                          <span className="text-[10px] text-slate-400 mt-1 mx-2">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 bg-white border-t border-slate-100">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..." disabled={isCancelled}
                      className="flex-grow bg-slate-100 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 placeholder:text-slate-400"
                    />
                    <button type="submit" disabled={!newMessage.trim() || isCancelled}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl px-5 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-600/20 disabled:opacity-40 disabled:grayscale">
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FARMER DISPATCH LOGISTICS & PHOTO PROOF MODAL */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">Dispatch Batch</span>
                <h3 className="text-xl font-black text-slate-900">Assign Driver & Loading Proof</h3>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-black">
                &times;
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateStatus('IN_TRANSIT', undefined, { 
                driverName, driverPhone, truckNumber, trackingRef, 
                loadingProofPhoto: loadingPhotoBase64 
              });
            }} className="space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transporter / Driver Name</label>
                <input 
                  type="text" value={driverName} onChange={e => setDriverName(e.target.value)} required
                  placeholder="e.g. Kwame Boateng (VIP Haulage)"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Phone Number (Ghana)</label>
                <input 
                  type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} required
                  placeholder="e.g. +233 24 123 4567"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Plate</label>
                  <input 
                    type="text" value={truckNumber} onChange={e => setTruckNumber(e.target.value)} required
                    placeholder="e.g. AS 8492-23"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tracking Reference</label>
                  <input 
                    type="text" value={trackingRef} onChange={e => setTrackingRef(e.target.value)} required
                    placeholder="e.g. TRK-9842"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Photo Proof of Loading Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Photo Proof of Loading & Weighbridge</span>
                  <span className="text-[10px] text-amber-600 font-bold">Recommended</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-3 text-center bg-slate-50">
                  {loadingPhotoBase64 ? (
                    <div className="relative">
                      <img src={loadingPhotoBase64} alt="Loading Proof" className="w-full h-24 object-cover rounded-xl mb-2" />
                      <button 
                        type="button" 
                        onClick={() => setLoadingPhotoBase64(null)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Remove / Replace Photo
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-2">
                      <Camera size={22} className="mx-auto text-amber-600 mb-1" />
                      <span className="text-xs font-bold text-slate-600">Snap or upload truck loading photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setLoadingPhotoBase64(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDispatchModal(false)} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="w-2/3 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-600/20 text-xs flex items-center justify-center gap-2">
                  <Truck size={16} /> Confirm Dispatch & Start Transit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5-STAR RATING & TRUST REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Review & Trust Badge</h3>
                  <p className="text-xs text-slate-500 font-medium">Rate {otherRole} {otherParty.name}</p>
                </div>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-black">
                &times;
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star Rating Selector */}
              <div className="text-center py-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Overall Rating</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star 
                        size={32} 
                        className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} 
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-black text-amber-700 mt-1 block">
                  {reviewRating === 5 ? '⭐⭐⭐⭐⭐ Exceptional (5/5)' :
                   reviewRating === 4 ? '⭐⭐⭐⭐ Great (4/5)' :
                   reviewRating === 3 ? '⭐⭐⭐ Good (3/5)' :
                   reviewRating === 2 ? '⭐⭐ Fair (2/5)' : '⭐ Poor (1/5)'}
                </span>
              </div>

              {/* Trust Badges Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Award Badges</label>
                <div className="flex flex-wrap gap-2">
                  {['Top Quality Cocoa', 'Fast Payment', 'Accurate Weight', 'Reliable Transporter', 'Great Communication'].map((badge) => {
                    const isSelected = selectedBadges.includes(badge);
                    return (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => {
                          setSelectedBadges(prev => 
                            isSelected ? prev.filter(b => b !== badge) : [...prev, badge]
                          );
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                          isSelected 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {badge}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Feedback Note</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="e.g. Excellent Grade A beans, accurate weighbridge readings, and swift delivery!"
                  className="w-full border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowReviewModal(false)} 
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingReview}
                  className="w-2/3 bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-amber-600/20 text-xs disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
