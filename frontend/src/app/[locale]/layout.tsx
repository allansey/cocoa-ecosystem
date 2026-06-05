import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import "@/app/globals.css";
import Navigation from '@/components/Navigation';
export const metadata = {
  title: 'CocoaLink MVP',
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
    <html lang={locale}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-amber-200 selection:text-amber-900">
        <NextIntlClientProvider messages={messages}>
          <div className="min-h-screen flex flex-col relative overflow-x-hidden">
            <Navigation />
            
            <main className="flex-grow flex flex-col relative z-10">
              {children}
            </main>
            
            <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-sm mt-auto relative z-10">
              <div className="container mx-auto px-6 py-8 text-center">
                <p className="text-slate-500 text-sm font-bold">&copy; {new Date().getFullYear()} CocoaLink MVP. Empowering agriculture through technology.</p>
              </div>
            </footer>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
