'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/TranslationContext';

interface TranslatedTextProps {
  children: string;
  className?: string;
  fallback?: string;
}

const TranslatedText: React.FC<TranslatedTextProps> = ({ 
  children, 
  className = '', 
  fallback 
}) => {
  const { translate, currentLanguage, isLoading } = useTranslation();
  const [translatedText, setTranslatedText] = useState(children);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const translateText = async () => {
      if (currentLanguage === 'en') {
        setTranslatedText(children);
        return;
      }

      setIsTranslating(true);
      try {
        const result = await translate(children);
        setTranslatedText(result);
      } catch (error) {
        console.error('Translation failed:', error);
        setTranslatedText(fallback || children);
      } finally {
        setIsTranslating(false);
      }
    };

    translateText();
  }, [children, currentLanguage, translate, fallback]);

  return (
    <span className={className}>
      {isTranslating || isLoading ? (
        <span className="opacity-70">{children}</span>
      ) : (
        translatedText
      )}
    </span>
  );
};

export default TranslatedText;
