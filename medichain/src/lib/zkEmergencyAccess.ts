/**
 * Zero-Knowledge Emergency Access System
 * Lightning-fast emergency medical data access using ZK proofs
 */

// Using Web Crypto API for browser compatibility

// ZK Emergency Access Types
export interface EmergencyProofData {
  // Public commitment (visible to everyone)
  commitment: string;
  timestamp: number;
  patientAddress: string;
  version: string;
  
  // ZK Proof components
  proof: {
    pi_a: string;
    pi_b: string;
    pi_c: string;
    publicSignals: string[];
  };
  
  // Encrypted emergency data (small payload)
  encryptedData: {
    bloodType: string;
    allergies: string;
    conditions: string;
    medications: string;
    contacts: string;
    organDonor: string;
    dnrOrder: string;
    notes: string;
  };
}

export interface EmergencyAccessResult {
  valid: boolean;
  patientAddress: string;
  lastUpdated: number;
  emergencyInfo?: {
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
  };
  error?: string;
}

// Fast crypto utilities for ZK emergency access
class ZKEmergencyUtils {
  private static readonly EMERGENCY_SALT = 'MEDICHAIN_ZK_EMERGENCY_2024';
  private static readonly PROOF_SALT = 'MEDICHAIN_ZK_PROOF_VERIFICATION';

  /**
   * Generate a commitment hash for emergency data
   */
  static async generateCommitment(emergencyData: any, patientAddress: string): Promise<string> {
    const dataString = JSON.stringify({
      ...emergencyData,
      patient: patientAddress,
      salt: this.EMERGENCY_SALT
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create a mock ZK proof (for demonstration)
   * In production, this would use a proper ZK library like snarkjs
   */
  static async generateZKProof(commitment: string, secret: string): Promise<{
    pi_a: string;
    pi_b: string;
    pi_c: string;
    publicSignals: string[];
  }> {
    // Mock proof generation (replace with real ZK circuit)
    const proofData = commitment + secret + this.PROOF_SALT;
    const encoder = new TextEncoder();
    const data = encoder.encode(proofData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      pi_a: hash.substring(0, 16),
      pi_b: hash.substring(16, 32),
      pi_c: hash.substring(32, 48),
      publicSignals: [commitment, Date.now().toString()]
    };
  }

  /**
   * Verify ZK proof (ultra-fast verification)
   */
  static async verifyZKProof(proof: any, commitment: string, patientAddress: string): Promise<boolean> {
    try {
      // Mock verification (replace with real ZK verification)
      const secret = patientAddress + this.EMERGENCY_SALT;
      const expectedProof = await this.generateZKProof(commitment, secret);
      
      return (
        proof.pi_a === expectedProof.pi_a &&
        proof.pi_b === expectedProof.pi_b &&
        proof.pi_c === expectedProof.pi_c
      );
    } catch (error) {
      console.error('ZK proof verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypt emergency data for compact storage (simplified for demo)
   */
  static encryptEmergencyData(data: any, key: string): any {
    // Simplified encryption for demo - in production use proper encryption
    const result: any = {};
    
    for (const [field, value] of Object.entries(data)) {
      // Simple base64 encoding with key mixing for demo
      const dataString = JSON.stringify(value);
      const keyMixed = dataString + key + this.EMERGENCY_SALT;
      const encoded = btoa(keyMixed);
      result[field] = encoded;
    }
    
    return result;
  }

  /**
   * Decrypt emergency data (ultra-fast)
   */
  static decryptEmergencyData(encryptedData: any, key: string): any {
    const result: any = {};
    
    try {
      for (const [field, encryptedValue] of Object.entries(encryptedData)) {
        if (typeof encryptedValue === 'string') {
          // Simple base64 decoding for demo
          const decoded = atob(encryptedValue);
          const keyMixed = key + this.EMERGENCY_SALT;
          const dataString = decoded.replace(keyMixed, '');
          
          // Extract the original data
          const originalData = dataString.substring(0, dataString.length - keyMixed.length);
          
          try {
            result[field] = JSON.parse(originalData);
          } catch {
            // If parsing fails, use the string as-is
            result[field] = originalData;
          }
        }
      }
      return result;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt emergency data');
    }
  }
}

/**
 * Generate ZK Emergency Proof Package
 * This replaces the slow IPFS upload process
 */
export async function generateEmergencyProof(
  emergencyData: any,
  patientAddress: string
): Promise<EmergencyProofData> {
  try {
    console.log('🔐 Generating ZK emergency proof...');
    const startTime = Date.now();

    // 1. Create commitment hash
    const commitment = await ZKEmergencyUtils.generateCommitment(emergencyData, patientAddress);
    
    // 2. Generate ZK proof
    const secret = patientAddress + ZKEmergencyUtils['EMERGENCY_SALT'];
    const zkProof = await ZKEmergencyUtils.generateZKProof(commitment, secret);
    
    // 3. Encrypt emergency data (compact format)
    const emergencyKey = patientAddress + '_emergency_key';
    const encryptedData = ZKEmergencyUtils.encryptEmergencyData({
      bloodType: emergencyData.medicalData.bloodType || 'Unknown',
      allergies: emergencyData.medicalData.allergies || [],
      conditions: emergencyData.medicalData.conditions || [],
      medications: emergencyData.medicalData.medications || [],
      contacts: emergencyData.contacts || [],
      organDonor: emergencyData.medicalData.organDonor || false,
      dnrOrder: emergencyData.medicalData.dnrOrder || false,
      notes: emergencyData.medicalData.notes || ''
    }, emergencyKey);

    const proofPackage: EmergencyProofData = {
      commitment,
      timestamp: Date.now(),
      patientAddress,
      version: '1.0.0',
      proof: zkProof,
      encryptedData
    };

    const endTime = Date.now();
    console.log(`✅ ZK proof generated in ${endTime - startTime}ms`);

    return proofPackage;
  } catch (error) {
    console.error('Error generating emergency proof:', error);
    throw new Error(`Failed to generate emergency proof: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ultra-fast emergency access using ZK proof
 * This replaces the slow IPFS fetch + decrypt process
 */
export async function accessEmergencyDataFast(
  proofPackage: EmergencyProofData,
  emergencyKey?: string
): Promise<EmergencyAccessResult> {
  try {
    console.log('⚡ Fast emergency access starting...');
    const startTime = Date.now();

    // 1. Verify ZK proof (ultra-fast - no blockchain calls)
    const isValidProof = await ZKEmergencyUtils.verifyZKProof(
      proofPackage.proof,
      proofPackage.commitment,
      proofPackage.patientAddress
    );

    if (!isValidProof) {
      return {
        valid: false,
        patientAddress: proofPackage.patientAddress,
        lastUpdated: proofPackage.timestamp,
        error: 'Invalid ZK proof - data may be tampered with'
      };
    }

    // 2. Decrypt emergency data (ultra-fast - small payload)
    const decryptionKey = emergencyKey || (proofPackage.patientAddress + '_emergency_key');
    const decryptedData = ZKEmergencyUtils.decryptEmergencyData(
      proofPackage.encryptedData,
      decryptionKey
    );

    const endTime = Date.now();
    console.log(`✅ Emergency access completed in ${endTime - startTime}ms`);

    return {
      valid: true,
      patientAddress: proofPackage.patientAddress,
      lastUpdated: proofPackage.timestamp,
      emergencyInfo: {
        bloodType: decryptedData.bloodType,
        allergies: Array.isArray(decryptedData.allergies) ? decryptedData.allergies : [],
        conditions: Array.isArray(decryptedData.conditions) ? decryptedData.conditions : [],
        medications: Array.isArray(decryptedData.medications) ? decryptedData.medications : [],
        contacts: Array.isArray(decryptedData.contacts) ? decryptedData.contacts : [],
        organDonor: !!decryptedData.organDonor,
        dnrOrder: !!decryptedData.dnrOrder,
        notes: decryptedData.notes || ''
      }
    };
  } catch (error) {
    console.error('Error in fast emergency access:', error);
    return {
      valid: false,
      patientAddress: proofPackage.patientAddress,
      lastUpdated: proofPackage.timestamp,
      error: `Emergency access failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generate Emergency QR Code Data
 * This creates a minimal QR code with just essential identifiers
 */
export function generateEmergencyQRData(proofPackage: EmergencyProofData): string {
  // Minimal QR data - just enough to identify the emergency record
  const qrData = `MC:${proofPackage.patientAddress.substring(2, 12)}:${proofPackage.commitment.substring(0, 8)}:${Math.floor(proofPackage.timestamp / 1000)}`;
  
  return qrData;
}

/**
 * Parse Emergency QR Code Data
 */
export function parseEmergencyQRData(qrString: string): { patientId: string; commitmentId: string; timestamp: number } {
  try {
    const parts = qrString.split(':');
    if (parts.length !== 4 || parts[0] !== 'MC') {
      throw new Error('Invalid QR format');
    }
    
    return {
      patientId: '0x' + parts[1],
      commitmentId: parts[2],
      timestamp: parseInt(parts[3]) * 1000
    };
  } catch (error) {
    throw new Error('Invalid QR code format');
  }
}

/**
 * Emergency Access Speed Test
 */
export async function speedTestComparison(emergencyData: any, patientAddress: string) {
  console.log('🏁 Starting speed test comparison...');
  
  // Test ZK Proof method
  const zkStartTime = Date.now();
  const proofPackage = await generateEmergencyProof(emergencyData, patientAddress);
  const zkGenerationTime = Date.now() - zkStartTime;
  
  const zkAccessStartTime = Date.now();
  const zkResult = await accessEmergencyDataFast(proofPackage);
  const zkAccessTime = Date.now() - zkAccessStartTime;
  
  console.log(`🔐 ZK Method: ${zkGenerationTime}ms generation + ${zkAccessTime}ms access = ${zkGenerationTime + zkAccessTime}ms total`);
  
  return {
    zkMethod: {
      generation: zkGenerationTime,
      access: zkAccessTime,
      total: zkGenerationTime + zkAccessTime,
      success: zkResult.valid
    }
  };
}

export default {
  generateEmergencyProof,
  accessEmergencyDataFast,
  generateEmergencyQRData,
  parseEmergencyQRData,
  speedTestComparison
};