/**
 * Application configuration
 */

// Contract addresses
export const MEDICAL_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_MEDICAL_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Network configuration
export const NETWORK_CONFIG = {
  hardhat: {
    chainId: 31337,
    name: 'Hardhat',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: ''
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || ''}`,
    blockExplorer: 'https://sepolia.etherscan.io'
  }
};

// Default network
export const DEFAULT_NETWORK = 'hardhat';

// IPFS configuration
export const IPFS_CONFIG = {
  // Default service to use (pinata or infura)
  defaultService: process.env.NEXT_PUBLIC_IPFS_SERVICE || 'pinata',
  
  // Pinata configuration
  pinata: {
    apiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY || '90b2a3aea0428d420f24',
    secretApiKey: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || '088ee00ba2b1fd5c56d0a7f4daad0119f10514494ac26c218f39f2975b155a49',
    gateway: 'https://gateway.pinata.cloud/ipfs/'
  },
  
  // Infura configuration
  infura: {
    projectId: process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_ID || '',
    projectSecret: process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_SECRET || '',
    gateway: 'https://ipfs.infura.io/ipfs/'
  },
  
  // Public gateway to use for retrieving data
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://dweb.link/ipfs/'
};

// API endpoints
export const API_ENDPOINTS = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
};

// Feature flags
export const FEATURES = {
  emergencyAccess: process.env.NEXT_PUBLIC_FEATURE_EMERGENCY_ACCESS === 'true',
  encryption: process.env.NEXT_PUBLIC_FEATURE_ENCRYPTION === 'true',
  notifications: process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS === 'true'
};

// App metadata
export const APP_METADATA = {
  name: 'MediDrop',
  description: 'Secure medical records on the blockchain',
  version: '0.1.0'
}; 