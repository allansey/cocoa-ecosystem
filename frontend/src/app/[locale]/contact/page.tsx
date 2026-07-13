import { Mail, Phone, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the CocoaLink team',
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black text-slate-900 mb-4">Get in Touch</h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          Whether you're a farmer looking to digitize your harvest, or a buyer seeking premium cocoa, our team is here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
            <Mail size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Email Us</h3>
          <p className="text-slate-500">support@cocoalink.com.gh</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
            <Phone size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Call Us</h3>
          <p className="text-slate-500">+233 54 123 4567</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
            <MapPin size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Visit Us</h3>
          <p className="text-slate-500">Accra Digital Center<br/>Ring Road West, Accra</p>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Send us a message</h2>
        <form className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
              <input type="text" className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Kwame Osei" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input type="email" className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="kwame@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input type="text" className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="How can we help?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea rows={5} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Type your message here..."></textarea>
          </div>
          <button type="button" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors">
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
