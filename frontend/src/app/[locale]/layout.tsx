import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "@/app/globals.css";
import Navigation from '@/components/Navigation';
import ProgressBarProvider from '@/components/ProgressBarProvider';
import Link from 'next/link';

export const metadata = {
  title: {
    template: '%s | CocoaLink',
    default: 'CocoaLink - Ghana Cocoa Trading & Smart Farm Platform',
  },
  description: 'Connecting Ghanaian cocoa farmers directly with licensed buyers with escrow payments and IoT telemetry.',
};

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-amber-200 selection:text-amber-900 font-sans">
        <NextIntlClientProvider messages={messages}>
          <ProgressBarProvider>
            <div className="min-h-screen flex flex-col relative overflow-x-hidden">
              <Navigation locale={locale} />
              
              <main className="flex-grow flex flex-col relative z-10">
                {children}
              </main>
              
              <footer className="border-t border-slate-200/60 bg-white/70 backdrop-blur-md mt-auto relative z-10">
                <div className="container mx-auto px-6 py-8">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-sm font-bold">
                      &copy; {new Date().getFullYear()} CocoaLink. Empowering agriculture through technology.
                    </p>
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
