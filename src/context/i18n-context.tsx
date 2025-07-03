
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextType {
  t: TFunction;
  locale: 'en' | 'es';
  setLocale: (locale: 'en' | 'es') => void;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const interpolate = (str: string, params?: Record<string, string | number>) => {
  if (!params) return str;
  // This will replace {key} with the value from params.
  return str.replace(/\{(\w+)\}/g, (placeholder, key) => {
    return params.hasOwnProperty(key) ? String(params[key]) : placeholder;
  });
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<'en' | 'es'>('en');
  const [messages, setMessages] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as 'en' | 'es' | null;
    const browserLocale = navigator.language.split('-')[0];
    const initialLocale = savedLocale || (browserLocale === 'es' ? 'es' : 'en');
    setLocale(initialLocale);
  }, []);

  const setLocale = (newLocale: 'en' | 'es') => {
    setIsLoading(true);
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const module = await import(`../../messages/${locale}.json`);
        setMessages(module.default);
      } catch (error) {
        console.error('Failed to load messages:', error);
        // Fallback to English if the selected locale fails
        const module = await import(`../../messages/en.json`);
        setMessages(module.default);
      } finally {
        setIsLoading(false);
      }
    };
    loadMessages();
  }, [locale]);

  const t: TFunction = (key, params) => {
    if (!messages || isLoading) return key;
    const keys = key.split('.');
    let value: any = messages;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    return interpolate(String(value), params);
  };

  const value = { t, locale, setLocale, isLoading };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
