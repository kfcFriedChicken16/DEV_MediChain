import React, { createContext, useContext } from 'react';

export type UserType = 'patient' | 'provider';

interface WalletContextType {
  account: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  userType: UserType;
  setUserType: (type: UserType) => void;
  connectWallet: (rememberConnection?: boolean, forceAccountSelection?: boolean) => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (networkId: number) => Promise<void>;
  autoConnect: boolean;
  setAutoConnectPreference: (enabled: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children, value }: { children: React.ReactNode, value: WalletContextType }) {
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 