'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, Search, ArrowRight, User } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

export default function ChatListPage({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  // Dummy data for inquiries
  const [inquiries, setInquiries] = useState([
    {
      id: '123',
      farmerName: 'Kwame Mensah',
      buyerName: 'Global Cocoa Traders Ltd.',
      listingTitle: 'Grade A Sun-Dried Cocoa',
      lastMessage: 'I can deliver the 500kg by Friday if we agree on the price.',
      timestamp: '2 hours ago',
      unread: true,
      roleMatch: 'FARMER'
    },
    {
      id: '124',
      farmerName: 'Abena Osei',
      buyerName: 'Swiss Chocolates Inc.',
      listingTitle: 'Premium Organic Beans',
      lastMessage: 'Great, I will await the payment confirmation.',
      timestamp: '1 day ago',
      unread: false,
      roleMatch: 'FARMER'
    }
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
    }
  }, [isAuthenticated, router, locale]);

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
          {inquiries.map((chat) => (
            <Link 
              key={chat.id} 
              href={`/${locale}/chat/inquiry_${chat.id}`}
              className="block p-6 hover:bg-amber-50 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <User size={24} />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-black text-slate-800 truncate pr-4">
                      {user.role === 'FARMER' ? chat.buyerName : chat.farmerName}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {chat.timestamp}
                      </span>
                      {chat.unread && (
                        <span className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-amber-600 mb-2">{chat.listingTitle}</p>
                  <p className="text-sm text-slate-600 font-medium truncate">
                    {chat.lastMessage}
                  </p>
                </div>
                <div className="shrink-0 self-center text-slate-300 group-hover:text-amber-500 transition-colors transform group-hover:translate-x-1">
                  <ArrowRight size={24} />
                </div>
              </div>
            </Link>
          ))}
          
          {inquiries.length === 0 && (
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
