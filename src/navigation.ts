import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';
import type {Locale} from './i18n.config';
import {i18n} from './i18n.config';

export const localePrefix = 'as-needed'; // Default

// Even if you don't translate URL segments, provide a basic structure.
// This helps next-intl's internal routing mechanisms.
export const pathnames = {
  '/': '/',
  '/offers': '/offers',
  '/offers/new': '/offers/new',
  '/offers/edit/[id]': '/offers/edit/[id]',
  '/quality-manual': '/quality-manual',
  '/records': '/records',
  '/records/log/frm-420-001': '/records/log/frm-420-001',
  '/records/log/frm-612-001': '/records/log/frm-612-001',
  '/records/log/frm-712-001': '/records/log/frm-712-001',
  '/orders/active': '/orders/active',
  '/orders/sent': '/orders/sent',
  '/orders/[id]': '/orders/[id]',
  '/jobs': '/jobs',
  '/balance': '/balance',
  // Planning module routes
  '/planning': '/planning',
  '/planning/machines': '/planning/machines',
  '/planning/schedule': '/planning/schedule',
  '/planning/auto-schedule': '/planning/auto-schedule',
  '/planning/reports': '/planning/reports',
} as const;

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({
    locales: i18n.locales as unknown as [Locale, ...Locale[]], // Type assertion might be needed depending on i18n.config
    pathnames: pathnames,
    localePrefix
  });
