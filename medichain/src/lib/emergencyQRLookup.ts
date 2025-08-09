/**
 * Emergency QR Code Lookup System
 * Handles compact QR codes and emergency data retrieval
 */

export interface EmergencyQRData {
  patientId: string;
  commitmentId: string;
  timestamp: number;
}

export interface EmergencyInfo {
  patientAddress: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  contacts: Array<{
    name: string;
    phone: string;
    relation: string;
  }>;
  organDonor: boolean;
  dnrOrder: boolean;
  notes: string;
  lastUpdated: number;
}

// Simple localStorage store - direct key mapping as ChatGPT suggested
class PersistentEmergencyStore {

  set(key: string, value: EmergencyInfo): void {
    try {
      console.log('💾 STORAGE ATTEMPT (direct key):', { key, value });
      
      // ChatGPT's recommendation: use the key directly
      const storageKey = `medichain_emergency_${key}`;
      const jsonString = JSON.stringify(value);
      
      console.log('💾 Storage key:', storageKey);
      console.log('💾 JSON string to store:', jsonString);
      
      localStorage.setItem(storageKey, jsonString);
      console.log('💾 Successfully stored in localStorage with direct key');
      
      // ChatGPT's debugging step 1: Dump all keys right after storage
      console.log("💾 STORED KEYS (exact strings):", Object.keys(localStorage));
      console.log("💾 Keys that start with 'medichain_emergency_':", 
        Object.keys(localStorage).filter(k => k.startsWith('medichain_emergency_')));
      
      // Verify storage worked
      const verification = localStorage.getItem(storageKey);
      console.log('💾 VERIFICATION - what was actually stored:', verification);
      console.log('💾 Storage key we used:', JSON.stringify(storageKey));
      console.log('💾 Storage key length:', storageKey.length);
    } catch (error) {
      console.error('❌ Failed to store in localStorage:', error);
    }
  }

  get(key: string): EmergencyInfo | undefined {
    try {
      const storageKey = `medichain_emergency_${key}`;
      console.log('📖 LOOKING UP with direct key:', storageKey);
      console.log('📖 Lookup key we are using:', JSON.stringify(storageKey));
      console.log('📖 Lookup key length:', storageKey.length);
      
      // ChatGPT's debugging: Show all available keys to compare
      const allKeys = Object.keys(localStorage);
      console.log("📖 ALL AVAILABLE KEYS:", allKeys);
      console.log("📖 Emergency keys available:", 
        allKeys.filter(k => k.startsWith('medichain_emergency_')));
      
      // Try exact match first
      const rawData = localStorage.getItem(storageKey);
      console.log('📖 Raw data from localStorage (exact match):', rawData);
      
      if (!rawData) {
        console.log('❌ EXACT MATCH FAILED for key:', storageKey);
        
        // ChatGPT's suggestion: Try scanning for prefix match
        const prefix = `medichain_emergency_${key}`;
        const matchingKey = allKeys.find(k => k.startsWith(prefix));
        console.log('📖 Trying prefix match for:', prefix);
        console.log('📖 Found matching key:', matchingKey);
        
        if (matchingKey) {
          const prefixData = localStorage.getItem(matchingKey);
          console.log('📖 Data from prefix match:', prefixData);
          if (prefixData) {
            const result = JSON.parse(prefixData);
            console.log('✅ SUCCESS via prefix match:', result);
            return result;
          }
        }
        
        return undefined;
      }
      
      const result = JSON.parse(rawData);
      console.log('✅ SUCCESS via exact match:', result);
      return result;
    } catch (error) {
      console.error('Failed to retrieve from localStorage:', error);
      return undefined;
    }
  }

  get size(): number {
    try {
      // Count medichain_emergency_ keys
      const count = Object.keys(localStorage).filter(k => k.startsWith('medichain_emergency_')).length;
      return count;
    } catch (error) {
      return 0;
    }
  }

  keys(): string[] {
    try {
      // Return just the lookup keys (without the prefix)
      return Object.keys(localStorage)
        .filter(k => k.startsWith('medichain_emergency_'))
        .map(k => k.replace('medichain_emergency_', ''));
    } catch (error) {
      return [];
    }
  }

  entries(): [string, EmergencyInfo][] {
    try {
      const entries: [string, EmergencyInfo][] = [];
      const keys = this.keys();
      for (const key of keys) {
        const data = this.get(key);
        if (data) {
          entries.push([key, data]);
        }
      }
      return entries;
    } catch (error) {
      return [];
    }
  }

  clear(): void {
    try {
      // Clear all medichain_emergency_ keys
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('medichain_emergency_'));
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('🗑️ Cleared localStorage emergency data:', keysToRemove);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  // Debug method to inspect all localStorage keys
  debugLocalStorage(): void {
    console.log('🔍 ALL LOCALSTORAGE KEYS:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        console.log(`🔑 Key: "${key}" → Value: ${value?.substring(0, 100)}...`);
      }
    }
  }
}

const emergencyDataStore = new PersistentEmergencyStore();

/**
 * Store emergency data for QR lookup
 */
export function storeEmergencyData(patientAddress: string, emergencyInfo: EmergencyInfo): string {
  const lookupKey = generateLookupKey(patientAddress);
  
  console.log('🏪 BEFORE STORAGE:');
  console.log('🏪 About to store NEW data:', emergencyInfo);
  console.log('🏪 Patient address:', patientAddress);
  console.log('🏪 Generated lookup key:', lookupKey);
  
  emergencyDataStore.set(lookupKey, emergencyInfo);
  
  // IMMEDIATE VERIFICATION - check what was actually stored
  const verification = emergencyDataStore.get(lookupKey);
  console.log('🏪 IMMEDIATE VERIFICATION - what was stored:');
  console.log('🏪 Retrieved data:', verification);
  console.log('🏪 Blood type stored:', verification?.bloodType);
  console.log('🏪 Allergies stored:', verification?.allergies);
  console.log('🏪 Last updated stored:', verification?.lastUpdated);
  
  console.log('🏪 Store size after storage:', emergencyDataStore.size);
  console.log('🏪 All keys in store:', Array.from(emergencyDataStore.keys()));
  
  return lookupKey;
}

/**
 * Generate a lookup key from patient address
 */
export function generateLookupKey(patientAddress: string): string {
  return patientAddress.substring(2, 10); // Use 8 characters after "0x"
}

/**
 * Quick emergency access from QR data
 */
export async function quickEmergencyAccess(qrData: EmergencyQRData): Promise<{
  valid: boolean;
  emergencyInfo?: EmergencyInfo;
  error?: string;
}> {
  try {
    console.log('⚡ Quick emergency access starting...');
    const startTime = Date.now();

    // Look up emergency data using patient ID
    const lookupKey = qrData.patientId.substring(2); // Remove 0x prefix
    
    // COMPREHENSIVE DEBUGGING
    console.log('🔍 DEBUGGING LOOKUP:');
    console.log('🔍 Original QR data:', qrData);
    console.log('🔍 Patient ID from QR:', qrData.patientId);
    console.log('🔍 Lookup key (after substring):', lookupKey);
    console.log('🔍 Store size:', emergencyDataStore.size);
    console.log('🔍 Available keys in store:', Array.from(emergencyDataStore.keys()));
    console.log('🔍 Store contents:', Array.from(emergencyDataStore.entries()));
    
    // Debug all localStorage keys to find the issue
    emergencyDataStore.debugLocalStorage();
    
    // DIRECT localStorage check bypassing our class
    console.log('🔍 DIRECT localStorage check:');
    const directCheck = localStorage.getItem('medichain_emergency_data');
    console.log('🔍 Direct localStorage.getItem result:', directCheck);
    
    if (directCheck) {
      try {
        const parsed = JSON.parse(directCheck);
        console.log('🔍 Direct parsed data:', parsed);
        console.log('🔍 Direct lookup for key "' + lookupKey + '":', parsed[lookupKey]);
        
        // If we find data directly, use it
        if (parsed[lookupKey]) {
          console.log('✅ Found data via direct access!');
          const directResult = parsed[lookupKey];
          
          return {
            valid: true,
            emergencyInfo: directResult
          };
        }
      } catch (parseError) {
        console.error('❌ Failed to parse direct localStorage data:', parseError);
      }
    }
    
    const emergencyInfo = emergencyDataStore.get(lookupKey);
    console.log('🔍 Lookup result:', emergencyInfo);

    if (!emergencyInfo) {
      console.log('❌ NO DATA FOUND - Key mismatch detected!');
      return {
        valid: false,
        error: 'No emergency data found for this patient'
      };
    }

    // Verify timestamp is recent (within 1 year)
    const ageInDays = (Date.now() - qrData.timestamp) / (1000 * 60 * 60 * 24);
    if (ageInDays > 365) {
      return {
        valid: false,
        error: 'Emergency data is too old and may be outdated'
      };
    }

    const endTime = Date.now();
    console.log(`✅ Quick emergency access completed in ${endTime - startTime}ms`);

    return {
      valid: true,
      emergencyInfo
    };
  } catch (error) {
    console.error('Quick emergency access error:', error);
    return {
      valid: false,
      error: `Emergency access failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generate sample emergency data for demo
 */
/**
 * Debug localStorage keys
 */
export function debugEmergencyStorage() {
  emergencyDataStore.debugLocalStorage();
}

export function generateSampleEmergencyData(patientAddress: string): EmergencyInfo {
  return {
    patientAddress,
    bloodType: 'O+',
    allergies: ['Penicillin', 'Shellfish'],
    conditions: ['Diabetes Type 2', 'Hypertension'],
    medications: ['Metformin 500mg', 'Lisinopril 10mg'],
    contacts: [
      {
        name: 'John Doe',
        phone: '+1-555-0123',
        relation: 'Spouse'
      },
      {
        name: 'Jane Smith',
        phone: '+1-555-0456',
        relation: 'Emergency Contact'
      }
    ],
    organDonor: true,
    dnrOrder: false,
    notes: 'Patient is diabetic and requires insulin. Allergic to penicillin.',
    lastUpdated: Date.now()
  };
}