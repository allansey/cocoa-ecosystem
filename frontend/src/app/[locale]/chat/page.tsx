'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, Search, ArrowRight, User as UserIcon, Loader2, Handshake, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import api from '@/lib/api';

interface UserChat {
  id: string;
  title: string;
  otherPartyName: string;
  otherPartyId: string;
  lastMessage: string;
  timestamp: number;
  unread: boolean;
}

export default function ChatListPage({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  
  const [inquiries, setInquiries] = useState<UserChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    
    const currentUser = user;

    const fetchOffers = async () => {
      try {
        const res = await api.get('/offers/my-offers');
        const offerChats: UserChat[] = (res.data || []).map((o: any) => {
          const isFarmer = currentUser.role === 'FARMER';
          const other = isFarmer ? o.buyer : o.farmer;
          const chatId = o.chatId || `inquiry_${o.listingId}_${o.buyerId}`;
          return {
            id: chatId,
            title: `${o.listing?.grade || 'Grade A'} Cocoa (${o.listing?.region || 'Ghana'})`,
            otherPartyName: other?.name || 'Trading Partner',
            otherPartyId: other?.id || '',
            lastMessage: `💼 Offer: ${o.priceGhsPerTonne.toLocaleString()} GHS/Tonne (${o.quantityKg.toLocaleString()} kg) - Status: ${o.status}`,
            timestamp: new Date(o.createdAt).getTime(),
            unread: o.status === 'PENDING' && isFarmer
          };
        });

        setInquiries(prev => {
          const map = new Map<string, UserChat>();
          offerChats.forEach(c => map.set(c.id, c));
          prev.forEach(c => map.set(c.id, { ...map.get(c.id), ...c }));
          return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        });
      } catch (err) {
        console.warn('Could not load backend offers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();

    if (!db) {
      setLoading(false);
      return;
    }

    const userChatsRef = ref(db, `userChats/${currentUser.id}`);
    const unsubscribe = onValue(
      userChatsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const chatsList: UserChat[] = Object.keys(data).map(key => ({
            ...data[key]
          }));

          setInquiries(prev => {
            const map = new Map<string, UserChat>();
            prev.forEach(c => map.set(c.id, c));
            chatsList.forEach(c => map.set(c.id, { ...map.get(c.id), ...c }));
            return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          });
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [_hasHydrated, isAuthenticated, router, locale, user]);

  const filteredInquiries = inquiries.filter(chat => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      chat.otherPartyName?.toLowerCase().includes(q) ||
      chat.title?.toLowerCase().includes(q) ||
      chat.lastMessage?.toLowerCase().includes(q)
    );
  });

  if (!_hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-amber-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link 
              href={`/${locale}/dashboard`} 
              className="inline-flex items-center text-slate-500 hover:text-amber-800 text-xs font-bold uppercase tracking-wider mb-2 transition-colors"
            >
              <ArrowLeft size={14} className="mr-1.5" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Inquiries & Trade Chats</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Manage ongoing price negotiations and trade discussions.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search conversations by partner or listing..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white font-medium text-slate-800 text-sm shadow-xs transition-all"
          />
        </div>

        {/* Conversations List */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-amber-600" size={36} />
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading conversations...</p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-6 space-y-3">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shadow-xs">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800">No active conversations</h3>
              <p className="text-slate-400 text-xs max-w-sm font-medium">
                {searchQuery 
                  ? `No chats match "${searchQuery}".` 
                  : 'Inquiries created on marketplace listings or bargaining offers will appear here.'}
              </p>
            </div>
          ) : (
            filteredInquiries.map((chat) => {
              const isOrder = chat.id.startsWith('order_');
              const linkHref = isOrder ? `/${locale}/orders/${chat.id.split('_')[1]}` : `/${locale}/chat/${chat.id}`;
              const isOffer = chat.lastMessage?.includes('💼');

              return (
                <Link 
                  key={chat.id} 
                  href={linkHref}
                  className="block p-5 sm:p-6 hover:bg-amber-50/60 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shrink-0 font-black text-base shadow-xs group-hover:scale-105 transition-transform">
                      {chat.otherPartyName ? chat.otherPartyName[0].toUpperCase() : <UserIcon size={20} />}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-base font-black text-slate-900 truncate">
                            {chat.otherPartyName}
                          </h3>
                          {isOffer && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                              Offer
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={12} /> 
                            {chat.timestamp ? new Date(chat.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                          </span>
                          {chat.unread && (
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-xs animate-pulse" />
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-bold text-amber-700 mb-1 truncate">{chat.title}</p>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                        {chat.lastMessage}
                      </p>
                    </div>

                    <div className="shrink-0 self-center text-slate-300 group-hover:text-amber-600 transition-colors transform group-hover:translate-x-1">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
