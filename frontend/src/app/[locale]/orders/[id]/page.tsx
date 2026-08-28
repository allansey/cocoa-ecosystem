'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { db } from '@/firebase';
import { ref, push, onValue, serverTimestamp, update } from 'firebase/database';
import {
  ArrowLeft, Send, CheckCircle2, Package, Truck, Clock, CreditCard,
  AlertTriangle, MessageCircle, ShieldAlert, MapPin, Phone, User,
  Banknote, ChevronRight, Activity
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
  ORDER_PLACED: 'Order Placed',
  ACCEPTED: 'Order Accepted',
  PAYMENT_PENDING: 'Payment Arranged',
  PAID: 'Payment Confirmed',
  IN_TRANSIT: 'Dispatched',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  DISPUTED: 'Dispute Raised',
  CANCELLED: 'Cancelled',
  LOGISTICS_UPDATED: 'Logistics Updated',
};

const ACTION_COLORS: Record<string, string> = {
  ORDER_PLACED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  PAYMENT_PENDING: 'bg-indigo-100 text-indigo-700',
  PAID: 'bg-green-100 text-green-700',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  DISPUTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  LOGISTICS_UPDATED: 'bg-purple-100 text-purple-700',
};

export default function OrderDetailsPage({ params }: { params: { locale: string; id: string } }) {
  const { user, isAuthenticated } = useAuthStore();
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
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
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push(`/${params.locale}/auth/login`); return; }
    fetchOrder();
  }, [isAuthenticated, params.id, params.locale]);

  const [orderChatError, setOrderChatError] = useState('');

  // Firebase Chat
  useEffect(() => {
    if (!order || !db) return;
    const chatRef = ref(db, `chats/order_${order.id}`);
    const unsub = onValue(
      chatRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const parsed: Message[] = Object.keys(data).map((key) => ({ id: key, ...data[key] }))
            .sort((a, b) => a.timestamp - b.timestamp);
          setMessages(parsed);
        } else {
          setMessages([]);
        }
        setOrderChatError('');
      },
      (err) => {
        console.error('[Firebase Order Chat Error]:', err);
        setOrderChatError(`Chat Database Error: ${err.message || 'Permission denied or database offline.'}`);
      }
    );
    return () => unsub();
  }, [order]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !order || !db) return;
    
    const msgText = newMessage.trim();
    setNewMessage('');
    
    try {
      const chatId = `order_${order.id}`;
      const chatRef = ref(db, `chats/${chatId}`);
      const newMsgRef = push(chatRef);
      const timestamp = serverTimestamp();
      
      const isFarmer = user.id === order.farmer.id;
      const recipientId = isFarmer ? order.buyer.id : order.farmer.id;
      const recipientName = isFarmer ? order.buyer.name : order.farmer.name;
      
      const updates: any = {};
      
      // Update chat thread
      updates[`chats/${chatId}/${newMsgRef.key}`] = {
        text: msgText,
        senderId: user.id,
        senderName: user.name || user.email?.split('@')[0] || 'User',
        timestamp,
      };

      // Update current user's inbox
      updates[`userChats/${user.id}/${chatId}`] = {
        id: chatId,
        title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
        otherPartyName: recipientName,
        otherPartyId: recipientId,
        lastMessage: msgText,
        timestamp,
        unread: false
      };

      // Update recipient's inbox
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30 pt-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <Link href={`/${params.locale}/orders`} className="inline-flex items-center text-amber-700 hover:text-amber-900 font-bold mb-8 bg-white px-4 py-2 rounded-full shadow-sm border border-amber-100 transition-all hover:shadow-md">
          <ArrowLeft size={16} className="mr-2" /> Back to Orders Hub
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT COLUMN — Order Info + Actions */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Order Header Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className={`p-6 ${isDisputed ? 'bg-red-600' : isCancelled ? 'bg-slate-600' : isCompleted ? 'bg-emerald-600' : 'bg-gradient-to-br from-amber-700 to-amber-600'} text-white`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">Order Reference</p>
                    <h1 className="text-2xl font-black tracking-tight">#{order.id.slice(0, 8).toUpperCase()}</h1>
                  </div>
                  {order.estimatedDeliveryDate && (
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      ETA: {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-sm mt-2">
                  {order.quantityKg.toLocaleString()}kg of {order.listing.grade} Cocoa · {order.deliveryCity || order.listing.region}
                </p>
              </div>

              {/* Items & Fees Receipt Breakdown */}
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Cocoa Subtotal</span>
                  <span className="font-bold text-slate-800">GHS {(order.subtotal || order.totalAmount).toLocaleString()}</span>
                </div>
                {order.deliveryFee ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Logistics & Transport Fee</span>
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

            {/* Driver / Transporter Dispatch Card */}
            {(order.transporterName || order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Assigned Driver & Transport</span>
                  <Truck size={18} className="text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-lg text-white">{order.transporterName || 'Transporter Assigned'}</p>
                  <p className="text-xs text-slate-300">Vehicle / Truck Plate: <span className="font-bold text-white">{order.vehicleNumber || 'Pending'}</span></p>
                  <p className="text-xs text-slate-300">Tracking Reference: <span className="font-bold text-amber-300">#{order.trackingNumber || order.id.slice(0, 8).toUpperCase()}</span></p>
                </div>
                {order.transporterPhone && (
                  <a href={`tel:${order.transporterPhone}`} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all mt-2">
                    <Phone size={14} /> Call Driver Now
                  </a>
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
                <div>
                  <p className="font-black text-slate-800">{otherParty.name}</p>
                  <p className="text-sm text-slate-500">{otherParty.email}</p>
                  {otherParty.phone && (
                    <a href={`tel:${otherParty.phone}`} className="flex items-center gap-1 text-sm text-amber-700 font-bold mt-1 hover:underline">
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={36} />
                <p className="font-black text-emerald-800 text-lg">Transaction Completed</p>
                <p className="text-xs text-emerald-600 mt-1">Cocoa inspected and receipt confirmed.</p>
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
                            {act.note && <p className="text-sm text-slate-500 mt-1">{act.note}</p>}
                            <p className="text-[11px] text-slate-400 mt-1">
                              {new Date(act.createdAt).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
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
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-4">
                  {orderChatError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold text-center">
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

      {/* FARMER DISPATCH LOGISTICS MODAL */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">Dispatch Batch</span>
                <h3 className="text-xl font-black text-slate-900">Assign Driver & Vehicle Details</h3>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-black">
                &times;
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateStatus('IN_TRANSIT', undefined, { driverName, driverPhone, truckNumber, trackingRef });
            }} className="space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transporter / Driver Name</label>
                <input 
                  type="text" value={driverName} onChange={e => setDriverName(e.target.value)} required
                  placeholder="e.g. Kwame Boateng (VIP Haulage)"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Phone Number</label>
                <input 
                  type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} required
                  placeholder="e.g. +233 24 123 4567"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle / Truck Plate</label>
                  <input 
                    type="text" value={truckNumber} onChange={e => setTruckNumber(e.target.value)} required
                    placeholder="e.g. AS 8492-23"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tracking Code / Ref</label>
                  <input 
                    type="text" value={trackingRef} onChange={e => setTrackingRef(e.target.value)} required
                    placeholder="e.g. TRK-9842"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
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
    </div>
  );
}
