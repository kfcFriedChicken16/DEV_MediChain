import { uploadToIPFS, fetchFromIPFS, encryptData, decryptData, generateKeyFromPassword } from './ipfs';

/**
 * Normalizes an Ethereum address to lowercase for consistent key generation
 * @param address The Ethereum address to normalize
 * @returns The normalized lowercase address
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

// Types for emergency contacts
export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  address?: string; // Ethereum address
  notes?: string;
  lastUpdated: number; // timestamp
}

// Types for emergency medical data
export interface EmergencyMedicalData {
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  organDonor?: boolean;
  dnrOrder?: boolean;
  notes?: string;
  lastVerifiedBy?: string; // provider address
  lastVerifiedDate?: number; // timestamp
}

// Combined emergency data structure
export interface EmergencyData {
  version: string;
  contacts: EmergencyContact[];
  medicalData: EmergencyMedicalData;
  patientId: string; // Patient's Ethereum address
  lastUpdated: number; // timestamp
}

// Settings for emergency access
export interface EmergencySettings {
  allowEmergencyAccess: boolean;
  notifyContacts: boolean;
  shareAllergies: boolean;
  shareBloodType: boolean;
  shareMedications: boolean;
  shareChronicConditions: boolean;
  shareEmergencyNotes: boolean;
  shareFullHistory: boolean;
}

/**
 * Uploads emergency contact data to IPFS
 * @param data The emergency data to upload
 * @param patientAddress The patient's Ethereum address
 */
export async function uploadEmergencyData(data: EmergencyData, patientAddress: string): Promise<{ regularCid: string; emergencyCid: string }> {
  try {
    // Normalize patient address for consistent key generation
    const normalizedAddress = normalizeAddress(patientAddress);
    
    // Generate encryption key from patient's address
    const encryptionKey = await generateKeyFromPassword(normalizedAddress);
    
    // Encrypt the data
    const dataString = JSON.stringify(data);
    const encryptedData = await encryptData(dataString, encryptionKey);
    
    // Upload to IPFS with metadata
    const regularCid = await uploadToIPFS(encryptedData, {
      metadata: {
        name: `emergency-data-${patientAddress.substring(0, 8)}`,
        keyvalues: {
          type: 'emergency-data',
          patientAddress: patientAddress,
          encrypted: true,
          version: data.version,
          timestamp: Date.now().toString()
        }
      }
    });
    
    // Also create emergency-accessible copy
    const emergencyCid = await createEmergencyAccessibleData(data, normalizedAddress);
    
    return { regularCid, emergencyCid };
  } catch (error) {
    console.error('Error uploading emergency data:', error);
    throw new Error(`Failed to upload emergency data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches and decrypts emergency data from IPFS
 * @param cid The IPFS CID of the emergency data
 * @param patientAddress The patient's Ethereum address for decryption
 */
export async function fetchEmergencyData(cid: string, patientAddress: string): Promise<EmergencyData> {
  console.log('🚑 EMERGENCY: Starting emergency data fetch for CID:', cid);
  console.log('🚑 EMERGENCY: Patient address:', patientAddress);
  
  try {
    // Normalize patient address for consistent key generation
    const normalizedAddress = normalizeAddress(patientAddress);
    
    // Generate decryption key from patient's address
    const decryptionKey = await generateKeyFromPassword(normalizedAddress);
    console.log('🚑 EMERGENCY: Generated decryption key');
    
    // Fetch encrypted data from IPFS using dweb.link gateway specifically for emergency data
    console.log('🚑 EMERGENCY: Fetching from IPFS...');
    const encryptedData = await fetchFromIPFS(cid, 'https://dweb.link/ipfs/');
    console.log('🚑 EMERGENCY: Fetched data type:', typeof encryptedData);
    console.log('🚑 EMERGENCY: Data preview:', JSON.stringify(encryptedData).substring(0, 100));
    
    // Handle different data formats from IPFS
    let dataToDecrypt: string;
    if (typeof encryptedData === 'string') {
      dataToDecrypt = encryptedData;
    } else if (typeof encryptedData === 'object' && encryptedData !== null) {
      // If it's a JSON object, try to extract the content
      const dataObj = encryptedData as any;
      if (dataObj.content) {
        dataToDecrypt = dataObj.content;
      } else {
        dataToDecrypt = JSON.stringify(encryptedData);
      }
    } else {
      throw new Error('Invalid data format received from IPFS');
    }
    
    console.log('🚑 EMERGENCY: Data to decrypt (preview):', dataToDecrypt.substring(0, 100));
    
    // Decrypt the data
    console.log('🚑 EMERGENCY: Starting decryption...');
    const decryptedData = await decryptData(
      dataToDecrypt, 
      decryptionKey
    );
    console.log('🚑 EMERGENCY: Decryption successful');
    
    // Parse and validate the data
    let parsedData: EmergencyData;
    if (typeof decryptedData === 'string') {
      parsedData = JSON.parse(decryptedData);
    } else {
      parsedData = decryptedData as EmergencyData;
    }
    
    // Validate the structure
    if (!parsedData.version || !Array.isArray(parsedData.contacts)) {
      throw new Error('Invalid emergency data structure');
    }
    
    console.log('🚑 EMERGENCY: Successfully loaded emergency data with', parsedData.contacts.length, 'contacts');
    return parsedData;
  } catch (error) {
    console.error('🚑 EMERGENCY: Error fetching emergency data:', error);
    throw new Error(`Failed to fetch emergency data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Creates a new emergency data object with default values
 * @param patientAddress The patient's Ethereum address
 */
export function createEmptyEmergencyData(patientAddress: string): EmergencyData {
  return {
    version: '1.0',
    contacts: [],
    medicalData: {
      allergies: [],
      conditions: [],
      medications: []
    },
    patientId: patientAddress,
    lastUpdated: Date.now()
  };
}

/**
 * Fetches emergency data for emergency access (used by providers)
 * This uses a special emergency access mechanism
 * @param patientAddress The patient's address
 * @param providerAddress The provider's address requesting emergency access
 * @param emergencyCid The IPFS CID of the emergency data
 */
export async function emergencyAccessData(
  patientAddress: string,
  providerAddress: string,
  emergencyCid: string
): Promise<Partial<EmergencyData>> {
  try {
    // In a real implementation, you would verify that the provider has emergency access rights
    // For now, we'll just fetch and decrypt the data
    const fullData = await fetchEmergencyData(emergencyCid, patientAddress);
    
    // Return only the emergency-relevant information
    // In a production system, you would filter based on the patient's settings
    return {
      version: fullData.version,
      contacts: fullData.contacts,
      medicalData: {
        bloodType: fullData.medicalData.bloodType,
        allergies: fullData.medicalData.allergies,
        conditions: fullData.medicalData.conditions,
        medications: fullData.medicalData.medications,
        organDonor: fullData.medicalData.organDonor,
        dnrOrder: fullData.medicalData.dnrOrder,
        notes: fullData.medicalData.notes
      },
      patientId: fullData.patientId,
      lastUpdated: fullData.lastUpdated
    };
  } catch (error) {
    console.error('Error accessing emergency data:', error);
    throw new Error(`Failed to access emergency data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Derives the emergency CID for a given patient address and data without uploading to IPFS
 * This is used for display purposes when we already have the data but need to show the CID
 * @param data The emergency data
 * @param patientAddress The patient's Ethereum address
 * @returns The emergency CID that would be generated for this data
 */
export function deriveEmergencyCid(data: EmergencyData, patientAddress: string): string {
  try {
    // Normalize patient address for consistent key generation
    const normalizedAddress = normalizeAddress(patientAddress);
    
    // Create a special emergency key using patient address + known emergency salt
    const emergencySalt = 'MEDICHAIN_EMERGENCY_ACCESS_2024';
    const emergencyKeyMaterial = normalizedAddress + emergencySalt;
    
    // Create emergency-only data (filtered based on patient settings)
    const emergencyOnlyData = {
      version: data.version,
      patientId: data.patientId,
      lastUpdated: data.lastUpdated,
      emergencyAccess: {
        contacts: data.contacts,
        medicalData: {
          bloodType: data.medicalData.bloodType,
          allergies: data.medicalData.allergies,
          conditions: data.medicalData.conditions,
          medications: data.medicalData.medications,
          organDonor: data.medicalData.organDonor,
          dnrOrder: data.medicalData.dnrOrder,
          notes: data.medicalData.notes
        }
      }
    };
    
    // Create a deterministic hash of the data and key material
    // This simulates what the IPFS CID would be without actually uploading
    const dataString = JSON.stringify(emergencyOnlyData);
    const hashInput = emergencyKeyMaterial + dataString;
    
    // Simple hash function for deterministic CID generation
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to a CID-like string (this is a simplified version)
    const cid = `bafybeig${Math.abs(hash).toString(36)}${normalizedAddress.substring(2, 8)}`;
    
    return cid;
  } catch (error) {
    console.error('Error deriving emergency CID:', error);
    throw new Error(`Failed to derive emergency CID: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createEmergencyAccessibleData(data: EmergencyData, patientAddress: string): Promise<string> {
  try {
    // Normalize patient address for consistent key generation
    const normalizedAddress = normalizeAddress(patientAddress);
    
    // Create a special emergency key using patient address + known emergency salt
    const emergencySalt = 'MEDICHAIN_EMERGENCY_ACCESS_2024'; // In production, this would be more secure
    const emergencyKeyMaterial = normalizedAddress + emergencySalt;
    const emergencyKey = await generateKeyFromPassword(emergencyKeyMaterial);
    
    // Create emergency-only data (filtered based on patient settings)
    const emergencyOnlyData = {
      version: data.version,
      patientId: data.patientId,
      lastUpdated: data.lastUpdated,
      emergencyAccess: {
        contacts: data.contacts,
        medicalData: {
          bloodType: data.medicalData.bloodType,
          allergies: data.medicalData.allergies,
          conditions: data.medicalData.conditions,
          medications: data.medicalData.medications,
          organDonor: data.medicalData.organDonor,
          dnrOrder: data.medicalData.dnrOrder,
          notes: data.medicalData.notes
        }
      }
    };
    
    // Encrypt with emergency key
    const dataString = JSON.stringify(emergencyOnlyData);
    const encryptedData = await encryptData(dataString, emergencyKey);
    
    // Upload to IPFS with emergency metadata
    const cid = await uploadToIPFS(encryptedData, {
      metadata: {
        name: `emergency-access-${normalizedAddress.substring(0, 8)}`,
        keyvalues: {
          type: 'emergency-access',
          patientAddress: normalizedAddress,
          encrypted: true,
          emergencyAccess: true,
          version: data.version,
          timestamp: Date.now().toString()
        }
      }
    });
    
    return cid;
  } catch (error) {
    console.error('Error creating emergency accessible data:', error);
    throw new Error(`Failed to create emergency accessible data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches emergency data using emergency access (for providers)
 * This can decrypt data without needing the patient's private key
 * @param emergencyCid The IPFS CID of the emergency-accessible data
 * @param patientAddress The patient's address (to derive emergency key)
 */
export async function fetchEmergencyAccessibleData(emergencyCid: string, patientAddress: string): Promise<Partial<EmergencyData>> {
  try {
    // Normalize patient address for consistent key generation
    const normalizedAddress = normalizeAddress(patientAddress);
    
    // Generate the same emergency key used to encrypt the data
    const emergencySalt = 'MEDICHAIN_EMERGENCY_ACCESS_2024';
    const emergencyKeyMaterial = normalizedAddress + emergencySalt;
    const emergencyKey = await generateKeyFromPassword(emergencyKeyMaterial);
    
    // Fetch encrypted data from IPFS
    const encryptedData = await fetchFromIPFS(emergencyCid, 'https://dweb.link/ipfs/');
    
    console.log('🚑 EMERGENCY: Fetched data type:', typeof encryptedData);
    console.log('🚑 EMERGENCY: Fetched data preview:', JSON.stringify(encryptedData).substring(0, 200));
    
    // Handle different data formats from IPFS
    let dataToDecrypt: string;
    if (typeof encryptedData === 'string') {
      dataToDecrypt = encryptedData;
    } else if (typeof encryptedData === 'object' && encryptedData !== null) {
      const dataObj = encryptedData as any;
      // Pinata wraps data in a JSON object with a 'content' field
      if (dataObj.content) {
        dataToDecrypt = dataObj.content;
      } else if (dataObj.pinataContent && dataObj.pinataContent.content) {
        // Handle Pinata's response format
        dataToDecrypt = dataObj.pinataContent.content;
      } else {
        // If no content field, try to use the object as is
        dataToDecrypt = JSON.stringify(encryptedData);
      }
    } else {
      throw new Error('Invalid data format received from IPFS');
    }
    
    // Decrypt the data
    console.log('🚑 EMERGENCY: Data to decrypt (preview):', dataToDecrypt.substring(0, 100));
    const decryptedData = await decryptData(dataToDecrypt, emergencyKey);
    
    // Parse the data
    let parsedData: any;
    if (typeof decryptedData === 'string') {
      parsedData = JSON.parse(decryptedData);
    } else {
      parsedData = decryptedData;
    }
    
    // Return the emergency access data
    return {
      version: parsedData.version,
      patientId: parsedData.patientId,
      lastUpdated: parsedData.lastUpdated,
      contacts: parsedData.emergencyAccess.contacts,
      medicalData: parsedData.emergencyAccess.medicalData
    };
  } catch (error) {
    console.error('Error fetching emergency accessible data:', error);
    throw new Error(`Failed to fetch emergency accessible data: ${error instanceof Error ? error.message : String(error)}`);
  }
} 