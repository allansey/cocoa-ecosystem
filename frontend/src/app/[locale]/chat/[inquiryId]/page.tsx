'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Send, User, MessageCircle, Loader2, Mic, MicOff, 
  Play, Pause, Handshake, CheckCircle2, XCircle, RefreshCw, 
  ExternalLink, Sparkles, Volume2, ShieldCheck, DollarSign, Scale,
  ChevronRight, Phone, MessageSquare, Info, Award, Droplets, Check,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase';
import api from '@/lib/api';
import { ref, push, onValue, update } from 'firebase/database';

interface Message {
  id: string;
  text?: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  audioBase64?: string;
  audioDuration?: number;
  isOffer?: boolean;
  offerId?: string;
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
  orderId?: string;
  createdAt: string;
  buyer: { name: string; email: string; phone?: string };
  farmer: { name: string; email: string; phone?: string };
  listing: { 
    id: string;
    grade: string; 
    region: string;
    moistureLevel?: number;
    aiHealthScore?: number;
    priceGhsPerTonne: number;
    quantityKg: number;
  };
}

export default function ChatPage({ params }: { params: { locale: string, inquiryId: string } }) {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [chatMeta, setChatMeta] = useState<{ 
    recipientId: string; 
    title: string; 
    recipientName: string;
    listingId?: string;
    listingPrice?: number;
    listingGrade?: string;
    listingRegion?: string;
    listingMoisture?: number;
    listingAiScore?: number;
  } | null>(null);

  // Structured Offer / Counter-Offer State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQty, setOfferQty] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Counter-offer modal
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState<Offer | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('');

  // Payment Checkout State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'MTN' | 'TELECEL' | 'AT' | 'CARD'>('MTN');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  // Responsive Sidebar Toggle for mobile
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Audio Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const fetchOffers = async () => {
    try {
      const res = await api.get(`/offers/inquiry/${params.inquiryId}`);
      const data = res.data || [];
      setOffers(data);

      const accepted = data.find((o: any) => o.status === 'ACCEPTED' && o.orderId);
      if (accepted) {
        try {
          const ordRes = await api.get(`/orders/${accepted.orderId}`);
          setActiveOrder(ordRes.data);
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Could not fetch offers:', err);
    }
  };

  const fetchMessagesFromBackend = async () => {
    try {
      const res = await api.get(`/chat/${params.inquiryId}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setMessages(prev => {
          const map = new Map<string, Message>();
          prev.forEach(m => map.set(m.id, m));
          res.data.forEach((m: any) => map.set(m.id, {
            ...m,
            timestamp: m.timestamp || new Date(m.createdAt).getTime()
          }));
          return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push(`/${params.locale}/auth/login`);
      return;
    }

    if (user?.phone) {
      setPaymentPhone(user.phone);
    }

    fetchOffers();
    fetchMessagesFromBackend();

    const pollInterval = setInterval(() => {
      fetchMessagesFromBackend();
      fetchOffers();
    }, 2500);

    const fetchMeta = async () => {
      try {
        if (params.inquiryId.startsWith('inquiry_')) {
          const parts = params.inquiryId.split('_');
          const listingId = parts[1];
          const buyerId = parts[2];
          const res = await api.get(`/listings/${listingId}`);
          const listing = res.data;
          
          if (user?.id === buyerId) {
            setChatMeta({ 
              recipientId: listing.farmer.id, 
              title: `Inquiry: ${listing.grade} Cocoa (${listing.region})`, 
              recipientName: listing.farmer.name,
              listingId: listing.id,
              listingPrice: listing.priceGhsPerTonne,
              listingGrade: listing.grade,
              listingRegion: listing.region,
              listingMoisture: listing.moistureLevel,
              listingAiScore: listing.aiHealthScore
            });
            setOfferPrice(String(listing.priceGhsPerTonne));
            setOfferQty(String(listing.quantityKg));
          } else {
            setChatMeta({ 
              recipientId: buyerId, 
              title: `Inquiry: ${listing.grade} Cocoa (${listing.region})`, 
              recipientName: 'Buyer',
              listingId: listing.id,
              listingPrice: listing.priceGhsPerTonne,
              listingGrade: listing.grade,
              listingRegion: listing.region,
              listingMoisture: listing.moistureLevel,
              listingAiScore: listing.aiHealthScore
            });
          }
        } else if (params.inquiryId.startsWith('order_')) {
          const parts = params.inquiryId.split('_');
          const orderId = parts[1];
          const res = await api.get(`/orders/${orderId}`);
          const order = res.data;
          setActiveOrder(order);
          const isFarmer = user?.id === order.farmer.id;
          const other = isFarmer ? order.buyer : order.farmer;
          
          setChatMeta({ 
            recipientId: other.id, 
            title: `Order #${order.id.slice(0, 8).toUpperCase()}`, 
            recipientName: other.name,
            listingGrade: order.listing?.grade,
            listingRegion: order.listing?.region,
            listingPrice: order.proposedPrice || order.listing?.priceGhsPerTonne
          });
        }
      } catch (err) {
        console.error('Error fetching chat metadata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeta();

    let unsubscribeFirebase = () => {};
    if (db) {
      const chatRef = ref(db, `chats/${params.inquiryId}`);
      unsubscribeFirebase = onValue(
        chatRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const parsed: Message[] = Object.keys(data).map((key) => ({
              id: key,
              ...data[key],
            })).sort((a, b) => a.timestamp - b.timestamp);
            setMessages(parsed);
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );
    }

    return () => {
      clearInterval(pollInterval);
      unsubscribeFirebase();
    };
  }, [params.inquiryId, isAuthenticated, _hasHydrated, router, params.locale, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, offers]);

  // Voice Note Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone permission is required to send voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };

  const sendVoiceNote = async () => {
    if (!audioBlob || !user || !chatMeta) return;

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;

      const newMsg = {
        senderId: user.id,
        senderName: user.name || user.email.split('@')[0],
        timestamp: Date.now(),
        audioBase64: base64Audio,
        audioDuration: recordingTime,
        text: '🎙️ Voice Note (Twi / Audio)'
      };

      try {
        const res = await api.post(`/chat/${params.inquiryId}`, {
          audioBase64: base64Audio,
          senderName: user.name || user.email.split('@')[0]
        });
        setMessages(m => {
          if (m.some(x => x.id === res.data.id)) return m;
          return [...m, res.data];
        });
      } catch (e) {
        setMessages(m => [...m, { id: String(Date.now()), ...newMsg }]);
      }

      if (db) {
        const chatRef = ref(db, `chats/${params.inquiryId}`);
        push(chatRef, newMsg);

        const updates: Record<string, any> = {};
        updates[`userChats/${user.id}/${params.inquiryId}`] = {
          id: params.inquiryId,
          title: chatMeta.title,
          otherPartyName: chatMeta.recipientName,
          otherPartyId: chatMeta.recipientId,
          lastMessage: '🎙️ Voice Note',
          timestamp: Date.now(),
          unread: false
        };
        updates[`userChats/${chatMeta.recipientId}/${params.inquiryId}`] = {
          id: params.inquiryId,
          title: chatMeta.title,
          otherPartyName: user.name || user.email.split('@')[0],
          otherPartyId: user.id,
          lastMessage: '🎙️ Voice Note',
          timestamp: Date.now(),
          unread: true
        };
        await update(ref(db), updates);
      }

      setAudioBlob(null);
      setRecordingTime(0);
    };
  };

  const playAudio = (msgId: string, base64: string) => {
    if (playingAudioId === msgId) {
      audioElementRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    const audio = new Audio(base64);
    audioElementRef.current = audio;
    audio.play();
    setPlayingAudioId(msgId);
    audio.onended = () => setPlayingAudioId(null);
  };

  // Text Message Sending with Database Persistence
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatMeta) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    const newMsg = {
      senderId: user.id,
      senderName: user.name || user.email.split('@')[0],
      text: msgText,
      timestamp: Date.now()
    };

    try {
      const res = await api.post(`/chat/${params.inquiryId}`, {
        text: msgText,
        senderName: user.name || user.email.split('@')[0]
      });
      setMessages(m => {
        if (m.some(x => x.id === res.data.id)) return m;
        return [...m, res.data];
      });
    } catch (e) {
      setMessages(m => [...m, { id: String(Date.now()), ...newMsg }]);
    }

    if (db) {
      const chatRef = ref(db, `chats/${params.inquiryId}`);
      push(chatRef, newMsg);

      const updates: Record<string, any> = {};
      updates[`userChats/${user.id}/${params.inquiryId}`] = {
        id: params.inquiryId,
        title: chatMeta.title,
        otherPartyName: chatMeta.recipientName,
        otherPartyId: chatMeta.recipientId,
        lastMessage: msgText,
        timestamp: Date.now(),
        unread: false
      };
      updates[`userChats/${chatMeta.recipientId}/${params.inquiryId}`] = {
        id: params.inquiryId,
        title: chatMeta.title,
        otherPartyName: user.name || user.email.split('@')[0],
        otherPartyId: user.id,
        lastMessage: msgText,
        timestamp: Date.now(),
        unread: true
      };
      await update(ref(db), updates);
    }
  };

  // Submit Offer
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMeta?.listingId || !offerPrice || !offerQty) return;
    setSubmittingOffer(true);

    try {
      const res = await api.post('/offers', {
        listingId: chatMeta.listingId,
        priceGhsPerTonne: offerPrice,
        quantityKg: offerQty,
        note: offerNote,
        chatId: params.inquiryId
      });

      const total = (parseFloat(offerPrice) * parseFloat(offerQty)) / 1000;
      const offerText = `💼 PROPOSED OFFER: ${parseFloat(offerPrice).toLocaleString()} GHS/Tonne for ${parseFloat(offerQty).toLocaleString()} kg (Total: ${total.toLocaleString()} GHS)`;
      
      const newOfferMsg = {
        senderId: user!.id,
        senderName: user!.name || 'Buyer',
        text: offerText,
        timestamp: Date.now(),
        isOffer: true,
        offerId: res.data.id
      };

      try {
        await api.post(`/chat/${params.inquiryId}`, {
          text: offerText,
          senderName: user!.name || 'Buyer'
        });
      } catch (e) {}

      if (db) {
        const chatRef = ref(db, `chats/${params.inquiryId}`);
        push(chatRef, newOfferMsg);

        const updates: Record<string, any> = {};
        updates[`userChats/${user!.id}/${params.inquiryId}`] = {
          id: params.inquiryId,
          title: chatMeta.title,
          otherPartyName: chatMeta.recipientName,
          otherPartyId: chatMeta.recipientId,
          lastMessage: `💼 Offer: ${parseFloat(offerPrice).toLocaleString()} GHS/Tonne`,
          timestamp: Date.now(),
          unread: false
        };
        updates[`userChats/${chatMeta.recipientId}/${params.inquiryId}`] = {
          id: params.inquiryId,
          title: chatMeta.title,
          otherPartyName: user!.name || user!.email.split('@')[0],
          otherPartyId: user!.id,
          lastMessage: `💼 Offer: ${parseFloat(offerPrice).toLocaleString()} GHS/Tonne`,
          timestamp: Date.now(),
          unread: true
        };
        await update(ref(db), updates);
      } else {
        setMessages(m => [...m, { id: String(Date.now()), ...newOfferMsg }]);
      }

      setShowOfferModal(false);
      setOfferNote('');
      fetchOffers();
      fetchMessagesFromBackend();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Respond to Offer
  const handleOfferResponse = async (offerId: string, action: 'ACCEPT' | 'DECLINE' | 'COUNTER') => {
    if (action === 'COUNTER') {
      const targetOffer = offers.find(o => o.id === offerId);
      if (targetOffer) {
        setSelectedOfferForCounter(targetOffer);
        setCounterPrice(String(targetOffer.priceGhsPerTonne));
        setCounterQty(String(targetOffer.quantityKg));
      }
      return;
    }

    try {
      const res = await api.put(`/offers/${offerId}/respond`, { action });
      fetchOffers();

      if (action === 'ACCEPT' && res.data.order) {
        setActiveOrder(res.data.order);
        const notice = `🎉 OFFER ACCEPTED! Order #${res.data.order.id.slice(0, 8).toUpperCase()} has been created. Total: GHS ${res.data.order.totalAmount.toLocaleString()}`;
        
        try {
          await api.post(`/chat/${params.inquiryId}`, {
            text: notice,
            senderName: user!.name || 'Seller'
          });
        } catch (e) {}

        if (db) {
          const chatRef = ref(db, `chats/${params.inquiryId}`);
          push(chatRef, {
            senderId: user!.id,
            senderName: user!.name || 'Seller',
            text: notice,
            timestamp: Date.now()
          });
        }
      }
      fetchMessagesFromBackend();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update offer response.');
    }
  };

  // Payment Execution Logic (MoMo / Card Escrow)
  const handleProcessPayment = async () => {
    const acceptedOffer = offers.find(o => o.status === 'ACCEPTED' && o.orderId);
    const targetOrderId = activeOrder?.id || acceptedOffer?.orderId;
    if (!targetOrderId) {
      alert('Order ID reference not found.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      await new Promise(r => setTimeout(r, 1600));

      await api.put(`/orders/${targetOrderId}/status`, {
        status: 'PAID',
        paymentMethod: paymentProvider,
      });

      const amount = activeOrder?.totalAmount || acceptedOffer?.totalAmount;
      const receiptText = `💳 PAYMENT COMPLETED: GHS ${amount?.toLocaleString()} paid via ${paymentProvider} (${paymentPhone || 'Verified Mobile'}) and held in CocoaLink Escrow Protection!`;

      try {
        await api.post(`/chat/${params.inquiryId}`, {
          text: receiptText,
          senderName: user?.name || 'Buyer'
        });
      } catch (e) {}

      if (db) {
        const chatRef = ref(db, `chats/${params.inquiryId}`);
        push(chatRef, {
          senderId: user!.id,
          senderName: user!.name || 'Buyer',
          text: receiptText,
          timestamp: Date.now()
        });
      }

      setPaymentSuccess(true);
      fetchOffers();
      fetchMessagesFromBackend();

      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment authorization failed.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSendCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferForCounter || !counterPrice || !counterQty) return;

    try {
      await api.put(`/offers/${selectedOfferForCounter.id}/respond`, {
        action: 'COUNTER',
        counterPrice,
        counterQuantity: counterQty,
        note: 'Counter-offer proposed by seller.'
      });

      const cTotal = (parseFloat(counterPrice) * parseFloat(counterQty)) / 1000;
      const counterText = `🔄 COUNTER-OFFER: ${parseFloat(counterPrice).toLocaleString()} GHS/Tonne for ${parseFloat(counterQty).toLocaleString()} kg (Total: ${cTotal.toLocaleString()} GHS)`;

      try {
        await api.post(`/chat/${params.inquiryId}`, {
          text: counterText,
          senderName: user!.name || 'Seller'
        });
      } catch (e) {}

      if (db) {
        const chatRef = ref(db, `chats/${params.inquiryId}`);
        push(chatRef, {
          senderId: user!.id,
          senderName: user!.name || 'Seller',
          text: counterText,
          timestamp: Date.now()
        });
      }

      setSelectedOfferForCounter(null);
      fetchOffers();
      fetchMessagesFromBackend();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit counter offer.');
    }
  };

  if (!_hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="animate-spin text-amber-600" size={40} />
      </div>
    );
  }

  const latestPendingOffer = offers.find(o => o.status === 'PENDING' || o.status === 'COUNTERED');
  const acceptedOffer = offers.find(o => o.status === 'ACCEPTED' && o.orderId);
  const isOrderPaid = activeOrder && ['PAID', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(activeOrder.status);

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col lg:flex-row overflow-hidden bg-slate-100">
      
      {/* LEFT COLUMN: MAIN FULL-SCREEN CHAT */}
      <div className="flex-1 flex flex-col h-full bg-white relative border-r border-slate-200 overflow-hidden">
        
        {/* Top Chat Header */}
        <div className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Link 
              href={`/${params.locale}/chat`}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Back to All Inquiries"
            >
              <ArrowLeft size={20} />
            </Link>
            
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              {chatMeta?.recipientName ? chatMeta.recipientName[0].toUpperCase() : <User size={18} />}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
                {chatMeta?.recipientName || 'Trading Partner'}
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>{chatMeta?.title || 'Cocoa Trade Inquiry'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action: Propose Offer Button for Buyer */}
            {chatMeta?.listingId && user.role === 'BUYER' && !latestPendingOffer && !acceptedOffer && (
              <button 
                onClick={() => setShowOfferModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95"
              >
                <Handshake size={15} />
                <span>Make Offer</span>
              </button>
            )}

            {/* Mobile Toggle for Deal Panel */}
            <button
              onClick={() => setShowMobilePanel(!showMobilePanel)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative"
              title="View Trade Info & Actions"
            >
              <Info size={20} />
              {(latestPendingOffer || acceptedOffer) && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Negotiation / Payment Sticky Top Banner */}
        {latestPendingOffer && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/80 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs font-black">
                ₵
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                    {latestPendingOffer.status === 'COUNTERED' ? 'Counter-Offer Proposed' : 'Live Pending Offer'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    {latestPendingOffer.status}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  <span className="text-amber-800 font-black">{(latestPendingOffer.counterPrice || latestPendingOffer.priceGhsPerTonne).toLocaleString()} GHS</span> / Tonne · 
                  <span className="text-slate-600 ml-1">{(latestPendingOffer.counterQuantity || latestPendingOffer.quantityKg).toLocaleString()} kg</span>
                  <strong className="text-emerald-700 ml-2 font-black">({latestPendingOffer.totalAmount.toLocaleString()} GHS Total)</strong>
                </p>
              </div>
            </div>

            {/* Farmer actions */}
            {user.id === latestPendingOffer.farmerId && latestPendingOffer.status === 'PENDING' && (
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => handleOfferResponse(latestPendingOffer.id, 'ACCEPT')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 size={14} /> Accept
                </button>
                <button 
                  onClick={() => handleOfferResponse(latestPendingOffer.id, 'COUNTER')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={14} /> Counter
                </button>
                <button 
                  onClick={() => handleOfferResponse(latestPendingOffer.id, 'DECLINE')}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors"
                >
                  Decline
                </button>
              </div>
            )}

            {/* Buyer counter response */}
            {user.id === latestPendingOffer.buyerId && latestPendingOffer.status === 'COUNTERED' && (
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => handleOfferResponse(latestPendingOffer.id, 'ACCEPT')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 size={14} /> Accept Counter
                </button>
                <button 
                  onClick={() => handleOfferResponse(latestPendingOffer.id, 'DECLINE')}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        )}

        {/* Accepted Offer Sticky Banner */}
        {acceptedOffer && (
          <div className="bg-emerald-50/95 border-b border-emerald-200 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-white shrink-0 ${isOrderPaid ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                {isOrderPaid ? <ShieldCheck size={16} /> : <CheckCircle2 size={16} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    {isOrderPaid ? 'Payment Held in Escrow' : 'Deal Agreed — Payment Ready'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOrderPaid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900 animate-pulse'
                  }`}>
                    {isOrderPaid ? 'PAID / SECURED' : 'AWAITING PAYMENT'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Order #{(acceptedOffer.orderId || '').slice(0, 8).toUpperCase()} · Total: <strong className="text-emerald-800 font-black">{acceptedOffer.totalAmount.toLocaleString()} GHS</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              {user.role === 'BUYER' && !isOrderPaid && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95"
                >
                  <DollarSign size={14} />
                  <span>Pay with MoMo</span>
                </button>
              )}

              <Link 
                href={`/${params.locale}/orders/${acceptedOffer.orderId}`}
                className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 hover:text-emerald-950 bg-white border border-emerald-300 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                <span>Track Order</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Message Stream (Scrollable) */}
        <div ref={scrollRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/60">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-amber-600" size={32} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-3">
              <div className="w-16 h-16 bg-amber-100/80 rounded-3xl flex items-center justify-center text-amber-700 shadow-xs">
                <MessageSquare size={30} />
              </div>
              <h4 className="text-base font-black text-slate-800">Start the Discussion</h4>
              <p className="text-xs text-slate-500 font-medium max-w-sm">
                Discuss cocoa bean moisture, farm certifications, transport terms, or send a custom counter-offer.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user.id;

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-400">{isMe ? 'You' : msg.senderName}</span>
                    <span className="text-[9px] text-slate-300">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {/* Audio Voice Note Bubble */}
                  {msg.audioBase64 ? (
                    <div className={`p-3.5 rounded-3xl max-w-sm flex items-center gap-3.5 shadow-sm ${
                      isMe 
                        ? 'bg-amber-600 text-white rounded-br-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      <button 
                        onClick={() => playAudio(msg.id, msg.audioBase64!)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 ${
                          isMe ? 'bg-white text-amber-700 shadow-xs' : 'bg-amber-600 text-white shadow-xs'
                        }`}
                      >
                        {playingAudioId === msg.id ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Volume2 size={14} className={isMe ? 'text-amber-200' : 'text-amber-600'} />
                          <span className="text-xs font-black">Voice Note (Twi / Audio)</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex gap-0.5 items-center">
                            {[12, 18, 24, 16, 28, 14, 20, 10].map((h, i) => (
                              <div 
                                key={i} 
                                className={`w-1 rounded-full ${playingAudioId === msg.id ? 'animate-pulse' : ''} ${isMe ? 'bg-white/70' : 'bg-amber-500/70'}`} 
                                style={{ height: `${h}px` }} 
                              />
                            ))}
                          </div>
                          <span className="text-[10px] opacity-75 font-mono">
                            {msg.audioDuration ? `${msg.audioDuration}s` : 'Audio'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : msg.isOffer ? (
                    /* Structured Offer Bubble */
                    <div className={`p-4 rounded-3xl max-w-md shadow-sm border ${
                      isMe 
                        ? 'bg-amber-50 text-amber-950 border-amber-200 rounded-br-sm' 
                        : 'bg-white text-slate-800 border-amber-300 rounded-bl-sm ring-2 ring-amber-400/20'
                    }`}>
                      <div className="flex items-center gap-2 text-xs font-black text-amber-800 mb-1.5">
                        <Handshake size={16} className="text-amber-600" />
                        <span>Official Trade Proposal</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{msg.text}</p>
                    </div>
                  ) : (
                    /* Regular Text Bubble */
                    <div className={`p-3.5 px-4 rounded-3xl max-w-md text-sm font-medium leading-relaxed shadow-xs ${
                      isMe 
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-br-sm shadow-amber-600/10' 
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Audio Recording Live Banner */}
        {isRecording && (
          <div className="bg-red-50 border-t border-red-200 p-3 px-6 flex items-center justify-between z-10 animate-pulse shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-black text-red-700">Recording Voice Note...</span>
              <span className="text-xs font-mono font-bold text-red-900 ml-2">{recordingTime}s</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={cancelRecording}
                className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button 
                onClick={stopRecording}
                className="text-xs font-black text-white bg-red-600 px-3.5 py-1.5 rounded-xl hover:bg-red-700 shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Audio Preview Banner Before Sending */}
        {audioBlob && !isRecording && (
          <div className="bg-amber-50 border-t border-amber-200 p-3 px-6 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Volume2 size={16} className="text-amber-700" />
              <span>Voice Note Ready ({recordingTime}s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setAudioBlob(null)}
                className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100"
              >
                Discard
              </button>
              <button 
                onClick={sendVoiceNote}
                className="text-xs font-black text-white bg-amber-600 px-4 py-1.5 rounded-xl hover:bg-amber-700 shadow-xs flex items-center gap-1"
              >
                <Send size={12} /> Send Audio
              </button>
            </div>
          </div>
        )}

        {/* Bottom Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <button 
            type="button" 
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-2xl transition-all shrink-0 ${
              isRecording 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
            title="Record Voice Note (Twi/English)"
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input 
            type="text" 
            placeholder="Type a negotiation message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />

          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white p-3 px-5 rounded-2xl font-bold shadow-xs transition-all disabled:opacity-40 flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <Send size={16} />
            <span className="hidden sm:inline text-xs font-black">Send</span>
          </button>
        </form>
      </div>

      {/* RIGHT SIDEBAR: DEAL & QUALITY PASSPORT PANEL (Visible on lg, or toggleable on mobile) */}
      <div className={`w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 z-30 ${
        showMobilePanel ? 'fixed inset-0 top-16 bg-white z-50 p-6' : 'hidden lg:flex'
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Trade Overview</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Verified details & passport</p>
          </div>
          {showMobilePanel && (
            <button 
              onClick={() => setShowMobilePanel(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
            >
              <XCircle size={22} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6 flex-1">
          
          {/* Cocoa Quality Passport Card */}
          <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/30 px-2.5 py-1 rounded-full text-amber-200 border border-amber-400/20">
                Quality Passport
              </span>
              <Award size={18} className="text-amber-300" />
            </div>

            <h4 className="text-lg font-black tracking-tight">{chatMeta?.listingGrade || 'Grade A'} Cocoa</h4>
            <p className="text-xs text-amber-200/90 font-medium mt-0.5">{chatMeta?.listingRegion || 'Ghana'} · Single Origin</p>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-amber-700/50">
              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-amber-200 block uppercase">IoT Moisture</span>
                <span className="text-sm font-black text-white">{chatMeta?.listingMoisture || 6.8}%</span>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-amber-200 block uppercase">AI Health Score</span>
                <span className="text-sm font-black text-white">{chatMeta?.listingAiScore || 99.2}%</span>
              </div>
            </div>
          </div>

          {/* Trade Protection & Escrow Guarantee */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>CocoaLink Protection</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Funds held in escrow until weighbridge receipt validation.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Standardized COCOBOD moisture and bean cut certification.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Verified GPS dispatch tracking with assigned transporter.</span>
              </li>
            </ul>
          </div>

          {/* Action CTA Box */}
          <div className="space-y-3">
            {chatMeta?.listingId && user.role === 'BUYER' && !latestPendingOffer && !acceptedOffer && (
              <button 
                onClick={() => { setShowMobilePanel(false); setShowOfferModal(true); }}
                className="w-full py-3.5 rounded-2xl font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <Handshake size={16} />
                <span>Propose Bargain Offer</span>
              </button>
            )}

            {acceptedOffer && (
              <Link
                href={`/${params.locale}/orders/${acceptedOffer.orderId}`}
                className="w-full py-3.5 rounded-2xl font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <span>View Full Order #{(acceptedOffer.orderId || '').slice(0, 8).toUpperCase()}</span>
                <ExternalLink size={14} />
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* Propose Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Handshake size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Make an Offer</h3>
                  <p className="text-xs text-slate-500 font-medium">{chatMeta?.listingGrade} Cocoa · Listed at {chatMeta?.listingPrice?.toLocaleString()} GHS/Tonne</p>
                </div>
              </div>
              <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Proposed Price (GHS / Tonne)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required 
                    min="1000"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 pl-8"
                  />
                  <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">₵</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Quantity (kg)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={offerQty}
                  onChange={(e) => setOfferQty(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {offerPrice && offerQty && (
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">Total Calculation:</span>
                  <span className="text-base font-black text-amber-950">
                    {((parseFloat(offerPrice) * parseFloat(offerQty)) / 1000).toLocaleString()} GHS
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Note to Farmer (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="e.g., We will arrange our own truck for pickup in Kumasi."
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowOfferModal(false)}
                  className="w-1/2 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingOffer}
                  className="w-1/2 py-3 rounded-xl font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/30 transition-all disabled:opacity-50"
                >
                  {submittingOffer ? 'Submitting...' : 'Send Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counter-Offer Modal for Seller */}
      {selectedOfferForCounter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <RefreshCw size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Propose Counter-Offer</h3>
                  <p className="text-xs text-slate-500 font-medium">Buyer offered: {selectedOfferForCounter.priceGhsPerTonne.toLocaleString()} GHS/Tonne</p>
                </div>
              </div>
              <button onClick={() => setSelectedOfferForCounter(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleSendCounterOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Counter Price (GHS / Tonne)</label>
                <input 
                  type="number" 
                  required 
                  min="1000"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Quantity (kg)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={counterQty}
                  onChange={(e) => setCounterQty(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {counterPrice && counterQty && (
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">Counter Total:</span>
                  <span className="text-base font-black text-amber-950">
                    {((parseFloat(counterPrice) * parseFloat(counterQty)) / 1000).toLocaleString()} GHS
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedOfferForCounter(null)}
                  className="w-1/2 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-3 rounded-xl font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/30 transition-all"
                >
                  Send Counter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ghana Mobile Money & Escrow Checkout Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button 
              onClick={() => { if (!isProcessingPayment) setShowPaymentModal(false); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <XCircle size={22} />
            </button>

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Payment Secured in Escrow!</h3>
                <p className="text-sm font-medium text-slate-600 max-w-sm mx-auto">
                  Your funds are now held securely in CocoaLink Escrow. The farmer has been notified to prepare transport dispatch.
                </p>
                <div className="pt-2">
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                    Status: PAID / HELD IN ESCROW
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-600/30">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Secure Escrow Checkout</h3>
                    <p className="text-xs font-medium text-slate-500">CocoaLink Buyer Protection Guarantee</p>
                  </div>
                </div>

                {/* Amount Summary */}
                {(() => {
                  const accepted = offers.find(o => o.status === 'ACCEPTED' && o.orderId);
                  const amount = activeOrder?.totalAmount || accepted?.totalAmount || 0;
                  const qty = activeOrder?.quantityKg || accepted?.counterQuantity || accepted?.quantityKg || 0;

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Payable ({qty.toLocaleString()} kg)</span>
                        <h4 className="text-2xl font-black text-slate-900 mt-0.5">GHS {amount.toLocaleString()}</h4>
                      </div>
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full uppercase tracking-wider">
                        Protected Escrow
                      </span>
                    </div>
                  );
                })()}

                {/* Provider Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Select Payment Method</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'MTN', name: 'MTN MoMo', badge: '*170# Prompt', color: 'border-yellow-400 bg-yellow-50/60' },
                      { id: 'TELECEL', name: 'Telecel Cash', badge: '*110# Prompt', color: 'border-red-400 bg-red-50/60' },
                      { id: 'AT', name: 'AT Money', badge: '*110# Prompt', color: 'border-blue-400 bg-blue-50/60' },
                      { id: 'CARD', name: 'Visa / Card', badge: 'Instant Deposit', color: 'border-purple-400 bg-purple-50/60' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentProvider(p.id as any)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                          paymentProvider === p.id 
                            ? 'border-amber-600 bg-amber-50/70 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black text-slate-900">{p.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-1">{p.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Number Input */}
                {paymentProvider !== 'CARD' && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      {paymentProvider} Mobile Money Number
                    </label>
                    <input 
                      type="tel"
                      placeholder="e.g. 024 123 4567"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* Escrow Guarantee Pill */}
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                    <strong>100% Escrow Protection:</strong> Funds will not be released to the farmer until you confirm successful delivery and quality bean weighbridge verification.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={() => setShowPaymentModal(false)}
                    className="w-1/3 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={handleProcessPayment}
                    className="w-2/3 py-3.5 rounded-xl font-black text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Authorizing MoMo Prompt...</span>
                      </>
                    ) : (
                      <>
                        <DollarSign size={18} />
                        <span>Authorize & Deposit Escrow</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
