import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for CocoaLink MVP',
};

export default function PrivacyPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-black text-slate-900 mb-8">Privacy Policy</h1>
      <div className="prose prose-amber max-w-none text-slate-600">
        <p className="font-medium text-lg mb-6">Effective Date: June 1, 2026</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">1. Introduction</h2>
        <p>Welcome to CocoaLink MVP. We are committed to protecting your personal information and your right to privacy, in compliance with the Ghana Data Protection Act 2012.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">2. Information We Collect</h2>
        <p>We collect personal information that you voluntarily provide to us when you register on the platform, including your name, email address, phone number, and location data related to your farm or business.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">3. How We Use Your Information</h2>
        <p>We use the information we collect to facilitate the marketplace, enable communication between buyers and farmers, process escrow payments securely, and provide IoT analytics services.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">4. Sharing Your Information</h2>
        <p>We do not sell your personal information. We may share data with trusted third-party service providers (such as Mobile Money payment gateways) strictly for the purpose of executing platform features.</p>
        
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">5. Contact Us</h2>
        <p>If you have questions or comments about this notice, you may contact our Data Protection Officer via our <Link href={`/${locale}/contact`} className="text-amber-600 hover:underline">Contact page</Link>.</p>
      </div>
    </div>
  );
}
