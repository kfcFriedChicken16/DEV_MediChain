'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import UserTypeSelector from '@/components/UserTypeSelector';
import { useWallet } from '@/context/WalletContext';
import { useMedicalRegistry } from '@/lib/hooks';

export default function RegisterPage() {
  const router = useRouter();
  const { isConnected, isConnecting, connectWallet, userType, setUserType, account } = useWallet();
  const { isRegistered, checkRegistration, registerPatient, error, loading } = useMedicalRegistry();

  const [selectedType, setSelectedType] = useState<'patient' | 'provider' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Initialize selection from wallet context if already chosen previously
  useEffect(() => {
    if (userType && !selectedType) {
      setSelectedType(userType);
    }
  }, [userType, selectedType]);

  // Keep registration status fresh when wallet connects or selection changes
  useEffect(() => {
    if (isConnected && selectedType === 'patient') {
      checkRegistration().catch(() => {});
    }
  }, [isConnected, selectedType, checkRegistration]);

  const handleTypeChosen = (type: 'patient' | 'provider') => {
    setSelectedType(type);
    setUserType(type);
  };

  const handlePatientRegister = async () => {
    setLocalError(null);
    const ok = await registerPatient();
    if (ok) {
      // After registering as patient, force emergency setup first
      router.push('/emergency');
    }
  };

  const handleContinueProvider = () => {
    router.push('/provider/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UserTypeSelector isOpen={!selectedType} onSelect={handleTypeChosen} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-gray-600 mb-6">
            Select your account type and complete a quick setup. Providers don't need on-chain registration.
          </p>

          {/* Wallet connect section */}
          {!isConnected ? (
            <div className="border rounded-lg p-6 mb-6 bg-blue-50 border-blue-200">
              <p className="text-blue-800 mb-4">Connect your wallet to continue.</p>
              <Button onClick={() => connectWallet(true)} isLoading={isConnecting}>
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-4 mb-6 bg-green-50 border-green-200 text-green-800">
              <div className="text-sm">Connected: <span className="font-mono">{account}</span></div>
            </div>
          )}

          {/* Registration action area based on selection */}
          {selectedType === 'patient' && (
            <div className="space-y-4">
              {isConnected && isRegistered && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
                  You are already registered as a patient.
                </div>
              )}

              {isConnected ? (
                <Button onClick={isRegistered ? () => router.push('/patient/dashboard') : handlePatientRegister} isLoading={loading}>
                  {isRegistered ? 'Go to Patient Dashboard' : 'Register as Patient'}
                </Button>
              ) : null}

              {(error || localError) && (
                <div className="text-red-600 text-sm">{error || localError}</div>
              )}
            </div>
          )}

          {selectedType === 'provider' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
                Providers don't need to register. After connecting your wallet, continue to your dashboard.
              </div>
              {isConnected && (
                <Button onClick={handleContinueProvider}>Go to Provider Dashboard</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


