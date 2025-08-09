'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { useMedicalRegistry } from '@/lib/hooks';
import TranslatedText from './TranslatedText';

const ALLOWLIST_ROUTES: readonly string[] = [
  '/emergency',
  '/emergency-access',
  '/emergency-access-zk',
  '/register'
];

export default function EmergencyNotice() {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected, userType, account } = useWallet();
  const { getEmergencyDataCid } = useMedicalRegistry();
  const [show, setShow] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!isConnected || userType !== 'patient' || !account) {
        setShow(false);
        setShowSuccess(false);
        return;
      }
      // Do not show on allowlisted routes (emergency setup pages)
      if (ALLOWLIST_ROUTES.includes(pathname)) {
        setShow(false);
        setShowSuccess(false);
        return;
      }
      try {
        const cid = await getEmergencyDataCid(account);
        if (cancelled) return;
        setShow(!cid || cid.trim().length === 0);
        // If we have a CID and there is a recent onboarding completion flag, show success once
        if (cid && typeof window !== 'undefined') {
          const justCompleted = localStorage.getItem('medichain_onboarding_just_completed') === 'true';
          if (justCompleted) {
            setShowSuccess(true);
            // Clear the flag soon after to avoid persistent banner
            localStorage.removeItem('medichain_onboarding_just_completed');
          } else {
            setShowSuccess(false);
          }
        }
      } catch {
        if (!cancelled) setShow(true);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [pathname, isConnected, userType, account, getEmergencyDataCid]);

  return (
    <>
      {show && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-red-800">
                <span className="font-semibold">
                  <TranslatedText>Action required:</TranslatedText>
                </span>{' '}
                <TranslatedText>
                  Finish and save your emergency information to continue using MediDrop.
                </TranslatedText>
              </div>
              <button
                onClick={() => router.push('/emergency')}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none"
              >
                <TranslatedText>Complete Emergency Setup</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccess && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-green-800">
                <span className="font-semibold">
                  <TranslatedText>Setup complete:</TranslatedText>
                </span>{' '}
                <TranslatedText>
                  Your emergency information is saved. You can now access all pages.
                </TranslatedText>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none"
              >
                <TranslatedText>Dismiss</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


