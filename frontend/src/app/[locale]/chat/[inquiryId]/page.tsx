'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, User, MessageCircle, Loader2 } from 'lucide-react';
import { db } from '@/firebase';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export default function ChatPage({ params }: { params: { locale: string, inquiryId: string } }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${params.locale}/auth/login`);
      return;
    }

    if (!db) {
      console.warn("Firebase is not configured. Chat is unavailable.");
      setLoading(false);
      return;
    }

    const chatRef = ref(db, `chats/${params.inquiryId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedMessages = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsedMessages);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [params.inquiryId, isAuthenticated, router, params.locale]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !db) return;

    const chatRef = ref(db, `chats/${params.inquiryId}`);
    try {
      await push(chatRef, {
        text: newMessage,
        senderId: user.id,
        senderName: user.name || user.email.split('@')[0],
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col h-[85vh]">
      <Link href={`/${params.locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-6 font-bold bg-amber-50 px-4 py-2 rounded-full w-max shadow-sm transition-all hover:shadow-md">
        <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
      </Link>
      
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white flex flex-col flex-grow overflow-hidden relative">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-700 text-white p-5 shadow-lg z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100/20 flex items-center justify-center border border-white/20">
              <MessageCircle size={22} className="text-amber-100" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none mb-1">Inquiry Thread</h2>
              <p className="text-xs text-amber-100/70 font-bold uppercase tracking-widest">ID: {params.inquiryId.split('_').pop()}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl border border-white/10">
            <User size={14} className="text-amber-200" />
            <span className="text-sm font-bold">{user.role} View</span>
          </div>
        </div>
        
        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-grow p-6 overflow-y-auto bg-slate-50/50 flex flex-col gap-4 scroll-smooth"
        >
          {loading ? (
            <div className="flex flex-col justify-center items-center h-full gap-4">
              <Loader2 className="animate-spin text-amber-500" size={40} />
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Connecting to secured chat...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full opacity-30 gap-3">
              <MessageCircle size={64} className="text-slate-300" />
              <p className="text-slate-500 font-bold">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[80%] ${msg.senderId === user.id ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 mx-1">
                  {msg.senderId === user.id ? 'You' : msg.senderName}
                </span>
                <div 
                  className={`p-4 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
                    msg.senderId === user.id 
                      ? 'bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-tr-none shadow-amber-200' 
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-slate-200'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.timestamp && (
                  <span className="text-[10px] text-slate-400 mt-1 mx-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Message Input */}
        <div className="p-5 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input 
              type="text" 
              className="flex-grow border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium placeholder:text-slate-400"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl px-6 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:grayscale"
            >
              <Send size={22} className="stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
