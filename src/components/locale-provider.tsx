"use client";

import { useEffect } from 'react';
import type { Locale } from '@/i18n.config';

interface LocaleProviderProps {
  locale: Locale;
}

export function LocaleProvider({ locale }: LocaleProviderProps) {
  useEffect(() => {
    // Set the lang attribute on the html element
    document.documentElement.lang = locale;
  }, [locale]);

  // This component doesn't render anything visible
  return null;
} 