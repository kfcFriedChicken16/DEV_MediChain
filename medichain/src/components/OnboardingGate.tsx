'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { useMedicalRegistry } from '@/lib/hooks';

interface OnboardingGateProps {
  children: React.ReactNode;
}

// Routes that should never be blocked by the emergency-setup requirement
const ALLOWLIST_ROUTES: readonly string[] = [
  '/',
  '/register',
  '/emergency',
  '/emergency-access',
  '/emergency-access-zk'
];

export default function OnboardingGate({ children }: OnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, userType, account } = useWallet();
  const { getEmergencyDataCid } = useMedicalRegistry();

  const [checked, setChecked] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    const runCheck = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        // Only enforce for connected patient accounts
        if (!isConnected || userType !== 'patient' || !account) {
          setChecked(true);
          return;
        }

        // Skip checks for allowlisted routes
        if (ALLOWLIST_ROUTES.includes(pathname)) {
          setChecked(true);
          return;
        }

        // Check emergency setup completion via on-chain CID
        const cid = await getEmergencyDataCid(account);
        if (!cid || cid.trim().length === 0) {
          // Not completed – send to emergency setup
          router.replace('/emergency');
          setChecked(false);
          return;
        }

        setChecked(true);
      } catch (_err) {
        // If anything goes wrong, be safe and redirect to emergency setup
        if (userType === 'patient') {
          router.replace('/emergency');
          setChecked(false);
          return;
        }
        setChecked(true);
      } finally {
        checkingRef.current = false;
      }
    };

    runCheck();
  }, [pathname, isConnected, userType, account, getEmergencyDataCid, router]);

  // Render children even while checking for non-patient or allowlisted; otherwise minimal flicker is acceptable
  return <>{children}</>;
}


