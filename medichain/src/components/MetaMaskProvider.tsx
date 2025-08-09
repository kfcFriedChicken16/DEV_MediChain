import React, { useEffect, useState } from 'react';
import { WalletProvider } from '@/context/WalletContext';
import { usePathname, useRouter } from 'next/navigation';
import UserTypeSelector from './UserTypeSelector';

// Define supported networks
const SUPPORTED_NETWORKS = {
  // Hardhat local network
  31337: {
    name: 'Hardhat',
    chainId: '0x7A69',
    rpcUrl: 'http://localhost:8545'
  },
  // Sepolia testnet
  11155111: {
    name: 'Sepolia',
    chainId: '0xaa36a7',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_ID'
  }
};

// Default network to use
const DEFAULT_NETWORK = 31337; // Hardhat local network

// Local storage keys
const STORAGE_KEYS = {
  AUTO_CONNECT: 'medichain_auto_connect',
  LAST_CONNECTED_ACCOUNT: 'medichain_last_account',
  WALLET_PREVIOUSLY_CONNECTED: 'medichain_wallet_connected',
  SWITCH_WALLET: 'medichain_switch_wallet',
  USER_TYPE: 'medichain_user_type'
};

interface MetaMaskProviderProps {
  children: React.ReactNode;
}

const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<'patient' | 'provider'>('patient');
  const [showUserTypeSelector, setShowUserTypeSelector] = useState<boolean>(false);
  const [autoConnect, setAutoConnect] = useState<boolean>(false);
  const router = useRouter();
  
  // Get current pathname to check if we're on the home page
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum?.isMetaMask;
  };

  // Set auto-connect preference
  const setAutoConnectPreference = (enabled: boolean) => {
    setAutoConnect(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AUTO_CONNECT, JSON.stringify(enabled));
    }
  };

  // Set user type with localStorage
  const handleSetUserType = (type: 'patient' | 'provider') => {
    setUserType(type);
    localStorage.setItem(STORAGE_KEYS.USER_TYPE, type);
    setShowUserTypeSelector(false);
    // Redirect based on chosen role
    try {
      if (type === 'patient') {
        router.push('/emergency');
      } else {
        router.push('/provider/dashboard');
      }
    } catch (e) {
      // Ignore navigation errors
      console.log('Navigation after role select failed:', e);
    }
  };

  // Connect to MetaMask
  const connectWallet = async (rememberConnection: boolean = true, forceAccountSelection: boolean = false) => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to use this application.');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      
      // If we want to force account selection, we need to do some extra steps
      if (forceAccountSelection && window.ethereum) {
        // Clear any cached connections
        localStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED_ACCOUNT);
        localStorage.removeItem(STORAGE_KEYS.WALLET_PREVIOUSLY_CONNECTED);
        localStorage.removeItem(STORAGE_KEYS.USER_TYPE);
        localStorage.removeItem('walletconnect');
        localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
        
        // Attempt to "disconnect" first - MetaMask doesn't have a true disconnect function
        // but this can help reset the state
        try {
          // This is a workaround to try to force MetaMask to show the account selection
          if (window.ethereum.request) {
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
          }
        } catch (err) {
          console.log('Error requesting permissions, continuing anyway:', err);
        }
      }
      
      // Request accounts - this will show the MetaMask popup
      const accounts = await window.ethereum!.request!({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Get current chain ID
        const chainId = await window.ethereum!.request!({ 
          method: 'eth_chainId' 
        }) as string;
        
        setChainId(chainId);
        
        // Check if we're on a supported network
        await checkAndSwitchNetwork(chainId);

        // Save connection preference if requested
        if (rememberConnection) {
          setAutoConnectPreference(true);
          localStorage.setItem(STORAGE_KEYS.LAST_CONNECTED_ACCOUNT, accounts[0]);
          localStorage.setItem(STORAGE_KEYS.WALLET_PREVIOUSLY_CONNECTED, 'true');
        }
        
        // Check if user type is already set
        const savedUserType = localStorage.getItem(STORAGE_KEYS.USER_TYPE) as 'patient' | 'provider' | null;
        if (savedUserType) {
          setUserType(savedUserType);
        } else {
          // Show user type selector if no saved preference
          setShowUserTypeSelector(true);
        }
      } else {
        setError('No accounts found. Please unlock your MetaMask wallet.');
      }
    } catch (err) {
      console.error('Error connecting to MetaMask:', err);
      if (err instanceof Error) {
        // Handle user rejected request error
        if (err.message.includes('User rejected')) {
          setError('Connection rejected. Please approve the connection request in MetaMask.');
        } else {
          setError(`Failed to connect: ${err.message}`);
        }
      } else {
        setError('An unknown error occurred while connecting to MetaMask.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if we're on a supported network and switch if needed
  const checkAndSwitchNetwork = async (currentChainId: string) => {
    const chainIdNum = parseInt(currentChainId, 16);
    
    // If we're already on a supported network, do nothing
    if (Object.keys(SUPPORTED_NETWORKS).includes(chainIdNum.toString())) {
      return;
    }
    
    // Otherwise, try to switch to the default network
    try {
      await switchNetwork(DEFAULT_NETWORK);
    } catch (err) {
      console.error('Error switching network:', err);
      // Don't set error here, as we still want to allow users to use the app
      // even if they're on an unsupported network
    }
  };

  // Switch to a specific network
  const switchNetwork = async (networkId: number) => {
    if (!window.ethereum || !window.ethereum.request) {
      throw new Error('MetaMask is not installed');
    }
    
    const network = SUPPORTED_NETWORKS[networkId as keyof typeof SUPPORTED_NETWORKS];
    if (!network) {
      throw new Error(`Network ${networkId} is not supported`);
    }
    
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
    } catch (switchError: unknown) {
      // This error code indicates that the chain has not been added to MetaMask
      if (typeof switchError === 'object' && 
          switchError !== null && 
          'code' in switchError && 
          switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: network.chainId,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
              },
            ],
          });
        } catch (error) {
          throw new Error('Failed to add network to MetaMask');
        }
      } else {
        throw switchError;
      }
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    setError(null);
    
    // Clear auto-connect preference and all related storage
    setAutoConnectPreference(false);
    localStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED_ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.WALLET_PREVIOUSLY_CONNECTED);
    localStorage.removeItem(STORAGE_KEYS.USER_TYPE);
    localStorage.removeItem('walletconnect');
    localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
    
    // Clear MetaMask connection state as much as possible
    try {
      if (window.ethereum) {
        console.log("Clearing MetaMask connection state");
        
        // MetaMask doesn't have a true disconnect method
        // We've already cleared the local state above
      }
    } catch (err) {
      console.error("Error during MetaMask disconnect:", err);
    }
  };

  // Check for saved connection preference on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if we need to switch wallets
      const shouldSwitchWallet = localStorage.getItem(STORAGE_KEYS.SWITCH_WALLET) === 'true';
      
      if (shouldSwitchWallet) {
        // Clear the flag
        localStorage.removeItem(STORAGE_KEYS.SWITCH_WALLET);
        localStorage.removeItem(STORAGE_KEYS.USER_TYPE);
        
        // Force account selection on next connect
        setTimeout(() => {
          connectWallet(true, true).catch(console.error);
      }, 500);
        return;
      }
      
      // Check for saved user type
      const savedUserType = localStorage.getItem(STORAGE_KEYS.USER_TYPE) as 'patient' | 'provider' | null;
      if (savedUserType) {
        setUserType(savedUserType);
      }
      
      // Normal auto-connect flow
      const savedAutoConnect = localStorage.getItem(STORAGE_KEYS.AUTO_CONNECT);
      const shouldAutoConnect = savedAutoConnect ? JSON.parse(savedAutoConnect) : false;
      setAutoConnect(shouldAutoConnect);
      
      if (shouldAutoConnect && isMetaMaskInstalled()) {
        // Try to reconnect with the last account
        connectWallet(true).catch(console.error);
      }
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleAccountsChanged = (accounts: unknown) => {
      const accountsArray = accounts as string[];
      if (!accountsArray || accountsArray.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
      } else {
        // Account changed
        setAccount(accountsArray[0]);
        setIsConnected(true);
        
        // Update stored account if auto-connect is enabled
        if (autoConnect) {
          localStorage.setItem(STORAGE_KEYS.LAST_CONNECTED_ACCOUNT, accountsArray[0]);
        }
      }
    };

    const handleChainChanged = (_chainId: unknown) => {
      // Chain changed, reload the page as recommended by MetaMask
      window.location.reload();
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    if (isMetaMaskInstalled()) {
      // Set up event listeners for wallet changes
      window.ethereum!.on!('accountsChanged', handleAccountsChanged);
      window.ethereum!.on!('chainChanged', handleChainChanged);
      window.ethereum!.on!('disconnect', handleDisconnect);

      // Clean up event listeners
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [autoConnect]);

  return (
    <WalletProvider
      value={{
        account,
        chainId,
        isConnected,
        isConnecting,
        error,
        userType,
        setUserType: handleSetUserType,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        autoConnect,
        setAutoConnectPreference
      }}
    >
      <UserTypeSelector 
        isOpen={showUserTypeSelector} 
        onSelect={handleSetUserType} 
      />
        {children}
      </WalletProvider>
  );
};

export default MetaMaskProvider; 