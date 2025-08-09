import { type ClassValue, clsx } from "clsx";
import { utils as ethersUtils } from "ethers";

// Simplified version that doesn't require tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const formatBalance = (rawBalance: string) => {
  const balance = (parseInt(rawBalance) / 1000000000000000000).toFixed(2);
  return balance;
};

export const formatChainAsNum = (chainIdHex: string) => {
  const chainIdNum = parseInt(chainIdHex);
  return chainIdNum;
};

/**
 * Formats an Ethereum address for display
 * @param address The full Ethereum address
 * @param startLength Number of characters to show at the start
 * @param endLength Number of characters to show at the end
 * @returns Formatted address string
 */
export function formatAddress(address: string | undefined | null, startLength = 6, endLength = 4): string {
  if (!address) return '';
  
  if (address.length < startLength + endLength) {
    return address;
  }
  
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
}

/**
 * Formats a timestamp to a human-readable date string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * Converts a string to a bytes32 hex string
 * @param str String to convert
 * @returns bytes32 hex string
 */
export function stringToBytes32(str: string): string {
  try {
    // Use imported ethersUtils instead of require
    return ethersUtils.id(str);
  } catch (error) {
    console.error('Error converting string to bytes32:', error);
    return str;
  }
}

/**
 * Attempts to convert a bytes32 value to a readable string
 * @param bytes32 The bytes32 value
 * @returns The string representation or a shortened hex string if not convertible
 */
export function bytes32ToString(bytes32: string): string {
  try {
    // Use imported ethersUtils instead of require
    return ethersUtils.parseBytes32String(bytes32);
  } catch (error) {
    // If it can't be parsed as a string, return a shortened version of the hex
    return bytes32.substring(0, 10) + '...';
  }
}

/**
 * Gets a user-friendly name for an address
 * @param address Ethereum address
 * @param type User type (patient or provider)
 * @returns A user-friendly identifier
 */
export function getUserIdentifier(address: string | undefined | null, type: 'patient' | 'provider'): string {
  if (!address) return '';
  
  const prefix = type === 'patient' ? 'MED' : 'PROV';
  return `${prefix}-${address.substring(2, 8).toUpperCase()}`;
} 