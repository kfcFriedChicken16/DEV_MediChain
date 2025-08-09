// Medical Record Types and Display Utilities

export interface RecordTypeInfo {
  icon: string;
  emoji: string;
  color: string;
  bgColor: string;
  textColor: string;
  category: string;
}

export const RECORD_TYPES: Record<string, RecordTypeInfo> = {
  'Lab Results': {
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A1.998 1.998 0 004 17.073V19a2 2 0 002 2h8a2 2 0 002-2v-1.927a1.997 1.997 0 00-.572-1.645z M9 8a3 3 0 116 0v5H9V8z',
    emoji: '🩺',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    category: 'diagnostic'
  },
  'Imaging': {
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    emoji: '📸',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    category: 'diagnostic'
  },
  'Prescription': {
    icon: 'M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 011 1v2a1 1 0 01-1 1h-1v9a3 3 0 01-3 3H8a3 3 0 01-3-3V8H4a1 1 0 01-1-1V5a1 1 0 011-1h3zM9 8v8h2V8H9zm4 0v8h2V8h-2z',
    emoji: '💊',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    category: 'treatment'
  },
  'Consultation': {
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    emoji: '📋',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    category: 'consultation'
  },
  'Surgery': {
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4',
    emoji: '🏥',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    category: 'procedure'
  },
  'Vaccination': {
    icon: 'M17 8l4 4m-4-4v12m4-12l-4 4m4-4H3l4 4m10-4l-4 4',
    emoji: '💉',
    color: 'teal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
    category: 'prevention'
  },
  'Other': {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    emoji: '📄',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    category: 'general'
  }
};

// Generate human-readable record title
export function getRecordTitle(record: any): string {
  // Priority 1: Custom record title (new feature)
  const customTitle = record.data?.recordTitle || record.recordTitle;
  
  // Priority 2: Record type (fallback)
  const recordType = record.data?.recordType || record.recordType || 'Medical Record';
  
  // Use custom title if available, otherwise use record type
  if (customTitle && customTitle.trim()) {
    return customTitle;
  }
  
  return recordType;
}

// Get provider name (doctor or facility)
export function getProviderName(record: any): string {
  const doctorName = record.data?.doctorName;
  const facilityName = record.data?.facilityName;
  const providerAddress = record.provider || record.data?.provider;
  
  if (doctorName && doctorName !== "Dr. Provider") {
    return doctorName;
  }
  
  if (facilityName && facilityName !== "MediDrop Hospital") {
    return facilityName;
  }
  
  if (providerAddress) {
    return `${providerAddress.substring(0, 6)}...${providerAddress.substring(providerAddress.length - 4)}`;
  }
  
  return 'Unknown Provider';
}

// Get record description
export function getRecordDescription(record: any): string {
  // Prioritize the main description field
  const description = record.data?.description;
  const results = record.data?.results;
  const notes = record.data?.notes;
  
  // Use description first (main content field)
  if (description && description.trim()) {
    return description.length > 100 ? description.substring(0, 100) + '...' : description;
  }
  
  // Fallback to results field
  if (results && results !== 'No results' && results.trim()) {
    return results.length > 100 ? results.substring(0, 100) + '...' : results;
  }
  
  // Last resort: use notes if they're meaningful
  if (notes && notes !== 'No additional notes.' && notes.trim()) {
    return notes.length > 100 ? notes.substring(0, 100) + '...' : notes;
  }
  
  return 'No description available';
}

// Get record type info
export function getRecordTypeInfo(recordType: string): RecordTypeInfo {
  return RECORD_TYPES[recordType] || RECORD_TYPES['Other'];
}

// Format date in a user-friendly way
export function formatRecordDate(timestamp: number | string): string {
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000);
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Get time since record was created
export function getTimeSince(timestamp: number | string): string {
  const now = new Date().getTime();
  const recordTime = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp * 1000;
  const diffMs = now - recordTime;
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Helper function to get icon size classes
export function getIconSizeClasses(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  return sizeClasses[size];
}