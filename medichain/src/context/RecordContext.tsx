'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MedicalRecord } from '@/lib/ai';

interface RecordContextType {
  currentRecord: MedicalRecord | null;
  setCurrentRecord: (record: MedicalRecord | null) => void;
  userType: 'patient' | 'provider' | null;
  setUserType: (type: 'patient' | 'provider' | null) => void;
}

const RecordContext = createContext<RecordContextType | undefined>(undefined);

export function RecordProvider({ children }: { children: ReactNode }) {
  const [currentRecord, setCurrentRecord] = useState<MedicalRecord | null>(null);
  const [userType, setUserType] = useState<'patient' | 'provider' | null>(null);

  return (
    <RecordContext.Provider value={{
      currentRecord,
      setCurrentRecord,
      userType,
      setUserType
    }}>
      {children}
    </RecordContext.Provider>
  );
}

export function useRecordContext() {
  const context = useContext(RecordContext);
  if (context === undefined) {
    throw new Error('useRecordContext must be used within a RecordProvider');
  }
  return context;
} 