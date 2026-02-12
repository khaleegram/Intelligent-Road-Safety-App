import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { storage } from './services/storage';
import en from './i18n/en.json';
import ha from './i18n/ha.json';
import yo from './i18n/yo.json';
import ig from './i18n/ig.json';

export type Language = 'en' | 'ha' | 'yo' | 'ig';

type I18nContextValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LANGUAGE_STORAGE_KEY = 'language_v1';

const translations: Record<Language, Record<string, string>> = {
  en,
  ha,
  yo,
  ig,
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const interpolate = (input: string, params?: Record<string, string | number>) => {
  if (!params) return input;
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, input);
};

export const I18nProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    storage.get<Language>(LANGUAGE_STORAGE_KEY, 'en').then(setLanguageState);
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    storage.set(LANGUAGE_STORAGE_KEY, next);
  };

  const t = useMemo(
    () => (key: string, params?: Record<string, string | number>) => {
      const table = translations[language] ?? translations.en;
      const fallback = translations.en[key] ?? key;
      const value = table[key] ?? fallback;
      return interpolate(value, params);
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
