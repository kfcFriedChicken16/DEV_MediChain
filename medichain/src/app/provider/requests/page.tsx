'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry } from '@/lib/hooks';
import { toast } from 'react-hot-toast';
import { DURATION_OPTIONS, formatDuration } from '@/lib/doctorAccess';
import { 
  getRecordTitle, 
  getProviderName, 
  getRecordDescription, 
  getRecordTypeInfo, 
  formatRecordDate,
  getTimeSince 
} from '@/lib/recordTypes';
import { 
  fetchFromIPFS, 
  decryptData, 
  generateKeyFromPassword 
} from '@/lib/ipfs';

export default function DoctorRequestsPage() {
  const { isConnected, account, userType } = useWallet();
  const { requestAccess, getRecordIds, getRecord, contract } = useMedicalRegistry();
  
  const [isLoading, setIsLoading] = useState(false);
  const [patientAddress, setPatientAddress] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(30);
  const [recordIds, setRecordIds] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [showRecordSelection, setShowRecordSelection] = useState(false);

  // Load patient records for selection
  const loadPatientRecords = async () => {
    if (!patientAddress || !patientAddress.startsWith('0x') || patientAddress.length !== 42) {
      toast.error('Please enter a valid patient address');
      return;
    }

    try {
      setIsLoading(true);
      let recordIds: string[] = [];
      let fallbackEventData: Record<string, { cid: string; provider: string; timestamp: number }> = {};

      try {
        // Try normal authorized call first
        recordIds = await getRecordIds(patientAddress);
      } catch (authErr) {
        // Fallback: query events to build a list without requiring access
        if (!contract) throw authErr;

        const filter = contract.filters.RecordAdded(patientAddress);
        const events = await contract.queryFilter(filter);
        const providerForBlocks = contract.provider;

        const enriched = await Promise.all(
          events.map(async (ev: any) => {
            const rid: string | undefined = ev.args?.recordId;
            const cid: string | undefined = ev.args?.cid;
            const providerAddr: string | undefined = ev.args?.provider;
            if (!rid) return null;
            let ts = Date.now() / 1000;
            try {
              if (providerForBlocks && ev.blockNumber) {
                const block = await providerForBlocks.getBlock(ev.blockNumber);
                if (block?.timestamp) ts = block.timestamp;
              }
            } catch {}
            if (cid && providerAddr) {
              fallbackEventData[rid] = { cid, provider: providerAddr, timestamp: Math.floor(ts) };
            }
            return rid;
          })
        );
        recordIds = enriched.filter(Boolean) as string[];
      }

      const records = [] as any[];
      for (const recordId of recordIds) {
        try {
          // If we have full access, load via contract; otherwise use event data
          let record: any;
          if (fallbackEventData[recordId]) {
            const { cid, provider, timestamp } = fallbackEventData[recordId];
            record = { cid, provider, timestamp, version: 1 };
          } else {
            record = await getRecord(patientAddress, recordId);
          }

          // Try to decrypt to get type/title
          let recordType = 'Medical Record';
          let recordTitle = 'Medical Record';

          try {
            const decryptionKey = await generateKeyFromPassword(patientAddress);
            const encryptedDataRaw = await fetchFromIPFS(record.cid);
            let encryptedData: string;
            if (typeof encryptedDataRaw === 'string') {
              encryptedData = encryptedDataRaw;
            } else if (encryptedDataRaw && typeof encryptedDataRaw === 'object') {
              const dataObj = encryptedDataRaw as any;
              if (dataObj.content && typeof dataObj.content === 'string') {
                encryptedData = dataObj.content;
              } else {
                encryptedData = JSON.stringify(encryptedDataRaw);
              }
            } else {
              throw new Error('Invalid data format received from IPFS');
            }

            const decryptedDataRaw = await decryptData(encryptedData, decryptionKey);
            const decryptedData = typeof decryptedDataRaw === 'string' ? JSON.parse(decryptedDataRaw) : decryptedDataRaw;
            recordType = decryptedData.recordType || 'Medical Record';
            recordTitle = decryptedData.recordTitle || recordType;
          } catch (decryptError) {
            console.warn(`Could not decrypt record ${recordId} for display:`, decryptError);
          }

          records.push({
            id: recordId,
            ...record,
            recordType,
            recordTitle
          });
        } catch (error) {
          console.error('Error loading record:', recordId, error);
        }
      }
      
      setPatientRecords(records);
      setRecordIds(recordIds);
      setShowRecordSelection(true);
      
      if (records.length === 0) {
        toast('This patient has no medical records yet', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Error loading patient records:', error);
      toast.error('Failed to load patient records. Make sure the address is correct and you have permission.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle record selection
  const handleRecordToggle = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // Handle request submission
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientAddress || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (selectedRecords.length === 0) {
      toast.error('Please select at least one record to request access to');
      return;
    }

    try {
      setIsLoading(true);
      toast.loading('Submitting access request...', { id: 'request-access' });
      
      const result = await requestAccess(
        patientAddress,
        selectedRecords,
        reason.trim(),
        duration
      );
      
      toast.success('Access request submitted successfully! The patient will be notified.', { 
        id: 'request-access',
        duration: 5000
      });
      
      // Reset form
      setPatientAddress('');
      setReason('');
      setDuration(30);
      setSelectedRecords([]);
      setPatientRecords([]);
      setShowRecordSelection(false);
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit access request', { id: 'request-access' });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if not connected or not a provider
  if (!isConnected || userType !== 'provider') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Access Denied</h2>
          <p className="mb-6 text-yellow-700">
            You must be connected as a provider to request patient access.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Request Patient Access</h1>

      {/* Request Form */}
      <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">New Access Request</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Request time-limited access to specific patient medical records.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            {/* Patient Address */}
            <div>
              <label htmlFor="patientAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Patient Wallet Address *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="patientAddress"
                  value={patientAddress}
                  onChange={(e) => setPatientAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                  required
                />
                <Button
                  type="button"
                  onClick={loadPatientRecords}
                  disabled={!patientAddress || isLoading}
                  variant="outline"
                >
                  {isLoading ? 'Loading...' : 'Load Records'}
                </Button>
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Access Duration *
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                required
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Access *
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Treatment planning for cancer care, follow-up consultation, etc."
                rows={3}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                required
              />
            </div>

            {/* Record Selection */}
            {showRecordSelection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Records to Request Access *
                </label>
                {patientRecords.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {patientRecords.map((record) => {
                      // Use the decrypted record type and title
                      const recordType = record.recordType || 'Medical Record';
                      const recordTitle = record.recordTitle || recordType;
                      const typeInfo = getRecordTypeInfo(recordType);
                      const providerAddress = record.provider;
                      
                      return (
                        <label key={record.id} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes(record.id)}
                            onChange={() => handleRecordToggle(record.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-2"
                          />
                          <div className="ml-4 flex-1">
                            <div className="flex items-center">
                              <div className={`h-8 w-8 rounded-full ${typeInfo.bgColor} flex items-center justify-center mr-3`}>
                                <span className="text-lg">{typeInfo.emoji}</span>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900">
                                  {recordTitle}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {formatRecordDate(record.timestamp)}
                                  <span className="mx-2">•</span>
                                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {providerAddress.substring(0, 6)}...{providerAddress.substring(providerAddress.length - 4)}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  ID: {record.id.substring(0, 8)}...
                                </div>
                                <div className="text-xs text-blue-600 mt-1 italic">
                                  ℹ️ Full record details available after patient approval
                                </div>
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 border border-gray-200 rounded-md">
                    No records found for this patient
                  </div>
                )}
                {selectedRecords.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedRecords.length} record{selectedRecords.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!showRecordSelection || selectedRecords.length === 0 || isLoading}
                isLoading={isLoading}
              >
                Submit Access Request
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-medium text-blue-800 mb-2">How Access Requests Work</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>1. Request:</strong> Enter the patient's wallet address and load their available records.</p>
          <p><strong>2. Select:</strong> Choose specific records you need access to and specify the duration.</p>
          <p><strong>3. Submit:</strong> Patient receives your request and can approve/deny with record selection.</p>
          <p><strong>4. Access:</strong> If approved, you get time-limited access to only the approved records.</p>
          <p><strong>Note:</strong> All requests are logged on the blockchain for transparency and auditing.</p>
        </div>
      </div>
    </div>
  );
} 