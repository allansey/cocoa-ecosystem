import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import "@/app/globals.css";

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
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-amber-100/50 shadow-sm transition-all">
              <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30 flex items-center justify-center transform transition-transform hover:rotate-12">
                    <span className="text-white font-black text-xl leading-none">C</span>
                  </div>
                  <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-800 to-amber-600 tracking-tight">
                    CocoaLink
                  </h1>
                </div>
                <nav className="hidden md:flex gap-8 items-center">
                  <a href={`/${locale}/`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">Home</a>
                  <a href={`/${locale}/listings`} className="text-sm font-bold text-slate-600 hover:text-amber-700 transition-colors">Marketplace</a>
                  <a href={`/${locale}/auth/login`} className="text-sm font-black bg-amber-100 text-amber-800 px-6 py-2.5 rounded-full hover:bg-amber-200 transition-all active:scale-95 shadow-sm">
                    Login
                  </a>
                </nav>
              </div>
            </header>
            
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
