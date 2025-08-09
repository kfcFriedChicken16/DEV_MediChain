'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import TranslatedText from '@/components/TranslatedText';

export default function HomePage() {


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            <TranslatedText>MediDrop</TranslatedText>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            <TranslatedText>
              Secure, decentralized medical record management with emergency access capabilities
            </TranslatedText>
          </p>
          


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/emergency-access">
              <Button className="bg-red-600 hover:bg-red-700 border-red-600">
                🚨 <TranslatedText>Emergency Access</TranslatedText>
              </Button>
            </Link>
            <Link href="/patient/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700 border-blue-600">
                👤 <TranslatedText>Patient Dashboard</TranslatedText>
              </Button>
            </Link>
            <Link href="/provider/dashboard">
              <Button className="bg-green-600 hover:bg-green-700 border-green-600">
                🏥 <TranslatedText>Provider Dashboard</TranslatedText>
              </Button>
            </Link>
            <Link href="/translation-demo">
              <Button className="bg-purple-600 hover:bg-purple-700 border-purple-600">
                🌐 <TranslatedText>Translation Demo</TranslatedText>
              </Button>
            </Link>

          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">
                <TranslatedText>Secure & Private</TranslatedText>
              </h3>
              <p className="text-gray-600">
                <TranslatedText>
                  Zero-knowledge proofs and blockchain technology ensure your medical data remains private and secure.
                </TranslatedText>
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">🚨</div>
              <h3 className="text-xl font-semibold mb-2">
                <TranslatedText>Emergency Access</TranslatedText>
              </h3>
              <p className="text-gray-600">
                <TranslatedText>
                  Critical medical information accessible to emergency responders when you need it most.
                </TranslatedText>
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold mb-2">
                <TranslatedText>Global & Accessible</TranslatedText>
              </h3>
              <p className="text-gray-600">
                <TranslatedText>
                  Multi-language support and offline capabilities make healthcare accessible worldwide.
                </TranslatedText>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}