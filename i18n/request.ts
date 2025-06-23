// PROJECT_ROOT/i18n/request.ts

import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Adjust path to go UP one level from 'i18n/' to project root, then into 'src/'
import type {Locale} from '../src/i18n.config'; // Path to your locale definitions
import {i18n} from '../src/i18n.config';       // Import the i18n configuration

export default getRequestConfig(async ({requestLocale}) => {
  // Use await requestLocale instead of locale parameter
  const locale = await requestLocale;
  
  // Handle undefined locale by falling back to default
  if (!locale) {
    console.warn('[next-intl] No locale detected, using default locale:', i18n.defaultLocale);
    return {
      messages: (await import(`../messages/${i18n.defaultLocale}.json`)).default,
      locale: i18n.defaultLocale
    };
  }
  
  // Validate that the incoming `locale` parameter is valid
  // Using `i18n.locales` from your imported config
  const baseLocale = locale.split('-')[0] as Locale; // Handle potential regional locales like en-US

  if (!i18n.locales.includes(baseLocale)) {
    console.error(`[next-intl] Invalid or undefined locale received in getRequestConfig: "${locale}", using base: "${baseLocale}"`);
    notFound();
  }

  let messages;
  try {
    // Adjust path to go UP one level from 'i18n/' to project root, then into 'messages/'
    messages = (await import(`../messages/${baseLocale}.json`)).default;
  } catch (error) {
    console.error(`[next-intl] Could not load messages for locale: ${baseLocale}`, error);
    // Attempt to load default locale messages as a fallback before calling notFound
    try {
      console.log(`[next-intl] Attempting to load default locale messages for ${i18n.defaultLocale} as fallback.`);
      // Adjust path for fallback messages as well
      messages = (await import(`../messages/${i18n.defaultLocale}.json`)).default;
    } catch (fallbackError) {
      console.error(`[next-intl] Could not load default locale messages either for locale: ${i18n.defaultLocale}`, fallbackError);
      notFound();
    }
  }

  return {
    messages,
    locale: baseLocale // Return the validated base locale
    // timeZone: 'Europe/Vienna', // Optional: Example timezone
    // now: new Date(), // Optional: Example for consistent date/time
  };
});