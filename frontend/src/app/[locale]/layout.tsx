import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import "@/app/globals.css";
import NavbarAuth from '@/components/NavbarAuth';
import ProgressBarProvider from '@/components/ProgressBarProvider';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: {
    template: '%s | CocoaLink',
    default: 'CocoaLink - Connecting Farmers and Buyers',
  },
  description: 'Connecting Cocoa Farmers and Buyers in Ghana',
};

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased selection:bg-amber-200 selection:text-amber-900`}>
        <NextIntlClientProvider messages={messages}>
          <ProgressBarProvider>
            <div className="min-h-screen flex flex-col relative overflow-x-hidden">
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-amber-100/50 shadow-sm transition-all">
              <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link href={`/${locale}/`} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30 flex items-center justify-center transform transition-transform hover:rotate-12" aria-label="CocoaLink Logo">
                    <span className="text-white font-black text-xl leading-none">C</span>
                  </div>
                  <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-800 to-amber-600 tracking-tight">
                    CocoaLink
                  </h1>
                </Link>
                <nav className="hidden md:flex gap-6 items-center">
                  <Link href={`/${locale}/`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">Home</Link>
                  <Link href={`/${locale}/listings`} prefetch={true} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">Marketplace</Link>
                  <div className="h-4 w-px bg-slate-200"></div>
                  <div className="flex gap-2">
                    <Link href="/en" className={`text-xs font-bold px-2 py-1 rounded-md ${locale === 'en' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'}`}>EN</Link>
                    <Link href="/tw" className={`text-xs font-bold px-2 py-1 rounded-md ${locale === 'tw' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'}`}>TW</Link>
                  </div>
                  <NavbarAuth locale={locale} />
                </nav>
              </div>
            </header>
            
            <main className="flex-grow flex flex-col relative z-10">
              {children}
            </main>
            
            <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-sm mt-auto relative z-10">
              <div className="container mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-slate-500 text-sm font-bold">&copy; {new Date().getFullYear()} CocoaLink MVP. Empowering agriculture through technology.</p>
                  <div className="flex gap-6">
                    <Link href={`/${locale}/privacy`} className="text-sm font-medium text-slate-500 hover:text-amber-600 transition-colors">Privacy Policy</Link>
                    <Link href={`/${locale}/terms`} className="text-sm font-medium text-slate-500 hover:text-amber-600 transition-colors">Terms of Service</Link>
                    <Link href={`/${locale}/contact`} className="text-sm font-medium text-slate-500 hover:text-amber-600 transition-colors">Contact</Link>
                  </div>
                </div>
              </div>
            </footer>
          </div>
          </ProgressBarProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

