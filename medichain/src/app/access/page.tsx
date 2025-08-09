'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry } from '@/lib/hooks';
import { toast } from 'react-hot-toast';
import { fetchFromIPFS, uploadToIPFS, decryptData, encryptData, generateKeyFromPassword } from '@/lib/ipfs';
import { createDoctorSharedData } from '@/lib/doctorAccess';
import { 
  getRecordTitle, 
  getProviderName, 
  getRecordDescription, 
  getRecordTypeInfo, 
  formatRecordDate,
  getTimeSince 
} from '@/lib/recordTypes';
import TranslatedText from '@/components/TranslatedText';

interface ProviderAccess {
  id: number;
  address: string;
  granted: string;
}

const darkPlaceholderStyle = `
  ::placeholder {
    color: #4B5563; /* text-gray-600 */
    opacity: 1;
  }
`;

export default function AccessManagement() {
  const { isConnected, account, userType } = useWallet();
  const { 
    grantAccess, 
    revokeAccess, 
    hasAccess, 
    isRegistered, 
    registerPatient, 
    contract,
    getPendingRequests,
    getAccessRequest,
    approveAccess,
    denyAccess,
    getRecord
  } = useMedicalRegistry();

  const [providerAddress, setProviderAddress] = useState('');
  const [accessList, setAccessList] = useState<ProviderAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [revokeLoadingId, setRevokeLoadingId] = useState<number | null>(null);
  const [registering, setRegistering] = useState(false);
  
  // New state for doctor requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Load pending doctor requests
  const loadPendingRequests = async () => {
    if (!isConnected || !account) return;
    
    try {
      setRequestsLoading(true);
      
      // Get pending request IDs
      const requestIds = await getPendingRequests();
      console.log('Pending request IDs:', requestIds);
      
      // Get details for each request
      const requests = [];
      for (const requestId of requestIds) {
        try {
          const requestData = await getAccessRequest(requestId);
          
          // Decrypt the requested records to get their types and titles
          const recordsWithDetails = [];
          for (const recordId of requestData.requestedRecords) {
            try {
              const record = await getRecord(account, recordId);
              
              // Try to decrypt the record to get the actual data
              let recordType = 'Medical Record';
              let recordTitle = 'Medical Record';
              
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
                const decryptedData = typeof decryptedDataRaw === 'string' ? JSON.parse(decryptedDataRaw) : decryptedDataRaw;
                
                // Extract record type and title
                recordType = decryptedData.recordType || 'Medical Record';
                recordTitle = decryptedData.recordTitle || recordType;
                
                console.log(`Successfully decrypted record ${recordId}:`, { recordType, recordTitle });
              } catch (decryptError) {
                console.warn(`Could not decrypt record ${recordId} for display:`, decryptError);
                // Keep fallback values
              }
              
              recordsWithDetails.push({
                id: recordId,
                type: recordType,
                title: recordTitle
              });
            } catch (error) {
              console.error('Error loading record details:', recordId, error);
              recordsWithDetails.push({
                id: recordId,
                type: 'Medical Record',
                title: 'Medical Record'
              });
            }
          }
          
          requests.push({
            id: requestId,
            doctor: requestData.doctor,
            reason: requestData.reason,
            requestedDuration: requestData.requestedDuration,
            timestamp: requestData.timestamp,
            requestedRecords: requestData.requestedRecords,
            recordsWithDetails: recordsWithDetails
          });
        } catch (error) {
          console.error('Error loading request:', requestId, error);
        }
      }
      
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Handle approving a doctor request with re-encryption
  const handleApproveRequest = async (request: any) => {
    if (!account) {
      toast.error('Patient account not available');
      return;
    }

    try {
      toast.loading('Preparing shared medical data...', { id: 'approve-request' });
      
      // Step 1: Fetch and decrypt each authorized record
      const decryptedRecords = [];
      const patientDecryptionKey = await generateKeyFromPassword(account);
      
      for (const recordId of request.requestedRecords) {
        try {
          console.log(`Fetching record ${recordId} for sharing with doctor...`);
          
          // Get the record metadata from blockchain
          const recordData = await getRecord(account, recordId);
          console.log('Record metadata:', recordData);
          
          // Fetch encrypted data from IPFS
          const encryptedDataRaw = await fetchFromIPFS(recordData.cid);
          console.log('Fetched encrypted data from IPFS, type:', typeof encryptedDataRaw);
          console.log('Raw data structure:', encryptedDataRaw);
          
          // Extract the encrypted content from IPFS response
          let encryptedData: string;
          if (typeof encryptedDataRaw === 'string') {
            // If it's already a string, use it directly
            encryptedData = encryptedDataRaw;
          } else if (encryptedDataRaw && typeof encryptedDataRaw === 'object') {
            // If it's an object, look for content field (Pinata format)
            const dataObj = encryptedDataRaw as any;
            if (dataObj.content && typeof dataObj.content === 'string') {
              encryptedData = dataObj.content;
              console.log('Extracted content from IPFS object');
            } else {
              // Fallback: try to find the base64 data in the object
              console.warn('No content field found, trying to extract base64 data...');
              encryptedData = JSON.stringify(encryptedDataRaw);
            }
          } else {
            throw new Error('Invalid data format received from IPFS');
          }
          
          console.log('Using encrypted data for decryption, length:', encryptedData.length);
          console.log('Data starts with:', encryptedData.substring(0, 50));
          
          // Decrypt the data using patient's key
          const decryptedData = await decryptData(encryptedData, patientDecryptionKey);
          console.log('Successfully decrypted record data');
          
          // Parse the decrypted JSON
          let parsedData;
          if (typeof decryptedData === 'string') {
            parsedData = JSON.parse(decryptedData);
          } else {
            parsedData = decryptedData;
          }
          
          // Store the decrypted record with metadata
          decryptedRecords.push({
            recordId,
            metadata: {
              cid: recordData.cid,
              timestamp: recordData.timestamp,
              provider: recordData.provider,
              version: recordData.version
            },
            data: parsedData
          });
          
        } catch (error) {
          console.error(`Error processing record ${recordId}:`, error);
          toast.error(`Failed to process record ${recordId.substring(0, 8)}...`);
          throw error;
        }
      }
      
      console.log(`Successfully decrypted ${decryptedRecords.length} records`);
      toast.loading('Preparing data for doctor access...', { id: 'approve-request' });
      
      // Step 2: Generate doctor encryption key for structure encryption
      console.log('Generating doctor encryption key for:', request.doctor);
      const doctorEncryptionKey = await generateKeyFromPassword(request.doctor);
      
      // Debug the request object
      console.log('Request object for approval:', request);
      console.log('Request doctor:', request.doctor);
      console.log('Request requestedRecords:', request.requestedRecords);
      console.log('Decrypted records:', decryptedRecords);
      
      // Step 3: Create shared data structure for the doctor (with decrypted data)
      const sharedDataStructure = {
        version: '1.0',
        patient: account,
        doctor: request.doctor,
        authorizedRecords: request.requestedRecords,
        approvedAt: Date.now(),
        expiresAt: Date.now() + (request.requestedDuration * 1000),
        records: decryptedRecords, // Using decrypted records (will be encrypted as part of whole structure)
        metadata: {
          approvalId: request.id,
          reason: request.reason,
          requestedAt: request.timestamp,
          sharedBy: 'patient',
          encryptionType: 'structure-encrypted' // Indicate entire structure is encrypted for doctor
        }
      };
      
      console.log('Created shared data structure:', sharedDataStructure);
      
      // Step 4: Encrypt the ENTIRE shared data structure for doctor
      toast.loading('Encrypting complete data structure for doctor...', { id: 'approve-request' });
      
      const sharedDataString = JSON.stringify(sharedDataStructure, null, 2);
      console.log('Encrypting entire shared data structure with doctor key...');
      const encryptedSharedData = await encryptData(sharedDataString, doctorEncryptionKey);
      console.log('Successfully encrypted complete shared data structure');
      
      // Step 5: Upload the encrypted shared data to IPFS (fully encrypted)
      toast.loading('Uploading encrypted shared data to IPFS...', { id: 'approve-request' });
      
      const sharedDataCid = await uploadToIPFS(encryptedSharedData, {
        metadata: {
          name: `shared-medical-data-${request.id}`,
          keyvalues: {
            patient: account,
            doctor: request.doctor,
            type: 'shared-medical-data',
            recordCount: decryptedRecords.length.toString(),
            approvedAt: Date.now().toString()
          }
        }
      });
      
      console.log('Shared data uploaded to IPFS with CID:', sharedDataCid);
      toast.loading('Finalizing approval on blockchain...', { id: 'approve-request' });
      
      // Step 6: Approve access with the shared data CID
      await approveAccess(request.id, request.requestedRecords, sharedDataCid);

      // Additionally grant persistent write access so the provider can add records
      // (kept silent; no UI text change)
      try {
        await grantAccess(request.doctor);
      } catch (e) {
        console.warn('grantAccess after approveAccess failed (may already be granted):', e);
      }
      
      toast.success(
        `Request approved! Doctor can now access ${decryptedRecords.length} encrypted record${decryptedRecords.length > 1 ? 's' : ''}.`, 
        { id: 'approve-request', duration: 5000 }
      );
      
      // Refresh both lists
      await loadPendingRequests();
      await loadAccessList();
      
    } catch (error) {
      console.error('Error approving request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to approve request: ${errorMessage}`, { id: 'approve-request' });
    }
  };

  // Handle denying a doctor request
  const handleDenyRequest = async (request: any) => {
    try {
      toast.loading('Denying request...', { id: 'deny-request' });
      
      await denyAccess(request.id);
      
      toast.success('Request denied', { id: 'deny-request' });
      
      // Refresh pending requests
      await loadPendingRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      toast.error('Failed to deny request', { id: 'deny-request' });
    }
  };

  // Check for all providers with access
  const loadAccessList = async () => {
    if (!isConnected || !account) return;
    
    setLoading(true);
    try {
      const providers = [];
      
      // Get all AccessGranted events for this patient
      if (contract) {
        try {
          const filter = contract.filters.AccessGranted(account);
          const events = await contract.queryFilter(filter);
          console.log("AccessGranted events found:", events);
          
          // Build a set of unique provider addresses
          const providerAddresses = new Set<string>();
          
          for (const event of events) {
            if (event.args && event.args.provider) {
              providerAddresses.add(event.args.provider.toLowerCase());
            }
          }
          
          // Check if each provider still has access (not revoked)
          let id = 1;
          for (const providerAddress of providerAddresses) {
            try {
              const stillHasAccess = await hasAccess(account, providerAddress);
              if (stillHasAccess) {
                // Get the grant date from the earliest event for this provider
                const providerEvents = events.filter((e: any) => 
                  e.args?.provider?.toLowerCase() === providerAddress
                );
                const earliestEvent = providerEvents[0];
                
                let grantedDate = "Unknown";
                if (earliestEvent) {
                  try {
                    const block = await earliestEvent.getBlock();
                    grantedDate = new Date(block.timestamp * 1000).toISOString().split('T')[0];
                  } catch (error) {
                    console.error("Error getting block timestamp:", error);
                    grantedDate = "Event found";
                  }
                }
                
                providers.push({
                  id: id++,
                  address: providerAddress,
                  granted: grantedDate
                });
              }
            } catch (error) {
              console.error(`Error checking access for ${providerAddress}:`, error);
            }
          }
        } catch (error) {
          console.error("Error querying AccessGranted events:", error);
        }
      }
      
      // Also check the demo provider if no events were found
      if (providers.length === 0) {
        const demoProviderAddress = "0xBcd4042DE499D14e55001CcbB24a551F3b954096";
        try {
          const hasAccessResult = await hasAccess(account, demoProviderAddress);
          if (hasAccessResult) {
            providers.push({
              id: 1,
              address: demoProviderAddress,
              granted: "Demo Setup"
            });
          }
        } catch (error) {
          console.error("Error checking demo provider access:", error);
        }
      }
      
      console.log("Final providers list:", providers);
      setAccessList(providers);
    } catch (error) {
      console.error("Error loading access list:", error);
      toast.error("Failed to load access list");
    } finally {
      setLoading(false);
    }
  };

  // Load initial lists (pending requests should load even if not yet registered)
  useEffect(() => {
    if (!isConnected || !account) return;
    if (isRegistered) {
      loadAccessList();
    }
    loadPendingRequests();
  }, [isConnected, account, isRegistered]);

  // Set up event listeners for automatic updates
  useEffect(() => {
    if (!contract || !account) return;

    const grantFilter = contract.filters.AccessGranted(account);
    const revokeFilter = contract.filters.AccessRevoked(account);
    const requestFilter = contract.filters.AccessRequested(null, null, account);

    const onGrant = (_patient: string, provider: string) => {
      console.log("AccessGranted event received:", { _patient, provider });
      loadAccessList();
    };
    
    const onRevoke = (_patient: string, provider: string) => {
      console.log("AccessRevoked event received:", { _patient, provider });
      loadAccessList();
    };

    const onRequested = (_requestId: string, doctor: string, patient: string) => {
      if (patient.toLowerCase() === account.toLowerCase()) {
        loadPendingRequests();
      }
    };

    contract.on(grantFilter, onGrant);
    contract.on(revokeFilter, onRevoke);
    contract.on(requestFilter, onRequested);
    
    return () => {
      contract.off(grantFilter, onGrant);
      contract.off(revokeFilter, onRevoke);
      contract.off(requestFilter, onRequested);
    };
  }, [contract, account]); // Removed loadAccessList to avoid circular dependency

  // Handle patient registration
  const handleRegister = async () => {
    if (!isConnected || !account) return;
    
    setRegistering(true);
    try {
      await registerPatient();
      toast.success("Successfully registered as patient!");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setRegistering(false);
    }
  };

  // Handle granting access to a provider
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!providerAddress || !account) {
      toast.error("Please enter a provider address");
      return;
    }
    
    // Basic address validation
    if (!providerAddress.startsWith('0x') || providerAddress.length !== 42) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }
    
    setGrantLoading(true);
    
    try {
      toast.loading('Granting access...', { id: 'grant-tx' });
      console.log("Granting access to:", providerAddress);
      
      await grantAccess(providerAddress);
      
      toast.success('Access granted successfully!', { id: 'grant-tx' });
      
      // Reload the access list to reflect the new grant
      await loadAccessList();
      
      setProviderAddress('');
    } catch (error: any) {
      console.error('Error granting access:', error);
      toast.error(`Failed to grant access: ${error.message || 'Unknown error'}`, { id: 'grant-tx' });
    } finally {
      setGrantLoading(false);
    }
  };

  // Handle revoking access from a provider
  const handleRevokeAccess = async (providerId: number, providerAddress: string) => {
    if (!account) return;
    
    setRevokeLoadingId(providerId);
    
    try {
      toast.loading('Revoking access...', { id: 'revoke-tx' });
      console.log("Revoking access from:", providerAddress);
      
      await revokeAccess(providerAddress);
      
      toast.success('Access revoked successfully!', { id: 'revoke-tx' });
      
      // Reload the access list to reflect the revocation
      await loadAccessList();
    } catch (error: any) {
      console.error('Error revoking access:', error);
      toast.error(`Failed to revoke access: ${error.message || 'Unknown error'}`, { id: 'revoke-tx' });
    } finally {
      setRevokeLoadingId(null);
    }
  };

  // Redirect if not connected
  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">
            <TranslatedText>Not Connected</TranslatedText>
          </h2>
          <p className="mb-6 text-yellow-700">
            <TranslatedText>
              Please connect your wallet to manage access to your medical records.
            </TranslatedText>
          </p>
          <Button onClick={() => window.location.href = '/'}>
            <TranslatedText>Return to Home</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  // Only patients can manage access
  if (userType !== 'patient') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">
            <TranslatedText>Access Denied</TranslatedText>
          </h2>
          <p className="mb-6 text-yellow-700">
            <TranslatedText>
              Only patients can manage access to their medical records.
            </TranslatedText>
          </p>
          <Button onClick={() => window.location.href = '/'}>
            <TranslatedText>Return to Home</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  // Show registration prompt if not registered
  if (!isRegistered) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            <TranslatedText>Registration Required</TranslatedText>
          </h2>
          <p className="mb-6 text-blue-700">
            <TranslatedText>
              You need to register as a patient before you can manage access to your medical records.
            </TranslatedText>
          </p>
          <Button onClick={handleRegister} isLoading={registering}>
            <TranslatedText>Register as Patient</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style jsx global>{darkPlaceholderStyle}</style>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        <TranslatedText>Access Management</TranslatedText>
      </h1>
      <p className="text-gray-600 mb-8">
        <TranslatedText>
          Control who can access your medical records.
        </TranslatedText>
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Grant Access Form */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-blue-50">
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Grant Access</TranslatedText>
            </h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-600 mb-4">
              <TranslatedText>
                Grant access to a healthcare provider by entering their wallet address.
              </TranslatedText>
            </p>
            <form onSubmit={handleGrantAccess}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <label htmlFor="providerAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText>Provider Wallet Address</TranslatedText>
                  </label>
                  <input
                    type="text"
                    id="providerAddress"
                    value={providerAddress}
                    onChange={(e) => setProviderAddress(e.target.value)}
                    placeholder="0x..."
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" isLoading={grantLoading}>
                    <TranslatedText>Grant Access</TranslatedText>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Current Access List */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-blue-50 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Current Access</TranslatedText>
            </h2>
            <Button 
              onClick={loadAccessList} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <TranslatedText>Refreshing...</TranslatedText> : <TranslatedText>Refresh</TranslatedText>}
            </Button>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">
                  <TranslatedText>Loading access list...</TranslatedText>
                </p>
              </div>
            ) : accessList.length > 0 ? (
              <div className="space-y-4">
                {accessList.map((provider) => (
                  <div key={provider.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 truncate max-w-xs">
                        {provider.address.substring(0, 6)}...{provider.address.substring(provider.address.length - 4)}
                      </div>
                      <div className="text-sm text-gray-500">
                        <TranslatedText>Granted:</TranslatedText> {provider.granted}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRevokeAccess(provider.id, provider.address)}
                      disabled={revokeLoadingId === provider.id}
                      variant="outline"
                      size="sm"
                    >
                      {revokeLoadingId === provider.id ? <TranslatedText>Revoking...</TranslatedText> : <TranslatedText>Revoke</TranslatedText>}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <TranslatedText>
                  No providers have been granted access yet.
                </TranslatedText>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Pending Doctor Requests */}
      <div className="mt-8 bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-orange-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Pending Doctor Requests</TranslatedText>
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              <TranslatedText>
                Doctors requesting access to your medical records
              </TranslatedText>
            </p>
          </div>
          <Button 
            onClick={loadPendingRequests} 
            disabled={requestsLoading}
            variant="outline"
            size="sm"
          >
            {requestsLoading ? <TranslatedText>Loading...</TranslatedText> : <TranslatedText>Refresh</TranslatedText>}
          </Button>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          {requestsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">
                <TranslatedText>Loading requests...</TranslatedText>
              </p>
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                          <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            <TranslatedText>Doctor Request</TranslatedText>
                          </div>
                          <div className="text-sm text-gray-600">
                            <TranslatedText>From:</TranslatedText> {request.doctor.substring(0, 6)}...{request.doctor.substring(request.doctor.length - 4)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            <TranslatedText>Reason:</TranslatedText>
                          </span>
                          <p className="text-gray-600 mt-1">{request.reason}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            <TranslatedText>Requested:</TranslatedText>
                          </span>
                          <p className="text-gray-600">{new Date(request.timestamp * 1000).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            <TranslatedText>Duration:</TranslatedText>
                          </span>
                          <p className="text-gray-600">{Math.floor(request.requestedDuration / (24 * 60 * 60))} <TranslatedText>days</TranslatedText></p>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <span className="font-medium text-gray-700">
                            <TranslatedText>Requested Records:</TranslatedText>
                          </span>
                          <div className="mt-2 space-y-2">
                            {request.recordsWithDetails?.slice(0, 3).map((record: any, index: number) => (
                              <div key={record.id} className="flex items-center text-sm">
                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                                  <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                                </div>
                                <span className="text-gray-600 font-mono text-xs">
                                  {record.id.substring(0, 8)}...
                                </span>
                                <span className="text-gray-500 ml-2">• {record.title}</span>
                              </div>
                            ))}
                            {request.requestedRecords.length > 3 && (
                              <div className="text-sm text-gray-500 italic">
                                ...and {request.requestedRecords.length - 3} <TranslatedText>more record(s)</TranslatedText>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        onClick={() => handleApproveRequest(request)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <TranslatedText>Approve</TranslatedText>
                      </Button>
                      <Button
                        onClick={() => handleDenyRequest(request)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <TranslatedText>Deny</TranslatedText>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                <TranslatedText>No pending requests</TranslatedText>
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                <TranslatedText>
                  No doctors have requested access to your records yet.
                </TranslatedText>
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-lg font-medium text-green-800 mb-2">
          <TranslatedText>How Access Control Works</TranslatedText>
        </h3>
        <div className="text-sm text-green-700 space-y-2">
          <p><strong><TranslatedText>1. Grant Access:</TranslatedText></strong> <TranslatedText>You (the patient) grant permission to a healthcare provider using their wallet address.</TranslatedText></p>
          <p><strong><TranslatedText>2. Provider Adds Records:</TranslatedText></strong> <TranslatedText>The provider can then add multiple medical records to your account until you revoke their access.</TranslatedText></p>
          <p><strong><TranslatedText>3. Revoke Access:</TranslatedText></strong> <TranslatedText>You can revoke a provider's access at any time, preventing them from adding more records.</TranslatedText></p>
          <p><strong><TranslatedText>4. Demo Provider:</TranslatedText></strong> <TranslatedText>The provider address</TranslatedText> <code>0xBcd...4096</code> <TranslatedText>is set up for demo purposes.</TranslatedText></p>
        </div>
      </div>
    </div>
  );
} 