// Types for doctor access request system

export interface AccessRequest {
  id: string;
  doctor: string;
  patient: string;
  requestedRecords: string[];
  reason: string;
  requestedDuration: number; // in seconds
  timestamp: number;
  approved: boolean;
}

export interface ApprovedAccess {
  authorizedRecords: string[];
  expiresAt: number; // timestamp
  sharedDataCid: string;
  exists: boolean;
}

export interface DoctorAccessDetails {
  doctor: string;
  patient: string;
  authorizedRecords: string[];
  expiresAt: number;
  sharedDataCid: string;
  exists: boolean;
}

// Duration options for access requests
export const DURATION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
] as const;

// Helper functions
export function formatDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days === 30) return '1 month';
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} year${Math.round(days / 365) > 1 ? 's' : ''}`;
}

export function formatExpiryDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
}

export function isAccessExpired(expiresAt: number): boolean {
  return Date.now() / 1000 > expiresAt;
}

export function getTimeUntilExpiry(expiresAt: number): string {
  const now = Date.now() / 1000;
  const secondsLeft = expiresAt - now;
  
  if (secondsLeft <= 0) return 'Expired';
  
  const days = Math.floor(secondsLeft / (24 * 60 * 60));
  const hours = Math.floor((secondsLeft % (24 * 60 * 60)) / (60 * 60));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
  
  const minutes = Math.floor((secondsLeft % (60 * 60)) / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''} left`;
}

// Re-encryption functions for doctor access
export async function createDoctorSharedData(
  originalData: any,
  doctorAddress: string,
  authorizedRecords: string[]
): Promise<string> {
  // This would implement the re-encryption logic
  // For now, we'll create a simple filtered version
  const sharedData = {
    version: '1.0',
    doctor: doctorAddress,
    authorizedRecords,
    data: originalData,
    timestamp: Date.now()
  };
  
  // In a real implementation, this would be encrypted with the doctor's public key
  return JSON.stringify(sharedData);
}

export async function decryptDoctorSharedData(
  encryptedData: string,
  doctorAddress: string
): Promise<any> {
  // This would implement the decryption logic for doctor access
  // For now, we'll just parse the JSON
  try {
    return JSON.parse(encryptedData);
  } catch (error) {
    throw new Error('Failed to decrypt shared data');
  }
} 