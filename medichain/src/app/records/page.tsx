'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry, MedicalRecord } from '@/lib/hooks';
import { useRecordContext } from '@/context/RecordContext';
import { ethers } from 'ethers';
import { 
  fetchFromIPFS, 
  decryptData, 
  generateKeyFromPassword, 
  encryptData, 
  uploadToIPFS,
  tryMultipleGateways
} from '@/lib/ipfs';
import { toast } from 'react-hot-toast';
import { 
  getRecordTitle, 
  getProviderName, 
  getRecordDescription, 
  getRecordTypeInfo, 
  formatRecordDate,
  getTimeSince 
} from '@/lib/recordTypes';
import TranslatedText from '@/components/TranslatedText';

interface RecordWithId extends MedicalRecord {
  id: string;
  type: string;
  description: string;
  formattedDate: string;
  formattedTime: string;
}

interface MedicalRecordData {
  recordType?: string;
  recordTitle?: string;
  date?: string;
  provider?: string;
  facilityName?: string;
  notes?: string;
  results?: string;
  [key: string]: unknown;
}

// Record Detail Modal Component
interface RecordDetailProps {
  record: RecordWithId | null;
  decryptedData: MedicalRecordData | null;
  isLoading: boolean;
  onClose: () => void;
  onReEncrypt?: (record: RecordWithId, data: any) => Promise<void>;
}

const RecordDetailModal: React.FC<RecordDetailProps> = ({ record, decryptedData, isLoading, onClose, onReEncrypt }) => {
  if (!record) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {decryptedData?.recordTitle || <TranslatedText>Medical Record Details</TranslatedText>}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : decryptedData ? (
            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    <TranslatedText>Record Title</TranslatedText>
                  </h4>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{decryptedData.recordTitle || decryptedData.recordType || <TranslatedText>Unknown</TranslatedText>}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    <TranslatedText>Record Type</TranslatedText>
                  </h4>
                  <p className="mt-1 text-sm text-gray-900">{decryptedData.recordType || <TranslatedText>Unknown</TranslatedText>}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    <TranslatedText>Date</TranslatedText>
                  </h4>
                  <p className="mt-1 text-sm text-gray-900">{decryptedData.date || `${record.formattedDate} ${record.formattedTime}`}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    <TranslatedText>Provider</TranslatedText>
                  </h4>
                  <p className="mt-1 text-sm text-gray-900">{decryptedData.provider || <TranslatedText>Unknown</TranslatedText>}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    <TranslatedText>Facility</TranslatedText>
                  </h4>
                  <p className="mt-1 text-sm text-gray-900">{decryptedData.facilityName || <TranslatedText>Unknown</TranslatedText>}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500">
                  <TranslatedText>Results</TranslatedText>
                </h4>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{decryptedData.results || <TranslatedText>No results available</TranslatedText>}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  <TranslatedText>Notes</TranslatedText>
                </h4>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{decryptedData.notes || <TranslatedText>No notes available</TranslatedText>}</p>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500">
                  <TranslatedText>IPFS Information</TranslatedText>
                </h4>
                <p className="mt-1 text-sm text-gray-500 font-mono break-all">CID: {record.cid}</p>
                <div className="mt-2">
                  <a 
                    href={`https://gateway.pinata.cloud/ipfs/${record.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    <TranslatedText>View on IPFS Gateway</TranslatedText>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-red-600">
              <p><TranslatedText>Failed to load record data.</TranslatedText></p>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <TranslatedText>Close</TranslatedText>
          </Button>
          {decryptedData && (
            <>
              <Button className="ml-3" onClick={() => window.location.href = `/records/review/${record.id}`}>
                <TranslatedText>Review Record</TranslatedText>
              </Button>
              <Button 
                className="ml-3" 
                variant="secondary"
                onClick={() => onReEncrypt && record && onReEncrypt(record, decryptedData)}
              >
                <TranslatedText>Re-encrypt Record</TranslatedText>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Records() {
  const { isConnected, account, userType } = useWallet();
  const { getRecordIds, getRecord, contract } = useMedicalRegistry();
  const { setCurrentRecord, setUserType } = useRecordContext();
  
  const [records, setRecords] = useState<RecordWithId[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordWithId | null>(null);
  const [decryptedData, setDecryptedData] = useState<MedicalRecordData | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // Extract fetchRecords function so it can be reused
  const fetchRecords = useCallback(async () => {
    if (!isConnected || !account) return;
    
    try {
      setLoading(true);
      console.log("Fetching records for account:", account);
      
      // Get all record IDs for the patient (fallback to events if call fails)
      let recordIds: string[] = [];
      try {
        recordIds = await getRecordIds(account);
        console.log("Found record IDs:", recordIds);
      } catch (err) {
        console.warn("getRecordIds failed; falling back to events:", err);
      }

      // Merge with RecordAdded events (ensures visibility even if first call fails or lags)
      try {
        if (contract) {
          const filter = contract.filters.RecordAdded(account);
          const events = await contract.queryFilter(filter);
          const idsFromEvents = events
            .map((ev: any) => ev.args?.recordId)
            .filter(Boolean) as string[];
          const merged = new Set<string>(recordIds);
          idsFromEvents.forEach((id) => merged.add(id));
          recordIds = Array.from(merged);
          console.log("Merged record IDs (with events):", recordIds);
        }
      } catch (eventErr) {
        console.warn("Failed to read RecordAdded events:", eventErr);
      }
      
      // Fetch details for each record
      const recordPromises = recordIds.map(async (recordIdBytes: string, index: number) => {
        try {
          console.log(`Fetching record ${index + 1}/${recordIds.length}: ${recordIdBytes}`);
          const record = await getRecord(account, recordIdBytes);
          console.log(`Record ${index + 1} details:`, record);
          
          // Convert bytes32 to string for display
          let recordId = '';
          try {
            recordId = ethers.utils.parseBytes32String(recordIdBytes);
          } catch (e) {
            // If it can't be parsed as a string, use the hex representation
            recordId = recordIdBytes.substring(0, 10) + '...';
          }
          
          // Format date
          const date = new Date(record.timestamp * 1000);
          const formattedDate = date.toISOString().split('T')[0];
          const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Try to decrypt the record to get the actual data for display
          let decryptedData = null;
          let recordTitle = 'Medical Record';
          let providerName = record.provider;
          
          try {
            // Generate decryption key
            const decryptionKey = await generateKeyFromPassword(account);
            
            // Fetch encrypted data from IPFS
            const encryptedDataRaw = await fetchFromIPFS(record.cid);
            
            // Handle different IPFS response formats
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
            
            // Decrypt the data
            const decryptedDataRaw = await decryptData(encryptedData, decryptionKey);
            decryptedData = typeof decryptedDataRaw === 'string' ? JSON.parse(decryptedDataRaw) : decryptedDataRaw;
            
            // Use the new utility functions to get human-readable information
            const recordWithData = { ...record, data: decryptedData };
            recordTitle = getRecordTitle(recordWithData);
            providerName = getProviderName(recordWithData);
            
            console.log(`Successfully decrypted record ${index + 1}:`, { recordTitle, providerName });
          } catch (decryptError) {
            console.warn(`Could not decrypt record ${index + 1} for display (this is normal for new records):`, decryptError);
            // Keep the fallback values
          }
          
          const processedRecord = {
            ...record,
            id: recordId,
            type: recordTitle,
            description: `IPFS CID: ${record.cid}`, // Keep original CID display
            provider: providerName,
            formattedDate,
            formattedTime
          };
          
          console.log(`Processed record ${index + 1}:`, processedRecord);
          return processedRecord;
        } catch (e) {
          console.error(`Error fetching record ${index + 1} (${recordIdBytes}):`, e);
          return null;
        }
      });
      
      const fetchedRecords = (await Promise.all(recordPromises)).filter(Boolean) as RecordWithId[];
      console.log("Final fetched records:", fetchedRecords);
      setRecords(fetchedRecords);
    } catch (e) {
      console.error('Error fetching records:', e);
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, getRecordIds, getRecord]);

  // Fetch records when account is connected (initial load)
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Set up event listener for new records
  useEffect(() => {
    if (!contract || !account) return;

    console.log("Setting up RecordAdded event listener for patient:", account);
    
    // Create filter for RecordAdded events for this specific patient
    const filter = contract.filters.RecordAdded(account);
    
    const onRecordAdded = (patient: string, recordId: string, cid: string, provider: string) => {
      console.log("🎉 New record added event received:", { patient, recordId, cid, provider });
      console.log("Event is for current account:", patient.toLowerCase() === account.toLowerCase());
      
      // Only refresh if the event is for the current patient
      if (patient.toLowerCase() === account.toLowerCase()) {
        console.log("Refreshing records due to new RecordAdded event");
        // Small delay to ensure the transaction is fully processed
        setTimeout(() => {
          fetchRecords();
        }, 1000);
      }
    };

    // Add the event listener
    contract.on(filter, onRecordAdded);
    
    console.log("RecordAdded event listener added");

    // Cleanup function to remove the event listener
    return () => {
      console.log("Removing RecordAdded event listener");
      contract.off(filter, onRecordAdded);
    };
  }, [contract, account, fetchRecords]);

  // View record details
  const viewRecord = async (record: RecordWithId) => {
    if (!account) {
      toast.error('Please connect your wallet');
      return;
    }

    // Show modal & spinner
    setSelectedRecord(record);
    setIsDecrypting(true);
    setDecryptedData(null);
    toast.loading('Fetching record from IPFS...', { id: 'fetch-record' });

    try {
      console.log('🔍 Starting record fetch process for CID:', record.cid);
      
      // 1. Fetch the encrypted data from IPFS (try multiple gateways)
      let ipfsResponse;
      try {
        // First try the regular fetchFromIPFS
        ipfsResponse = await fetchFromIPFS(record.cid);
        console.log('✅ IPFS fetch successful with primary method');
      } catch (ipfsError) {
        console.warn('⚠️ Primary IPFS fetch failed, trying multiple gateways:', ipfsError);
        
        try {
          // If that fails, try our backup method with multiple gateways
          ipfsResponse = await tryMultipleGateways(record.cid);
          console.log('✅ IPFS fetch successful with multiple gateways');
        } catch (backupError) {
          console.error('❌ All IPFS methods failed:', backupError);
          toast.error('Failed to fetch record from IPFS. Please try again later.', { id: 'fetch-record' });
          setIsDecrypting(false);
          return;
        }
      }
      
      // 2. Extract the encrypted content
      let encryptedBase64: string;
      try {
        if (typeof ipfsResponse === 'string') {
          encryptedBase64 = ipfsResponse;
        } else if (typeof ipfsResponse === 'object' && ipfsResponse !== null) {
          encryptedBase64 = 'content' in ipfsResponse 
            ? ipfsResponse.content as string
            : JSON.stringify(ipfsResponse);
        } else {
          throw new Error('Unexpected IPFS response format');
        }
      } catch (extractError) {
        console.error('❌ Error extracting content:', extractError);
        toast.error('Failed to process record data', { id: 'fetch-record' });
        setIsDecrypting(false);
        return;
      }
      
      // 3. Try decrypting with patient's key first
      try {
        console.log('🔑 Trying patient key...');
        const patientKey = await generateKeyFromPassword(account);
        const decryptedResult = await decryptData(encryptedBase64, patientKey);
        
        setDecryptedData(decryptedResult as MedicalRecordData);
        
        // Set the current record in context for the AI bot
        setCurrentRecord({
          id: record.id,
          timestamp: record.timestamp,
          provider: record.provider,
          cid: record.cid,
          content: decryptedResult as MedicalRecordData
        });
        setUserType(userType);
        
        toast.success('Record loaded successfully!', { id: 'fetch-record' });
        setIsDecrypting(false);
        return;
      } catch (patientKeyError) {
        console.log('❌ Patient key failed:', patientKeyError);
        
        // 4. If patient key fails, try provider key
        try {
          console.log('🔑 Trying provider key...');
          const providerKey = await generateKeyFromPassword(record.provider);
          const decryptedResult = await decryptData(encryptedBase64, providerKey);
          
          setDecryptedData(decryptedResult as MedicalRecordData);
          
          // Set the current record in context for the AI bot
          setCurrentRecord({
            id: record.id,
            timestamp: record.timestamp,
            provider: record.provider,
            cid: record.cid,
            content: decryptedResult as MedicalRecordData
          });
          setUserType(userType);
          
          toast.success('Record decrypted with provider key. Consider re-encrypting with your key.', { id: 'fetch-record' });
          setIsDecrypting(false);
          return;
        } catch (providerKeyError) {
          console.error('❌ Provider key failed:', providerKeyError);
          throw new Error('Could not decrypt with either patient or provider key');
        }
      }
    } catch (error) {
      console.error('❌ Final error:', error);
      
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load record: ${errorMessage}`, { id: 'fetch-record' });
      setIsDecrypting(false);
    }
  };

  // Re-encrypt and update a record with patient's key
  const reEncryptRecord = async (record: RecordWithId, decryptedContent: any) => {
    if (!account || !contract) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.loading('Re-encrypting record...', { id: 'reencrypt' });
      
      // 1. Generate encryption key from patient address
      const patientKey = await generateKeyFromPassword(account);
      
      // 2. Encrypt the data with patient's key
      const recordDataString = JSON.stringify(decryptedContent);
      const encryptedData = await encryptData(recordDataString, patientKey);
      
      // 3. Upload the re-encrypted data to IPFS
      const cid = await uploadToIPFS(
        encryptedData,
        {
          metadata: {
            name: `reencrypted-${record.id}`,
            keyvalues: {
              patientAddress: account,
              recordType: decryptedContent.recordType || 'Unknown',
              encrypted: true,
              reEncrypted: true
            }
          }
        }
      );
      
      console.log('Re-encrypted record uploaded to IPFS with CID:', cid);
      
      // 4. Update the record on the blockchain
      const recordId = ethers.utils.id(record.id);
      const tx = await contract.updateRecord(account, recordId, cid);
      
      toast.loading('Updating blockchain record...', { id: 'reencrypt' });
      await tx.wait();
      
      toast.success('Record successfully re-encrypted and updated!', { id: 'reencrypt' });
      
      // 5. Refresh records
      await fetchRecords();
      
    } catch (error) {
      console.error('Error re-encrypting record:', error);
      toast.error(`Failed to re-encrypt record: ${error instanceof Error ? error.message : String(error)}`, { id: 'reencrypt' });
    }
  };

  // Close the modal
  const closeModal = () => {
    setSelectedRecord(null);
    setDecryptedData(null);
    // Clear the current record context
    setCurrentRecord(null);
  };

  // Redirect if not connected or not a patient
  if (!isConnected || userType !== 'patient') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">
            <TranslatedText>Access Denied</TranslatedText>
          </h2>
          <p className="mb-6 text-yellow-700">
            <TranslatedText>
              You must be connected as a patient to view your medical records.
            </TranslatedText>
          </p>
          <Button onClick={() => window.location.href = '/'}>
            <TranslatedText>Return to Home</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <TranslatedText>My Medical Records</TranslatedText>
          </h1>
          <p className="text-gray-600">
            <TranslatedText>
              View and manage your medical records stored on the blockchain.
            </TranslatedText>
          </p>
        </div>
        <div className="flex space-x-4">
          <Button 
            variant="outline" 
            onClick={fetchRecords}
            disabled={loading}
          >
            {loading ? <TranslatedText>Refreshing...</TranslatedText> : <TranslatedText>Refresh Records</TranslatedText>}
          </Button>
          <Button onClick={() => window.location.href = '/patient/dashboard'}>
            <TranslatedText>Upload New Record</TranslatedText>
          </Button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            <TranslatedText>Patient Information</TranslatedText>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            <TranslatedText>
              Personal details associated with your wallet.
            </TranslatedText>
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                <TranslatedText>Wallet Address</TranslatedText>
              </dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono break-all">{account}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                <TranslatedText>Patient ID</TranslatedText>
              </dt>
              <dd className="mt-1 text-sm text-gray-900">MED-{account?.substring(2, 8).toUpperCase()}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Medical History</TranslatedText>
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              <TranslatedText>
                Your complete medical record history.
              </TranslatedText>
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <TranslatedText>Filter</TranslatedText>
            </Button>
            <Button variant="outline" size="sm">
              <TranslatedText>Export</TranslatedText>
            </Button>
          </div>
        </div>
        <div className="border-t border-gray-200">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                <TranslatedText>Loading medical records...</TranslatedText>
              </p>
            </div>
          ) : records.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText>Date & Time</TranslatedText>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText>Type</TranslatedText>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText>Provider</TranslatedText>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText>Description</TranslatedText>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText>Actions</TranslatedText>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={`${record.cid}-${record.timestamp || ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.formattedDate} <span className="text-gray-500">{record.formattedTime}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.provider && record.provider.startsWith('0x') 
                        ? `${record.provider.substring(0, 6)}...${record.provider.substring(record.provider.length - 4)}`
                        : record.provider || <TranslatedText>Unknown Provider</TranslatedText>
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono break-all">{record.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => viewRecord(record)} 
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <TranslatedText>View</TranslatedText>
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <TranslatedText>Share</TranslatedText>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                <TranslatedText>No medical records found.</TranslatedText>
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal 
          record={selectedRecord}
          decryptedData={decryptedData}
          isLoading={isDecrypting}
          onClose={closeModal}
          onReEncrypt={reEncryptRecord}
        />
      )}
    </div>
  );
} 