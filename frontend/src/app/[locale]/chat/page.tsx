'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, Search, ArrowRight, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { ref, onValue } from 'firebase/database';

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
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const [inquiries, setInquiries] = useState<UserChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    
    if (!user || !db) return;

    const userChatsRef = ref(db, `userChats/${user.id}`);
    const unsubscribe = onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatsList: UserChat[] = Object.keys(data).map(key => ({
          ...data[key]
        })).sort((a, b) => b.timestamp - a.timestamp); // sort descending
        setInquiries(chatsList);
      } else {
        setInquiries([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, router, locale, user]);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-4 font-bold bg-amber-50 px-4 py-2 rounded-full w-max shadow-sm transition-all hover:shadow-md">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Inquiries & Chats</h1>
          <p className="text-slate-500 font-medium mt-2">Manage your ongoing negotiations and messages.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-slate-200 focus:border-amber-500 focus:ring focus:ring-amber-200 transition-all bg-white"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
              <p className="text-slate-500 font-bold">Loading chats...</p>
            </div>
          ) : inquiries.map((chat) => {
            const isOrder = chat.id.startsWith('order_');
            const linkHref = isOrder ? `/${locale}/orders/${chat.id.split('_')[1]}` : `/${locale}/chat/${chat.id}`;
            
            return (
              <Link 
                key={chat.id} 
                href={linkHref}
                className="block p-6 hover:bg-amber-50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <UserIcon size={24} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-black text-slate-800 truncate pr-4">
                        {chat.otherPartyName}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {chat.timestamp ? new Date(chat.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {chat.unread && (
                          <span className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-bold text-amber-600 mb-2">{chat.title}</p>
                    <p className="text-sm text-slate-600 font-medium truncate">
                      {chat.lastMessage}
                    </p>
                  </div>
                  <div className="shrink-0 self-center text-slate-300 group-hover:text-amber-500 transition-colors transform group-hover:translate-x-1">
                    <ArrowRight size={24} />
                  </div>
                </div>
              </Link>
            );
          })}
          
          {!loading && inquiries.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center px-6">
              <MessageSquare size={48} className="text-slate-200 mb-4" />
              <h3 className="text-xl font-black text-slate-800">No active inquiries</h3>
              <p className="text-slate-500 font-medium mt-2 max-w-sm">When you contact a seller or someone messages you, the conversation will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
