import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

// next-intl v4: callback receives `requestLocale` (a Promise<string|undefined>)
// instead of the synchronous `locale`. We resolve it, fall back to the default
// for the rare case where the middleware didn't set it (e.g. static OG image
// route hitting the i18n config), and always return `locale` explicitly so the
// provider knows what to render.
export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale;
  const locale: Locale = (resolved && (locales as readonly string[]).includes(resolved))
    ? (resolved as Locale)
    : defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
