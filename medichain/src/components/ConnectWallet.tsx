import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from './ui/Button';
import { formatAddress } from '@/lib/utils';
import WalletIcon from './icons/WalletIcon';

const ConnectWallet: React.FC = () => {
  const { 
    account, 
    isConnected, 
    isConnecting, 
    connectWallet, 
    disconnectWallet,
    autoConnect,
    setAutoConnectPreference
  } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleConnect = async () => {
    try {
      // Check if the user has previously disconnected
      const wasConnected = localStorage.getItem('medichain_wallet_connected') === 'true';
      const wasDisconnected = localStorage.getItem('medichain_wallet_disconnected') === 'true';
      
      if (wasDisconnected) {
        // Clear the disconnected flag
        localStorage.removeItem('medichain_wallet_disconnected');
        // Force account selection since they explicitly disconnected before
        await connectWallet(true, true);
      } else {
        // Normal connection
        await connectWallet(true);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const handleDisconnect = () => {
    // Set a flag indicating the user explicitly disconnected
    localStorage.setItem('medichain_wallet_disconnected', 'true');
    disconnectWallet();
    setShowDropdown(false);
  };

  const handleSwitchWallet = async () => {
    // First disconnect current wallet
    disconnectWallet();
    setShowDropdown(false);
    
    // Force page reload to clear any state
    if (typeof window !== 'undefined') {
      // Clear all relevant localStorage items
      localStorage.removeItem('medichain_auto_connect');
      localStorage.removeItem('medichain_last_account');
      localStorage.removeItem('medichain_wallet_connected');
      localStorage.removeItem('walletconnect');
      localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
      
      // Add a flag to indicate we want to switch wallets after reload
      localStorage.setItem('medichain_switch_wallet', 'true');
      
      // Force a page reload to completely clear the state
      window.location.reload();
    }
  };

  const toggleAutoConnect = () => {
    setAutoConnectPreference(!autoConnect);
    setShowDropdown(false);
  };

  if (isConnected && account) {
    return (
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <WalletIcon className="w-5 h-5 mr-2 text-gray-500" />
          <span>{formatAddress(account)}</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              <button
                onClick={handleSwitchWallet}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Switch Wallet
              </button>
              <button
                onClick={toggleAutoConnect}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="flex-grow">Auto-connect</span>
                <span className={`ml-2 inline-block w-4 h-4 rounded-full ${autoConnect ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              </button>
            <button
              onClick={handleDisconnect}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Disconnect Wallet
            </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      isLoading={isConnecting}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
};

export default ConnectWallet; 