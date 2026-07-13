import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for CocoaLink MVP',
};

export default function TermsPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-black text-slate-900 mb-8">Terms of Service</h1>
      <div className="prose prose-amber max-w-none text-slate-600">
        <p className="font-medium text-lg mb-6">Effective Date: June 1, 2026</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">1. Agreement to Terms</h2>
        <p>By accessing the CocoaLink platform, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">2. Platform Role</h2>
        <p>CocoaLink acts as a facilitator and escrow provider connecting Ghanaian cocoa farmers with buyers. We are not a party to the actual transaction between buyers and sellers beyond providing the escrow mechanism.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">3. User Accounts</h2>
        <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">4. Escrow and Payments</h2>
        <p>Payments made through the platform are held in escrow and released only upon confirmed delivery and acceptance of the cocoa, or per the dispute resolution terms outlined in our guidelines.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">5. Limitation of Liability</h2>
        <p>In no event shall CocoaLink, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.</p>
      </div>
    </div>
  );
}
