'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry } from '@/lib/hooks';
import { toast } from 'react-hot-toast';
import { fetchFromIPFS, uploadToIPFS, encryptData, decryptData, generateKeyFromPassword } from '@/lib/ipfs';
import { ethers } from 'ethers';
import { 
  getRecordTitle, 
  getProviderName, 
  getRecordDescription, 
  getRecordTypeInfo, 
  formatRecordDate,
  getTimeSince,
  RECORD_TYPES 
} from '@/lib/recordTypes';

interface PatientAccess {
  patientAddress: string;
  authorizedRecords: string[];
  expiresAt: number;
  sharedDataCid: string;
}

interface MedicalRecordData {
  id: string;
  patientAddress: string;
  cid: string;
  timestamp: number;
  provider: string;
  version: number;
  recordTitle?: string; // Custom record title
  recordType?: string; // Record type
  data?: any; // Decrypted data
  sharedMetadata?: {
    approvedAt: number;
    expiresAt: number;
    reason?: string;
    patient: string;
    originalCid: string;
  };
}

// Add record form interface
interface RecordForm {
  patientAddress: string;
  recordId?: string;
  type: string;
  title: string; // NEW: Custom record title like "Fever Treatment", "Blood Test Results"
  description: string;
  notes: string;
  cid: string;
  file: File | null;
  isSubmitting: boolean;
}

export default function DoctorDashboard() {
  const { isConnected, account, userType, chainId } = useWallet();
  const { 
    getDoctorAccess, 
    getRecord, 
    hasDoctorAccess,
    addRecord,
    hasAccess,
    contract 
  } = useMedicalRegistry();
  
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [patientAccesses, setPatientAccesses] = useState<PatientAccess[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientRecords, setPatientRecords] = useState<MedicalRecordData[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordData | null>(null);

  // Add Medical Record states
  const [recordForm, setRecordForm] = useState<RecordForm>({
    patientAddress: '',
    type: '',
    title: '', // NEW: Custom record title
    description: '',
    notes: '',
    cid: '',
    file: null,
    isSubmitting: false
  });

  // State for IPFS upload status
  const [ipfsState, setIpfsState] = useState({
    cid: null as string | null,
    isUploading: false,
    error: null as string | null
  });

  // State for record addition success
  const [recordAddedSuccess, setRecordAddedSuccess] = useState<{
    patientAddress: string;
    recordId: string;
    cid: string;
    timestamp: number;
  } | null>(null);

  // Load patients that granted access to this doctor
  const loadPatientAccesses = async () => {
    if (!isConnected || !account || !contract) return;
    
    try {
      setIsLoading(true);
      console.log('🔍 Loading patient accesses for doctor:', account);
      
      // Get all AccessApproved events where this doctor was granted access
      const filter = contract.filters.AccessApproved(null, account);
      console.log('🔍 Querying AccessApproved events with filter:', filter);
      const events = await contract.queryFilter(filter);
      console.log('🔍 Found AccessApproved events:', events.length);
      
      const accesses: PatientAccess[] = [];
      const patientMap = new Map<string, PatientAccess>(); // To deduplicate by patient address
      
      for (const event of events) {
        if (event.args) {
          const patientAddress = event.args.patient;
          
          try {
            // Get current access details for this patient
            const accessDetails = await getDoctorAccess(patientAddress, account);
            
            // Check if access is still valid and not expired
            if (accessDetails.exists && accessDetails.expiresAt > Math.floor(Date.now() / 1000)) {
              const access: PatientAccess = {
                patientAddress,
                authorizedRecords: accessDetails.authorizedRecords,
                expiresAt: accessDetails.expiresAt,
                sharedDataCid: accessDetails.sharedDataCid
              };
              
              // Only keep the most recent access for each patient
              const existingAccess = patientMap.get(patientAddress);
              if (!existingAccess || access.expiresAt > existingAccess.expiresAt) {
                patientMap.set(patientAddress, access);
              }
            }
          } catch (error) {
            console.error(`Error checking access for patient ${patientAddress}:`, error);
          }
        }
      }
      
      // Convert map back to array
      const uniqueAccesses = Array.from(patientMap.values());
      console.log('🔍 Final unique accesses:', uniqueAccesses.length, uniqueAccesses);
      setPatientAccesses(uniqueAccesses);
    } catch (error) {
      console.error('Error loading patient accesses:', error);
      toast.error('Failed to load patient accesses');
    } finally {
      setIsLoading(false);
    }
  };

  // Load records for a specific patient
  const loadPatientRecords = async (patientAddress: string, authorizedRecords: string[]) => {
    if (!isConnected || !account) return;
    
    try {
      setLoadingRecords(true);
      const records: MedicalRecordData[] = [];
      
      for (const recordId of authorizedRecords) {
        try {
          // Check if we still have access to this specific record
          const hasAccess = await hasDoctorAccess(patientAddress, account, recordId);
          
          if (hasAccess) {
            const recordData = await getRecord(patientAddress, recordId);
            
            // Try to decrypt the record to get human-readable information
            let recordTitle = 'Medical Record';
            let recordType = 'Other';
            let providerName = recordData.provider;
            
            try {
              // Get the shared data to decrypt the record
              const accessDetails = await getDoctorAccess(patientAddress, account);
              if (accessDetails.exists && accessDetails.sharedDataCid) {
                const encryptedDataRaw = await fetchFromIPFS(accessDetails.sharedDataCid);
                let encryptedDataString: string;
                
                if (typeof encryptedDataRaw === 'string') {
                  encryptedDataString = encryptedDataRaw;
                } else if (encryptedDataRaw && typeof encryptedDataRaw === 'object') {
                  const dataObj = encryptedDataRaw as any;
                  if (dataObj.content && typeof dataObj.content === 'string') {
                    encryptedDataString = dataObj.content;
                  } else {
                    throw new Error('Invalid data format');
                  }
                } else {
                  throw new Error('Invalid data format');
                }
                
                // Decrypt the shared data structure
                const doctorDecryptionKey = await generateKeyFromPassword(account);
                const decryptedDataRaw = await decryptData(encryptedDataString, doctorDecryptionKey);
                const decryptedDataString = typeof decryptedDataRaw === 'string' ? decryptedDataRaw : JSON.stringify(decryptedDataRaw);
                const sharedData = JSON.parse(decryptedDataString);
                
                console.log('Shared data structure:', sharedData);
                
                // Find the specific record in the shared data
                const sharedRecord = sharedData.records?.find((r: any) => r.recordId === recordId);
                if (sharedRecord && sharedRecord.data) {
                  const recordData = sharedRecord.data;
                  recordTitle = recordData.recordTitle || recordData.recordType || 'Medical Record';
                  recordType = recordData.recordType || 'Other';
                  providerName = recordData.doctorName || recordData.provider || recordData.provider;
                  
                  console.log(`Successfully extracted record ${recordId}:`, { recordTitle, recordType, providerName });
                } else {
                  console.warn(`Record ${recordId} not found in shared data`);
                }
              }
            } catch (decryptError) {
              console.warn(`Could not decrypt record ${recordId} for display:`, decryptError);
            }
            
            records.push({
              id: recordId,
              patientAddress,
              cid: recordData.cid,
              timestamp: recordData.timestamp,
              provider: providerName, // Use readable provider name
              version: recordData.version,
              recordTitle, // Add custom title
              recordType // Add record type
            });
          }
        } catch (error) {
          console.error(`Error loading record ${recordId}:`, error);
        }
      }
      
      setPatientRecords(records);
    } catch (error) {
      console.error('Error loading patient records:', error);
      toast.error('Failed to load patient records');
    } finally {
      setLoadingRecords(false);
    }
  };

  // View a specific medical record using shared data
  const viewRecord = async (record: MedicalRecordData) => {
    if (!account) {
      toast.error('Doctor account not available');
      return;
    }
    
    try {
      toast.loading('Loading medical record...', { id: 'load-record' });
      
      // Step 1: Get the shared data CID from the doctor access info
      console.log('Getting doctor access info for patient:', record.patientAddress);
      const accessDetails = await getDoctorAccess(record.patientAddress, account);
      
      if (!accessDetails.exists || !accessDetails.sharedDataCid) {
        throw new Error('No shared data available. Patient may not have approved access properly.');
      }
      
      if (accessDetails.expiresAt < Math.floor(Date.now() / 1000)) {
        throw new Error('Access has expired. Please request renewed access from the patient.');
      }
      
      console.log('Shared data CID:', accessDetails.sharedDataCid);
      
      // Step 2: Fetch the encrypted shared data from IPFS
      toast.loading('Fetching encrypted shared data...', { id: 'load-record' });
      const encryptedDataRaw = await fetchFromIPFS(accessDetails.sharedDataCid);
      
      console.log('Raw encrypted data from IPFS:', encryptedDataRaw);
      console.log('Type of raw encrypted data:', typeof encryptedDataRaw);
      
      // Step 3: Extract the encrypted data (handle Pinata format)
      let encryptedDataString;
      if (typeof encryptedDataRaw === 'string') {
        // If it's a string, use it directly
        encryptedDataString = encryptedDataRaw;
      } else if (encryptedDataRaw && typeof encryptedDataRaw === 'object') {
        // If it's an object, look for content field (Pinata format)
        const dataObj = encryptedDataRaw as any;
        if (dataObj.content && typeof dataObj.content === 'string') {
          console.log('Extracting encrypted content from Pinata format');
          encryptedDataString = dataObj.content;
        } else {
          throw new Error('Encrypted data not found in expected format');
        }
      } else {
        throw new Error('Invalid encrypted data format received from IPFS');
      }
      
      // Step 4: Generate doctor's decryption key and decrypt the entire structure
      toast.loading('Decrypting complete data structure...', { id: 'load-record' });
      console.log('Generating doctor decryption key for:', account);
      const doctorDecryptionKey = await generateKeyFromPassword(account);
      console.log('🔑 Doctor decryption key generated successfully');
      
      console.log('Decrypting entire shared data structure with doctor key...');
      const decryptedDataRaw = await decryptData(encryptedDataString, doctorDecryptionKey);
      const decryptedDataString = typeof decryptedDataRaw === 'string' ? decryptedDataRaw : JSON.stringify(decryptedDataRaw);
      const sharedData = JSON.parse(decryptedDataString);
      
      console.log('Successfully decrypted complete shared data structure');
      
      console.log('Shared data structure:', sharedData);
      
      // Step 5: Find the specific record in the shared data
      const sharedRecord = sharedData.records?.find((r: any) => r.recordId === record.id);
      
      if (!sharedRecord) {
        throw new Error(`Record ${record.id} not found in shared data. You may not have access to this specific record.`);
      }
      
      console.log('Found shared record:', sharedRecord);
      
      // Step 6: Extract record data (already decrypted as part of the structure)
      const recordData = sharedRecord.data;
      if (!recordData) {
        throw new Error('No record data found in shared record');
      }
      
      console.log('Record data extracted successfully from decrypted structure');
      
      // Step 7: Create the record with decrypted data
      const recordWithData = {
        ...record,
        data: recordData, // This is the decrypted data for the doctor
        sharedMetadata: {
          approvedAt: sharedData.approvedAt,
          expiresAt: sharedData.expiresAt,
          reason: sharedData.metadata?.reason,
          patient: sharedData.patient,
          originalCid: sharedRecord.metadata.cid
        }
      };
      
      setSelectedRecord(recordWithData);
      toast.success('Medical record loaded successfully', { id: 'load-record' });
      
    } catch (error) {
      console.error('Error viewing record:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to load medical record: ${errorMessage}`, { id: 'load-record' });
    }
  };

  // Handle adding a new record
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recordForm.patientAddress) {
      toast.error('Please enter a patient address');
      return;
    }
    
    try {
      setRecordForm(prev => ({ ...prev, isSubmitting: true }));
      
      // Create the medical record data
      const recordData = {
        patientAddress: recordForm.patientAddress,
        recordType: recordForm.type,
        recordTitle: recordForm.title, // NEW: Custom record title
        date: new Date().toISOString(),
        provider: account,
        doctorName: "Dr. Provider", // In a real app, get this from profile
        facilityName: "MediDrop Hospital",
        createdAt: new Date().toISOString(),
        metadata: {
          recordFormat: "v1.0",
          encryptionMethod: "AES-256",
          accessControl: "blockchain-based"
        },
        results: recordForm.description,
        notes: recordForm.notes || "No additional notes."
      };
      
      // Generate a unique record ID with type, timestamp with milliseconds, and random component
      const timestamp = new Date().getTime();
      let randomComponent;
      if (window.crypto && window.crypto.getRandomValues) {
        const randomBytes = new Uint8Array(8);
        window.crypto.getRandomValues(randomBytes);
        randomComponent = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        randomComponent = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      }
      const recordName = `${recordForm.type.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${randomComponent}`;
      const recordId = ethers.utils.id(recordName);
      
      console.log("Generated record ID:", recordId);
      console.log("Record data:", recordData);
      
      // Show a loading toast for the IPFS upload
      toast.loading('Uploading to IPFS...', { id: 'ipfs-upload' });
      
      // Update IPFS state
      setIpfsState({
        cid: null,
        isUploading: true,
        error: null
      });
      
      let cid;
      try {
        if (recordForm.file) {
          // Generate encryption key from patient's address
          const encryptionKey = await generateKeyFromPassword(recordForm.patientAddress);
          
          // Read the file
          const fileBuffer = await recordForm.file.arrayBuffer();
          const fileData = new Uint8Array(fileBuffer);
          
          // Encrypt the file data
          const encryptedData = await encryptData(fileData, encryptionKey);
          
          // Upload encrypted data to IPFS
          cid = await uploadToIPFS(
            encryptedData,
            { 
              metadata: { 
                name: recordForm.file.name,
                keyvalues: {
                  patientAddress: recordForm.patientAddress,
                  recordType: recordForm.type,
                  encrypted: true
                }
              }
            }
          );
        } else {
          // Generate encryption key
          const encryptionKey = await generateKeyFromPassword(recordForm.patientAddress);
          
          // Encrypt the record data as JSON string
          const recordDataString = JSON.stringify(recordData);
          const encryptedData = await encryptData(recordDataString, encryptionKey);
          
          // Upload encrypted data to IPFS
          cid = await uploadToIPFS(
            encryptedData,
            {
              metadata: {
                name: recordName,
                keyvalues: {
                  patientAddress: recordForm.patientAddress,
                  recordType: recordForm.type,
                  encrypted: true
                }
              }
            }
          );
        }
        
        console.log("IPFS CID:", cid);
        toast.success('Successfully uploaded to IPFS', { id: 'ipfs-upload' });
        
        // Update IPFS state with success
        setIpfsState({
          cid,
          isUploading: false,
          error: null
        });
      } catch (error) {
        console.error('IPFS upload error:', error);
        toast.error('Failed to upload to IPFS', { id: 'ipfs-upload' });
        
        setIpfsState({
          cid: null,
          isUploading: false,
          error: error instanceof Error ? error.message : 'Failed to upload to IPFS'
        });
        
        throw new Error('Failed to upload to IPFS. Please check your Pinata API keys.');
      }
      
      // Show a loading toast for the blockchain transaction
      toast.loading('Adding record to blockchain...', { id: 'blockchain-tx' });
      
      try {
        // Check if patient has granted access to provider
        console.log("Checking if provider has access to patient records");
        if (!account) {
          throw new Error("Provider account is not available");
        }
        const hasAccessResult = await hasAccess(recordForm.patientAddress, account);
        console.log("Provider has access:", hasAccessResult);
        
        if (!hasAccessResult) {
          toast.error('Access denied. The patient must grant you access before you can add records.', { id: 'blockchain-tx' });
          throw new Error("Patient must grant access to provider first");
        }
        
        // Add the record to the blockchain
        console.log("Adding record to blockchain:", {
          patientAddress: recordForm.patientAddress,
          recordId,
          cid
        });
        
        // Get current timestamp
        const blockchainTimestamp = Math.floor(Date.now() / 1000);
        
        // Call the addRecord function from the hook
        const tx = await addRecord(recordForm.patientAddress, recordId, cid, blockchainTimestamp);
        console.log("Transaction result:", tx);
        
        // Set the success state
        setRecordAddedSuccess({
          patientAddress: recordForm.patientAddress,
          recordId,
          cid,
          timestamp: Date.now()
        });
        
        toast.success('Medical record added successfully!', { id: 'blockchain-tx' });
        
        // Reset form
        setRecordForm({
          patientAddress: '',
          type: '',
          title: '', // NEW: Reset custom title field
          description: '',
          notes: '',
          cid: '',
          file: null,
          isSubmitting: false
        });
        
        // Clear success message after 10 seconds
        setTimeout(() => {
          setRecordAddedSuccess(null);
        }, 10000);
        
      } catch (error) {
        console.error('Blockchain transaction error:', error);
        
        let errorMessage = 'Failed to add record to blockchain';
        
        if (error instanceof Error) {
          if (error.message.includes('user rejected')) {
            errorMessage = 'Transaction rejected. Please approve the transaction in your wallet.';
          } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds to complete the transaction.';
          } else if (error.message.includes('access') || error.message.includes('authorized')) {
            errorMessage = 'Access denied. You may not have permission to add records for this patient.';
          } else {
            errorMessage = `Failed to add record: ${error.message}`;
          }
        }
        
        toast.error(errorMessage, { id: 'blockchain-tx' });
        throw error;
      }
      
    } catch (error: any) {
      console.error('Error adding record:', error);
      toast.error(`Failed to add record: ${error.message || 'Unknown error'}`);
      setRecordAddedSuccess(null);
    } finally {
      setRecordForm(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Load initial data
  useEffect(() => {
    if (isConnected && account && userType === 'provider' && contract) {
      loadPatientAccesses();
    }
  }, [isConnected, account, userType, contract]);

  // Redirect if not connected or not a provider
  if (!isConnected || userType !== 'provider') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Access Denied</h2>
          <p className="mb-6 text-yellow-700">
            You must be connected as a healthcare provider to view medical records.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Provider Dashboard</h1>
      <p className="text-gray-600 mb-8">Manage your patients and medical records.</p>

      {/* Success Message */}
      {recordAddedSuccess && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">Record Added Successfully!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>The medical record was successfully added to the blockchain and IPFS.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <span className="font-medium">Patient:</span> {recordAddedSuccess.patientAddress.substring(0, 10)}...{recordAddedSuccess.patientAddress.substring(recordAddedSuccess.patientAddress.length - 6)}
                  </li>
                  <li>
                    <span className="font-medium">Record ID:</span> {recordAddedSuccess.recordId.substring(0, 10)}...
                  </li>
                  <li>
                    <span className="font-medium">IPFS CID:</span> {recordAddedSuccess.cid}
                  </li>
                  <li>
                    <span className="font-medium">Added:</span> {new Date(recordAddedSuccess.timestamp).toLocaleString()}
                  </li>
                </ul>
              </div>
              <div className="mt-4">
                <button 
                  type="button" 
                  className="text-sm font-medium text-green-700 hover:text-green-600"
                  onClick={() => setRecordAddedSuccess(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('view')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'view'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View Records
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'add'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Add Medical Record
            </button>
          </nav>
        </div>
      </div>

      {/* View Records Tab */}
      {activeTab === 'view' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-blue-50 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Patients with Access</h2>
                <Button 
                  onClick={loadPatientAccesses}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              <div className="border-t border-gray-200">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading patients...</p>
                  </div>
                ) : patientAccesses.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {patientAccesses.map((access, index) => (
                      <li key={`${access.patientAddress}-${access.expiresAt}-${index}`} className="p-4 hover:bg-gray-50">
                        <button
                          onClick={() => {
                            setSelectedPatient(access.patientAddress);
                            loadPatientRecords(access.patientAddress, access.authorizedRecords);
                          }}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {access.patientAddress.substring(0, 6)}...{access.patientAddress.substring(access.patientAddress.length - 4)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {access.authorizedRecords.length} record(s)
                              </p>
                              <p className="text-xs text-gray-500">
                                Expires: {new Date(access.expiresAt * 1000).toLocaleDateString()}
                              </p>
                            </div>
                            {selectedPatient === access.patientAddress && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No access granted</h3>
                    <p className="mt-1 text-sm text-gray-500">No patients have granted you access to their records yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Records List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-green-50">
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedPatient ? 'Medical Records' : 'Select a Patient'}
                </h2>
                {selectedPatient && (
                  <p className="mt-1 text-sm text-gray-600">
                    Records for patient: {selectedPatient.substring(0, 6)}...{selectedPatient.substring(selectedPatient.length - 4)}
                  </p>
                )}
              </div>
              <div className="border-t border-gray-200 p-6">
                {!selectedPatient ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Select a patient</h3>
                    <p className="mt-1 text-sm text-gray-500">Choose a patient from the left to view their medical records.</p>
                  </div>
                ) : loadingRecords ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading medical records...</p>
                  </div>
                ) : patientRecords.length > 0 ? (
                  <div className="space-y-4">
                    {patientRecords.map((record) => {
                      const recordType = record.recordType || 'Other';
                      const typeInfo = getRecordTypeInfo(recordType);
                      const recordTitle = record.recordTitle || 'Medical Record';
                      const providerName = record.provider;
                      const description = `IPFS CID: ${record.cid}`;
                      
                      return (
                        <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center mb-3">
                                <div className={`h-12 w-12 rounded-full ${typeInfo.bgColor} flex items-center justify-center mr-4`}>
                                  <span className="text-2xl">{typeInfo.emoji}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 text-lg">
                                    {recordTitle}
                                  </div>
                                  <div className="text-sm text-gray-600 flex items-center mt-1">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor} mr-2`}>
                                      {recordType}
                                    </span>
                                    <span className="text-gray-500">•</span>
                                    <span className="ml-2">{getTimeSince(record.timestamp)}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mb-3 p-3 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-700 font-mono">{description}</p>
                              </div>
                            
                              <div className="grid grid-cols-2 gap-6 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700 flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Date:
                                  </span>
                                  <p className="text-gray-600 font-medium">{formatRecordDate(record.timestamp)}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700 flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Provider:
                                  </span>
                                  <p className="text-gray-600 font-medium">{providerName}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700 flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Version:
                                  </span>
                                  <p className="text-gray-600">{record.version}</p>
                                </div>
                                <div className="col-span-1">
                                  <button 
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                    onClick={() => {
                                      navigator.clipboard.writeText(record.id);
                                      toast.success('Record ID copied to clipboard');
                                    }}
                                    title="Click to copy Record ID"
                                  >
                                    <span className="font-medium">ID:</span> {record.id.substring(0, 8)}...
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4 flex flex-col space-y-2">
                              <Button
                                onClick={() => viewRecord(record)}
                                size="sm"
                                className="w-full"
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Record
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No accessible records</h3>
                    <p className="mt-1 text-sm text-gray-500">No medical records available for this patient.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medical Record Tab */}
      {activeTab === 'add' && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-green-50">
            <h2 className="text-lg font-medium text-gray-900">Add Medical Record</h2>
            <p className="mt-1 text-sm text-gray-600">
              Create a new medical record for a patient. The patient must have granted you access first.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form onSubmit={handleAddRecord} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="patientAddress" className="block text-sm font-medium text-gray-700">
                    Patient Address *
                  </label>
                  <input
                    type="text"
                    id="patientAddress"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-800"
                    placeholder="0x..."
                    value={recordForm.patientAddress}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, patientAddress: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="recordType" className="block text-sm font-medium text-gray-700">
                    Record Type *
                  </label>
                  <select
                    id="recordType"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-800"
                    value={recordForm.type}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    <option value="">Select a type</option>
                    <option value="Lab Results">Lab Results</option>
                    <option value="Imaging">Imaging</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              {/* NEW: Record Title Field */}
              <div>
                <label htmlFor="recordTitle" className="block text-sm font-medium text-gray-700">
                  Record Title *
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (e.g., "Fever Treatment", "Blood Test Results", "Diabetes Check-up")
                  </span>
                </label>
                <input
                  type="text"
                  id="recordTitle"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-800"
                  placeholder="Enter a specific name for this medical record"
                  value={recordForm.title}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Give this record a specific, meaningful name that patients and doctors can easily understand.
                </p>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-800"
                  placeholder="Brief description of the medical record"
                  value={recordForm.description}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-800"
                  placeholder="Additional notes (optional)"
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload File (optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setRecordForm(prev => ({ ...prev, file: e.target.files![0] }));
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {recordForm.file ? recordForm.file.name : 'PDF, JPG, PNG up to 10MB'}
                    </p>
                  </div>
                </div>
              </div>

              {/* IPFS Upload Status */}
              {ipfsState.isUploading && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                    <p className="text-sm text-blue-800">Uploading to IPFS...</p>
                  </div>
                </div>
              )}

              {ipfsState.cid && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">IPFS Upload Successful!</span>
                    <br />
                    CID: <span className="font-mono break-all">{ipfsState.cid}</span>
                  </p>
                </div>
              )}

              {ipfsState.error && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-800">
                    <span className="font-medium">Upload Error:</span> {ipfsState.error}
                  </p>
                </div>
              )}
              
              <div>
                <Button
                  type="submit" 
                  className="w-full"
                  isLoading={recordForm.isSubmitting}
                >
                  Add Medical Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Medical Record Details
                </h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Patient Shared Access Info */}
              {selectedRecord.sharedMetadata && (
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <h4 className="text-sm font-medium text-green-800">Patient-Approved Access</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-green-700">Approved:</span>
                        <p className="text-green-600">{new Date(selectedRecord.sharedMetadata.approvedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Expires:</span>
                        <p className="text-green-600">{new Date(selectedRecord.sharedMetadata.expiresAt).toLocaleString()}</p>
                      </div>
                      {selectedRecord.sharedMetadata.reason && (
                        <div className="col-span-2">
                          <span className="font-medium text-green-700">Reason:</span>
                          <p className="text-green-600">{selectedRecord.sharedMetadata.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Patient:</p>
                    <p className="text-sm text-gray-600">{selectedRecord.patientAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Record ID:</p>
                    <p className="text-sm text-gray-600 font-mono">{selectedRecord.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date Created:</p>
                    <p className="text-sm text-gray-600">{new Date(selectedRecord.timestamp * 1000).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Version:</p>
                    <p className="text-sm text-gray-600">{selectedRecord.version}</p>
                  </div>
                  {selectedRecord.sharedMetadata?.originalCid && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-700">Original IPFS CID:</p>
                      <p className="text-sm text-gray-600 font-mono break-all">{selectedRecord.sharedMetadata.originalCid}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Medical Record Data:</h4>
                <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedRecord.data ? JSON.stringify(selectedRecord.data, null, 2) : 'Loading...'}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setSelectedRecord(null)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 