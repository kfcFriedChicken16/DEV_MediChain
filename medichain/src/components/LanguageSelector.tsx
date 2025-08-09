'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/context/TranslationContext';

const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage, supportedLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguageName = supportedLanguages.find(
    lang => lang.code === currentLanguage
  )?.name || 'English';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <span>🌐</span>
        <span>{currentLanguageName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="py-1 max-h-60 overflow-y-auto">
            {supportedLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  setLanguage(language.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  currentLanguage === language.code
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700'
                }`}
              >
                {language.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
