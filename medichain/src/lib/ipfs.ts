'use client';

import axios from 'axios';
import { IPFS_CONFIG } from '@/config';

// Type definitions
interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface IPFSResult {
  path: string;
  cid: { toString: () => string };
  size: number;
}

interface UploadOptions {
  metadata?: Record<string, unknown>;
  pinataOptions?: {
    cidVersion?: number;
    wrapWithDirectory?: boolean;
  };
  service?: 'pinata' | 'infura';
}

// Create IPFS clients for different services - only in client side
let ipfsHttpClient: any = null;
let createInfuraClient: (() => any) | null = null;

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize IPFS client only in browser environment
if (isBrowser) {
  // Use dynamic import to load the IPFS client only on the client side
  import('ipfs-http-client').then((module) => {
    ipfsHttpClient = module;
    createInfuraClient = () => {
      const auth = `Basic ${Buffer.from(
        `${IPFS_CONFIG.infura.projectId}:${IPFS_CONFIG.infura.projectSecret}`
      ).toString('base64')}`;

      return module.create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: auth,
        },
      });
    };
  }).catch(err => {
    console.error('Error importing IPFS client:', err);
  });
}

/**
 * Uploads data to IPFS using the selected service (Pinata or Infura)
 * @param data - The data to upload (can be JSON object or file)
 * @param options - Optional metadata and pinning options
 * @returns IPFS CID
 */
export async function uploadToIPFS(data: unknown, options: UploadOptions = {}): Promise<string> {
  // Check if we're in a browser environment
  if (!isBrowser) {
    throw new Error('IPFS upload is only available in browser environment');
  }

  const service = options.service || IPFS_CONFIG.defaultService;
  
  try {
    console.log(`Uploading to IPFS using ${service} service`);
    
    if (service === 'pinata') {
      return await uploadToPinata(data, options);
    } else if (service === 'infura') {
      return await uploadToInfura(data, options);
    } else {
      throw new Error(`Unsupported IPFS service: ${service}`);
    }
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Uploads data to IPFS via Pinata
 */
async function uploadToPinata(data: unknown, options: UploadOptions): Promise<string> {
  const apiKey = IPFS_CONFIG.pinata.apiKey;
  const secretApiKey = IPFS_CONFIG.pinata.secretApiKey;
  
  console.log('Pinata API Key:', apiKey);
  console.log('Pinata Secret API Key:', secretApiKey ? secretApiKey.substring(0, 5) + '...' : 'not set');
  
  if (!apiKey || !secretApiKey) {
    throw new Error('Pinata API keys not configured');
  }
  
  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
  
  let jsonData: Record<string, unknown>;
  
  // Handle different types of data
  if (data instanceof File || data instanceof Blob) {
    // For File/Blob, we need to read it and convert to base64
    const base64Data = await readFileAsBase64(data);
    jsonData = {
      name: data instanceof File ? data.name : 'blob',
      size: data.size,
      type: data instanceof File ? data.type : 'application/octet-stream',
      content: base64Data
    };
  } else if (typeof data === 'string') {
    // For string data
    jsonData = { content: data };
  } else {
    // For JSON data
    jsonData = data as Record<string, unknown>;
  }
  
  // Add metadata if provided
  if (options.metadata) {
    jsonData = {
      ...jsonData,
      metadata: options.metadata
    };
  }
  
  const pinataOptions = {
    pinataMetadata: {
      name: options.metadata?.name as string || 'MediDrop Data',
    },
    pinataOptions: options.pinataOptions || {
      cidVersion: 1
    }
  };
  
  try {
    console.log('Sending request to Pinata...');
    const response = await axios.post(url, 
      { 
        pinataContent: jsonData,
        ...pinataOptions
      }, 
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secretApiKey
        }
      }
    );
    
    console.log('Pinata response:', response.status, response.statusText);
    const responseData = response.data as PinataResponse;
    return responseData.IpfsHash;
  } catch (error: any) {
    console.error('Error in Pinata upload:', error);
    if (error && error.response) {
      console.error('Pinata response:', error.response.status, error.response.data);
    }
    throw new Error(`Failed to upload to Pinata: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Uploads data to IPFS via Infura
 */
async function uploadToInfura(data: unknown, options: UploadOptions): Promise<string> {
  if (!isBrowser || !createInfuraClient) {
    throw new Error('IPFS client not initialized. This function is only available in the browser.');
  }

  try {
    const client = createInfuraClient();
    
    let result: IPFSResult;
    
    if (data instanceof File || data instanceof Blob) {
      // For File/Blob
      const buffer = await readFileAsArrayBuffer(data);
      result = await client.add(buffer) as IPFSResult;
    } else if (typeof data === 'string') {
      // For string data
      result = await client.add(data) as IPFSResult;
    } else {
      // For JSON data
      const jsonString = JSON.stringify(data);
      result = await client.add(jsonString) as IPFSResult;
    }
    
    return result.path;
  } catch (error) {
    console.error('Error uploading to Infura IPFS:', error);
    throw error;
  }
}

/**
 * Fetches data from IPFS
 * @param cid - The IPFS CID to fetch
 * @param customGateway - Optional custom gateway URL to use
 * @returns The data from IPFS
 */
export async function fetchFromIPFS<T = unknown>(cid: string, customGateway?: string): Promise<T> {
  // Check if we're in a browser environment
  if (!isBrowser) {
    throw new Error('IPFS fetch is only available in browser environment');
  }
  
  console.log('🌐 IPFS: Starting fetch for CID:', cid);
  
  // Handle demo CIDs for testing
  if (cid === "QmDemo1234567890abcdefghijklmnopqrstuvwxyz") {
    console.log('🌐 IPFS: Using demo IPFS data for CID:', cid);
    const demoRecord = {
      patientAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      recordType: "Blood Test",
      date: new Date().toISOString(),
      provider: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
      doctorName: "Dr. Smith",
      facilityName: "Demo Hospital",
      results: "All values within normal range. Glucose: 95 mg/dL, Cholesterol: 180 mg/dL",
      notes: "Patient is healthy. Recommend annual checkup."
    };
    
    // Return the data in the format the frontend expects (as a string for decryption)
    const demoData = Buffer.from(JSON.stringify(demoRecord)).toString('base64');
    return demoData as T;
  }
  
  try {
    console.log(`🌐 IPFS: Fetching real IPFS data for CID: ${cid}`);
    
    // For real IPFS CIDs, try multiple gateways
    const gateways = [
      'https://dweb.link/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ];
    
    const gatewayToUse = customGateway || gateways[0];
    let url = gatewayToUse;
    
    // Make sure the URL ends with a slash if it doesn't already
    if (!url.endsWith('/')) {
      url += '/';
    }
    
    // Make sure we're not duplicating 'ipfs/' in the URL
    if (url.endsWith('ipfs/')) {
      url += cid;
    } else {
      url += `ipfs/${cid}`;
    }
    
    console.log(`🌐 IPFS: Using gateway URL: ${url}`);
    
    // Try the primary gateway first
    try {
      console.log('🌐 IPFS: Attempting primary gateway fetch...');
      const response = await axios.get<T>(url, { timeout: 10000 });
      console.log('🌐 IPFS: Successfully fetched from primary gateway');
      console.log('🌐 IPFS: Response status:', response.status);
      console.log('🌐 IPFS: Response headers:', response.headers);
      console.log('🌐 IPFS: Response data type:', typeof response.data);
      console.log('🌐 IPFS: Response data sample:', JSON.stringify(response.data).substring(0, 200));
      return response.data;
    } catch (primaryError) {
      console.warn('🌐 IPFS: Primary gateway failed, trying alternatives...', primaryError);
      
      // Try alternative gateways for real IPFS CIDs
      for (let i = 1; i < gateways.length; i++) {
        try {
          const altUrl = gateways[i] + cid;
          console.log(`🌐 IPFS: Trying alternative gateway ${i}: ${altUrl}`);
          const response = await axios.get<T>(altUrl, { timeout: 10000 });
          console.log(`🌐 IPFS: Successfully fetched from alternative gateway ${i}`);
          console.log('🌐 IPFS: Alt response status:', response.status);
          console.log('🌐 IPFS: Alt response data type:', typeof response.data);
          return response.data;
        } catch (altError) {
          console.warn(`🌐 IPFS: Alternative gateway ${i} failed:`, altError);
          continue;
        }
      }
      
      // If all gateways fail, throw the original error
      throw primaryError;
    }
  } catch (error) {
    console.error('🌐 IPFS: Error fetching from IPFS:', error);
    console.error('🌐 IPFS: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw new Error(`Failed to fetch from IPFS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Try multiple IPFS gateways to fetch a CID
 * @param cid - The IPFS CID to fetch
 * @returns The data from IPFS
 */
export async function tryMultipleGateways<T = unknown>(cid: string): Promise<T> {
  console.log('🌐 IPFS: Trying multiple gateways for CID:', cid);
  
  // List of public gateways to try
  const gateways = [
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://ipfs.fleek.co/ipfs/',
    'https://ipfs.infura.io/ipfs/'
  ];
  
  let lastError;
  
  // Try each gateway in sequence
  for (let i = 0; i < gateways.length; i++) {
    try {
      console.log(`🌐 IPFS: Trying gateway ${i+1}/${gateways.length}: ${gateways[i]}`);
      const url = gateways[i] + cid;
      
      const response = await axios.get<T>(url, { 
        timeout: 5000,  // Shorter timeout to try more gateways faster
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });
      
      console.log(`🌐 IPFS: Success with gateway ${i+1}!`);
      return response.data;
    } catch (error) {
      console.warn(`🌐 IPFS: Gateway ${i+1} failed:`, error);
      lastError = error;
      // Continue to next gateway
    }
  }
  
  // If we get here, all gateways failed
  console.error('🌐 IPFS: All gateways failed');
  throw lastError || new Error('All IPFS gateways failed');
}

/**
 * Helper function to read a file as base64
 */
function readFileAsBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Extract the base64 data part (remove the prefix)
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Helper function to read a file as ArrayBuffer
 */
function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Encrypts data using AES-GCM
 * @param data - The data to encrypt
 * @param key - The encryption key
 * @returns The encrypted data as a base64 string
 */
export async function encryptData(data: unknown, key: CryptoKey): Promise<string> {
  try {
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Convert data to string if it's not already
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Encode the data as UTF-8
    const encodedData = new TextEncoder().encode(dataString);
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encodedData
    );
    
    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES-GCM
 * @param encryptedData - The encrypted data as a base64 string
 * @param key - The decryption key
 * @returns The decrypted data
 */
export async function decryptData<T = unknown>(encryptedData: string, key: CryptoKey): Promise<T> {
  console.log('🔐 DECRYPT: Starting decryption process');
  
  try {
    // 1. First, try to decode as simple base64 (for demo data)
    try {
      const decoded = atob(encryptedData);
      
      // Check if it's JSON data (demo data)
      if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
        console.log('🔐 DECRYPT: Demo data detected - using simple base64 decoding');
        return JSON.parse(decoded) as T;
      }
    } catch (e) {
      // Not simple base64 or not JSON, continue with decryption
      console.log('🔐 DECRYPT: Not simple JSON in base64, continuing with decryption');
    }

    // 2. Convert the base64 encrypted data to Uint8Array
    let encryptedBytes;
    try {
      encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      console.log('🔐 DECRYPT: Converted base64 to bytes, length:', encryptedBytes.length);
    } catch (error) {
      console.error('🔐 DECRYPT: Failed to convert base64 to bytes:', error);
      throw new Error('Invalid base64 data');
    }
    
    // 3. Extract the IV (first 12 bytes) and the encrypted content
    if (encryptedBytes.length <= 12) {
      throw new Error('Encrypted data too short');
    }
    
    const iv = encryptedBytes.slice(0, 12);
    const encrypted = encryptedBytes.slice(12);
    
    // 4. Decrypt the data
    let decrypted;
    try {
      decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
    } catch (error) {
      console.error('🔐 DECRYPT: Web Crypto API decrypt failed:', error);
      throw new Error('Decryption failed - incorrect key or corrupted data');
    }
    
    // 5. Convert back to string and parse JSON
    const decryptedString = new TextDecoder().decode(decrypted);
    
    try {
      const parsedData = JSON.parse(decryptedString);
      console.log('🔐 DECRYPT: Successfully parsed decrypted data');
      return parsedData as T;
    } catch (jsonError) {
      console.warn('🔐 DECRYPT: JSON parsing failed, returning as string:', jsonError);
      // Return the string if it's not JSON
      return decryptedString as unknown as T;
    }
  } catch (error) {
    console.error('🔐 DECRYPT: Error during decryption:', error);
    throw new Error(`Failed to decrypt data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a cryptographic key from a password/passphrase
 * For blockchain applications, this is typically an Ethereum address
 * @param password The password/passphrase to generate a key from
 * @returns A CryptoKey for encryption/decryption
 */
export async function generateKeyFromPassword(password: string): Promise<CryptoKey> {
  // Always normalize to lowercase for consistency
  const normalizedPassword = password.toLowerCase();
  console.log('🔑 KEY: Original password:', password);
  console.log('🔑 KEY: Normalized password:', normalizedPassword);
  
  // Convert password to buffer
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(normalizedPassword);
  
  // Generate a key from the password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Use a salt (in a real app, you'd want to store this securely)
  const salt = encoder.encode('MediDrop Salt');
  
  // Derive the actual key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  console.log('🔑 KEY: Successfully generated crypto key');
  return derivedKey;
} 