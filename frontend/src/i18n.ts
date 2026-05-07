import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
 
// Can be imported from a shared config
const locales = ['en', 'tw'];
 
export default getRequestConfig(async ({locale}) => {
  const currentLocale = locale || 'en';
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(currentLocale as any)) notFound();
 
  return {
    locale: currentLocale,
    messages: (await import(`./messages/${currentLocale}.json`)).default
  };
});
