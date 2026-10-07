import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'hi' | 'mr';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', shortLabel: 'EN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', shortLabel: 'HI' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', shortLabel: 'MR' },
];

export interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  currentLanguage: LanguageOption;
  t: (key: string) => string;
}

// Simple translation dictionary for common application UI strings
const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    'app.title': 'AgriGPT OS',
    'nav.chat': 'Chat',
    'nav.3dView': '3D Farm View',
    'nav.store': 'AgroStore',
    'nav.analytics': 'Analytics',
    'nav.weather': 'Weather',
    'nav.diseaseScan': 'Disease Scan',
    'nav.settings': 'Settings',
    'nav.logout': 'Log out',
    'nav.newChat': 'New Chat',
    'nav.recent': 'Recent',
    'header.copilot': 'AI Copilot',
    'header.cart': 'Shopping Cart',
    'lang.select': 'Select Language',
    'lang.english': 'English',
    'lang.hindi': 'हिंदी (Hindi)',
    'lang.marathi': 'मराठी (Marathi)',
  },
  hi: {
    'app.title': 'एग्रीजीपीटी ओएस',
    'nav.chat': 'चैट',
    'nav.3dView': '3D फार्म दृश्य',
    'nav.store': 'एग्रो स्टोर',
    'nav.analytics': 'विश्लेषण',
    'nav.weather': 'मौसम',
    'nav.diseaseScan': 'रोग स्कैन',
    'nav.settings': 'सेटिंग्स',
    'nav.logout': 'लॉग आउट',
    'nav.newChat': 'नई चैट',
    'nav.recent': 'हालिया',
    'header.copilot': 'एआई सह-पायलट',
    'header.cart': 'शॉपिंग कार्ट',
    'lang.select': 'भाषा चुनें',
    'lang.english': 'English (अंग्रेज़ी)',
    'lang.hindi': 'हिंदी (Hindi)',
    'lang.marathi': 'मराठी (Marathi)',
  },
  mr: {
    'app.title': 'अ‍ॅग्रीजीपीटी ओएस',
    'nav.chat': 'चॅट',
    'nav.3dView': '3D शेती दृश्य',
    'nav.store': 'अ‍ॅग्रो स्टोअर',
    'nav.analytics': 'विश्लेषण',
    'nav.weather': 'हवामान',
    'nav.diseaseScan': 'रोग स्कॅन',
    'nav.settings': 'सेटिंग्ज',
    'nav.logout': 'लॉग आउट',
    'nav.newChat': 'नवीन चॅट',
    'nav.recent': 'नुकतेच',
    'header.copilot': 'एआय सह-पायलट',
    'header.cart': 'खरेदी कार्ट',
    'lang.select': 'भाषा निवडा',
    'lang.english': 'English (इंग्रजी)',
    'lang.hindi': 'हिंदी (Hindi)',
    'lang.marathi': 'मराठी (Marathi)',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('agrigpt_language');
      if (saved === 'hi' || saved === 'mr' || saved === 'en') {
        return saved;
      }
    } catch {
      // Fallback if localStorage fails
    }
    return 'en';
  });

  const setLanguage = (code: LanguageCode) => {
    setLanguageState(code);
    try {
      localStorage.setItem('agrigpt_language', code);
    } catch (e) {
      console.error('Failed to save language preference:', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Alias to ensure any code importing LanguageContext directly works seamlessly
export { LanguageContext };
