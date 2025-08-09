'use client';

import './globals.css';
import React from 'react';
import Navbar from '@/components/Navbar';
import MetaMaskProvider from '@/components/MetaMaskProvider';
import FloatingAIBot from '@/components/FloatingAIBot';
import { RecordProvider } from '@/context/RecordContext';
import { TranslationProvider } from '@/context/TranslationContext';
import { Toaster } from 'react-hot-toast';
import OnboardingGate from '@/components/OnboardingGate';
import EmergencyNotice from '@/components/EmergencyNotice';


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MetaMaskProvider>
          <TranslationProvider>
            <RecordProvider>
                <div className="min-h-screen flex flex-col bg-gray-50">
                  <Navbar />
                  <EmergencyNotice />
                  <div className="flex-grow">
                    <OnboardingGate>{children}</OnboardingGate>
                  </div>
                  <footer className="bg-white border-t border-gray-200 py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <p className="text-center text-gray-500 text-sm">
                        © {new Date().getFullYear()} MediDrop. All rights reserved.
                      </p>
                    </div>
                  </footer>
                </div>
                <FloatingAIBot />
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                    },
                  }}
                />
            </RecordProvider>
          </TranslationProvider>
        </MetaMaskProvider>
      </body>
    </html>
  );
}
