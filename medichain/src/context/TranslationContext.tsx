'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TranslationContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  translate: (text: string) => Promise<string>;
  isLoading: boolean;
  supportedLanguages: Language[];
}

interface Language {
  code: string;
  name: string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// MyMemory Translation API - more reliable than LibreTranslate
const TRANSLATION_API = 'https://api.mymemory.translated.net/get';

// Supported languages
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ms', name: 'Malay' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
];

// Translation cache to avoid repeated API calls
const translationCache = new Map<string, string>();

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  const setLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    // Store language preference in localStorage
    localStorage.setItem('preferredLanguage', lang);
  };

  const translate = async (text: string): Promise<string> => {
    // If it's English or empty text, return as is
    if (currentLanguage === 'en' || !text.trim()) {
      return text;
    }

    // Create cache key
    const cacheKey = `${text}:${currentLanguage}`;
    
    // Check cache first
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    try {
      setIsLoading(true);
      
      console.log('Attempting translation:', { text, target: currentLanguage });
      
      // Use MyMemory Translation API
      const response = await fetch(`${TRANSLATION_API}?q=${encodeURIComponent(text)}&langpair=en|${currentLanguage}`);

      console.log('Response status:', response.status, response.statusText);
      if (!response.ok) {
        console.warn(`Translation failed with status: ${response.status}`, response.statusText);
        return text;
      }

      const data = await response.json();
      console.log('Translation response:', data);
      
      const translatedText = data.responseData?.translatedText || text;

      // Cache the translation
      translationCache.set(cacheKey, translatedText);

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLanguage)) {
      setCurrentLanguage(savedLanguage);
    }
    
    // Test API connectivity on mount
    const testAPI = async () => {
      try {
        const response = await fetch(`${TRANSLATION_API}?q=hello&langpair=en|es`);
        console.log('API connectivity test:', response.status);
      } catch (error) {
        console.error('API connectivity test failed:', error);
      }
    };
    testAPI();
  }, []);

  const value: TranslationContextType = {
    currentLanguage,
    setLanguage,
    translate,
    isLoading,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
