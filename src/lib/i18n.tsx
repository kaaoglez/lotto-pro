'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Locale = 'es' | 'en' | 'fr' | 'cn';

const LOCALE_STORAGE_KEY = 'lotto-pro-locale';

const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  cn: '中文',
};

const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  fr: '🇫🇷',
  cn: '🇨🇳',
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeNames: Record<Locale, string>;
  localeFlags: Record<Locale, string>;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');
  const [dict, setDict] = useState<Record<string, string>>({});

  // Load saved locale on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (saved && ['es', 'en', 'fr', 'cn'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  // Load translation dictionary when locale changes
  useEffect(() => {
    import(`@/locales/${locale}.json`).then((mod) => {
      // Flatten nested JSON to dot-notation keys
      const flat: Record<string, string> = {};
      const flatten = (obj: Record<string, unknown>, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          const key = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'string') {
            flat[key] = v;
          } else if (v && typeof v === 'object') {
            flatten(v as Record<string, unknown>, key);
          }
        }
      };
      flatten(mod.default || mod);
      setDict(flat);
    }).catch(console.error);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let str = dict[key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }, [dict]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, localeNames: LOCALE_NAMES, localeFlags: LOCALE_FLAGS }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
