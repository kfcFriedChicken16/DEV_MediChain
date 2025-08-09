'use client';

import React from 'react';
import TranslatedText from '@/components/TranslatedText';

export default function TranslationDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <TranslatedText>Translation Demo</TranslatedText>
          </h1>
          <p className="text-xl text-gray-600">
            <TranslatedText>
              This page demonstrates automatic translation using LibreTranslate API. 
              Change the language using the selector in the navbar to see instant translation.
            </TranslatedText>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Medical Terms */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              <TranslatedText>Medical Terms</TranslatedText>
            </h2>
            <div className="space-y-3">
              <p><TranslatedText>Blood Pressure</TranslatedText></p>
              <p><TranslatedText>Heart Rate</TranslatedText></p>
              <p><TranslatedText>Temperature</TranslatedText></p>
              <p><TranslatedText>Allergies</TranslatedText></p>
              <p><TranslatedText>Medications</TranslatedText></p>
            </div>
          </div>

          {/* Common Phrases */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              <TranslatedText>Common Phrases</TranslatedText>
            </h2>
            <div className="space-y-3">
              <p><TranslatedText>How are you feeling today?</TranslatedText></p>
              <p><TranslatedText>Do you have any pain?</TranslatedText></p>
              <p><TranslatedText>Please take your medication</TranslatedText></p>
              <p><TranslatedText>Emergency contact information</TranslatedText></p>
              <p><TranslatedText>Medical history</TranslatedText></p>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              <TranslatedText>Features</TranslatedText>
            </h2>
            <div className="space-y-3">
              <p><TranslatedText>Secure medical record storage</TranslatedText></p>
              <p><TranslatedText>Emergency access capabilities</TranslatedText></p>
              <p><TranslatedText>Multi-language support</TranslatedText></p>
              <p><TranslatedText>Blockchain technology</TranslatedText></p>
              <p><TranslatedText>Zero-knowledge proofs</TranslatedText></p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              <TranslatedText>Instructions</TranslatedText>
            </h2>
            <div className="space-y-3">
              <p><TranslatedText>Click the language selector in the navbar</TranslatedText></p>
              <p><TranslatedText>Choose your preferred language</TranslatedText></p>
              <p><TranslatedText>Watch the text translate automatically</TranslatedText></p>
              <p><TranslatedText>Translations are cached for better performance</TranslatedText></p>
              <p><TranslatedText>Original text is shown while translating</TranslatedText></p>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-blue-900">
            <TranslatedText>How It Works</TranslatedText>
          </h3>
          <div className="space-y-2 text-blue-800">
            <p><TranslatedText>• Uses LibreTranslate API for free translation</TranslatedText></p>
            <p><TranslatedText>• Automatically translates when language changes</TranslatedText></p>
            <p><TranslatedText>• Caches translations to avoid repeated API calls</TranslatedText></p>
            <p><TranslatedText>• Falls back to original text if translation fails</TranslatedText></p>
            <p><TranslatedText>• No manual translation files needed</TranslatedText></p>
          </div>
        </div>
      </div>
    </div>
  );
}
