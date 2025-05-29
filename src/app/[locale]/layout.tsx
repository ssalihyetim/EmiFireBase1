import type { Metadata, Viewport } from "next";
import "../globals.css";
import { AppShell } from "@/components/layout/app-shell";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {i18n, type Locale} from '@/i18n.config';
import { LocaleProvider } from '@/components/locale-provider';

// Temporarily comment out generateStaticParams to isolate potential build/SSR issues
// export function generateStaticParams() {
//   return i18n.locales.map(locale => ({locale}));
// }

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const resolvedParams = await params;
  const currentLocale = resolvedParams.locale as Locale;
  if (!i18n.locales.includes(currentLocale)) notFound();

  let pageTitle = "Euro Metal Docs"; // Default title
  try {
    // For metadata, it's safer to use getTranslations if context is set up
    // or import messages directly if getTranslations causes issues here.
    const t = await getTranslations({locale: currentLocale, namespace: 'DashboardPage'});
    pageTitle = t('title');
  } catch (e) {
    console.error(`Error loading translations for metadata in locale ${currentLocale}:`, e);
    // Fallback to direct import if getTranslations fails in metadata context
    try {
      const messages = (await import(`../../../messages/${currentLocale}.json`)).default;
      pageTitle = messages?.DashboardPage?.title || "Euro Metal Docs";
    } catch (importError) {
        console.error(`Fallback message import failed for metadata, locale ${currentLocale}:`, importError);
    }
  }

  return {
    title: pageTitle,
    description: "Quality Management and Operations for Euro Metal Docs.",
  };
}


export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const resolvedParams = await params;
  const currentLocale = resolvedParams.locale as Locale;

  if (!i18n.locales.includes(currentLocale)) {
    console.error(`[LocaleLayout] Invalid locale detected: ${currentLocale}, redirecting to notFound.`);
    notFound();
  }

  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    console.error(`Error loading messages for locale ${currentLocale} via getMessages() in LocaleLayout:`, error);
    // Fallback to direct import if getMessages fails
    try {
      console.log(`Attempting fallback direct import for messages/${currentLocale}.json`);
      messages = (await import(`../../../messages/${currentLocale}.json`)).default;
    } catch (importError) {
       console.error(`Fallback message import failed for locale ${currentLocale} in LocaleLayout:`, importError);
       notFound(); // If messages can't be loaded at all, it's a critical error
    }
  }

  if (!messages) {
    console.error(`Messages are still undefined for locale ${currentLocale} in LocaleLayout after all attempts. Redirecting to notFound.`);
    notFound();
  }

  return (
    <>
      <LocaleProvider locale={currentLocale} />
      <div className="antialiased">
        <NextIntlClientProvider locale={currentLocale} messages={messages}>
          <AppShell>{children}</AppShell>
        </NextIntlClientProvider>
      </div>
    </>
  );
}
