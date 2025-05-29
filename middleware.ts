
import createMiddleware from 'next-intl/middleware';
import {i18n} from '@/i18n.config'; // Changed from './src/i18n.config'

export default createMiddleware({
  locales: i18n.locales,
  defaultLocale: i18n.defaultLocale,
  localePrefix: 'always'
});

export const config = {
  // Match only internationalized pathnames
  // This pattern excludes API routes, public files, and files with extensions (like .ico, .png)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
};

