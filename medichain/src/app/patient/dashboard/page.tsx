'use client';

// Add this comment to make it clear this page should only run on client side
/* 
 * This page contains client-side only functionality for:
 * - MetaMask wallet integration
 * - IPFS interactions
 * - Blockchain contract calls
 */

import React, { useEffect, useState, Suspense } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry, MedicalRecord } from '@/lib/hooks';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import TranslatedText from '@/components/TranslatedText';
// No need for manual translation components - using full page translator

// Add this after the imports
const darkPlaceholderStyle = `
  ::placeholder {
    color: #4B5563; /* text-gray-600 */
    opacity: 1;
  }
`;

// Create a client-side only wrapper component for IPFS
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  if (!hasMounted) return null;
  
  return <>{children}</>;
};

// Add this interface for the decrypted medical record data
interface MedicalRecordData {
  recordType?: string;
  date?: string;
  provider?: string;
  notes?: string;
  [key: string]: unknown;
}

interface RecordWithId extends MedicalRecord {
  id: string;
  type: string;
  description: string;
}

// Loading component
function LoadingDashboard() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold mb-4">
          <TranslatedText>Loading Dashboard...</TranslatedText>
        </h2>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main dashboard component wrapped in Suspense and ClientOnly
export default function PatientDashboard() {
  return (
    <Suspense fallback={<LoadingDashboard />}>
      <ClientOnly>
        <PatientDashboardContent />
      </ClientOnly>
    </Suspense>
  );
}

// The actual dashboard component with all client-side functionality
function PatientDashboardContent() {
  const { isConnected, account, userType } = useWallet();
  // const { t } = use(); // No longer needed with 
  const { 
    isRegistered, 
    loading, 
    error, 
    registerPatient, 
    getRecordIds, 
    getRecord 
  } = useMedicalRegistry();
  
  const [records, setRecords] = useState<RecordWithId[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [ipfsModule, setIpfsModule] = useState<any>(null);
  
  // Load IPFS module dynamically on client side
  useEffect(() => {
    const loadIpfsModule = async () => {
      try {
        const module = await import('@/lib/ipfs');
        setIpfsModule(module);
      } catch (err) {
        console.error('Failed to load IPFS module:', err);
      }
    };
    
    loadIpfsModule();
  }, []);

  // Fetch records when account is connected
  useEffect(() => {
    const fetchRecords = async () => {
      if (!isConnected || !account || !isRegistered) return;
      
      try {
        setLoadingRecords(true);
        // Get all record IDs for the patient
        const recordIds = await getRecordIds(account);
        
        // Fetch details for each record
        const recordPromises = recordIds.map(async (recordIdBytes: string) => {
          try {
            const record = await getRecord(account, recordIdBytes);
            
            // Convert bytes32 to string for display
            let recordId = '';
            try {
              recordId = ethers.utils.parseBytes32String(recordIdBytes);
            } catch (e) {
              // If it can't be parsed as a string, use the hex representation
              recordId = recordIdBytes.substring(0, 10) + '...';
            }
            
            // For now, we'll add placeholder data for type and description
            return {
              ...record,
              id: recordId,
              type: 'Medical Record',
              description: `IPFS CID: ${record.cid}`
            };
          } catch (e) {
            console.error('Error fetching record:', e);
            return null;
          }
        });
        
        const fetchedRecords = (await Promise.all(recordPromises)).filter(Boolean) as RecordWithId[];
        setRecords(fetchedRecords);
      } catch (e) {
        console.error('Error fetching records:', e);
      } finally {
        setLoadingRecords(false);
      }
    };
    
    fetchRecords();
  }, [isConnected, account, isRegistered, getRecordIds, getRecord]);

  // Handle registration
  const handleRegister = async () => {
    try {
      if (!isConnected) {
        toast.error('Please connect your wallet first');
        return;
      }

      toast.loading('Registering as patient...', { id: 'register' });
      const success = await registerPatient();
      
      if (success) {
        toast.success('Successfully registered as patient!', { id: 'register' });
      } else {
        // Use optional chaining and nullish coalescing to safely access error
        const errorMessage = error || 'Failed to register. Please try again.';
        toast.error(errorMessage, { id: 'register' });
      }
    } catch (e) {
      console.error('Error registering:', e);
      const errorMessage = e instanceof Error ? e.message : 'Registration failed';
      toast.error(errorMessage, { id: 'register' });
    }
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
              You must be connected as a patient to view this dashboard.
            </TranslatedText>
          </p>
          <Button onClick={() => window.location.href = '/'}>
            <TranslatedText>Return to Home</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  // If not registered, show registration prompt
  if (!isRegistered && !loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            <TranslatedText>Registration Required</TranslatedText>
          </h2>
          <p className="mb-6 text-blue-700">
            <TranslatedText>
              You need to register as a patient to access the MediDrop platform.
            </TranslatedText>
          </p>
          <Button onClick={handleRegister} isLoading={loading}>
            <TranslatedText>Register as Patient</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  // View record function
  const viewRecord = async (cid: string) => {
    try {
      if (!account) {
        toast.error('Please connect your wallet');
        return;
      }
      
      if (!ipfsModule) {
        toast.error('IPFS module not loaded yet. Please try again in a moment.');
        return;
      }
      
      // Show loading state
      toast.loading('Fetching record from IPFS...', { id: 'fetch-record' });
      
      // Generate decryption key from patient's address
      const decryptionKey = await ipfsModule.generateKeyFromPassword(account);
      
      // Fetch encrypted data from IPFS
      const ipfsResponse = await ipfsModule.fetchFromIPFS(cid);
      
      // Extract the encrypted content from the response
      // If the response is an object with a content field, use that
      // Otherwise assume the response itself is the encrypted content
      const encryptedData = typeof ipfsResponse === 'object' && ipfsResponse !== null && 'content' in ipfsResponse 
        ? ipfsResponse.content as string
        : ipfsResponse as string;
        
      // Decrypt the data
      const decryptedData = await ipfsModule.decryptData(encryptedData, decryptionKey);
        
      // Success message
      toast.success('Record retrieved successfully', { id: 'fetch-record' });
      
      // Display the record data
      // In a real app, you would show this in a modal or detailed view
      console.log('Record Data:', decryptedData);
      
      // For demo purposes, show a simple alert with some data
      alert(
        `Record Details:\n` +
        `Type: ${decryptedData.recordType || 'Unknown'}\n` +
        `Date: ${decryptedData.date || 'Unknown'}\n` +
        `Provider: ${decryptedData.provider || 'Unknown'}\n` +
        `Notes: ${decryptedData.notes || 'No notes'}`
      );
      
    } catch (error) {
      console.error('Error retrieving record:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve record from IPFS';
      toast.error(errorMessage, { id: 'fetch-record' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style jsx global>{darkPlaceholderStyle}</style>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        <TranslatedText>Patient Dashboard</TranslatedText>
      </h1>
      <p className="text-gray-600 mb-8">
        <TranslatedText>
          Welcome back! Here's an overview of your medical records.
        </TranslatedText>
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Patient Info Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-blue-50">
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Patient Information</TranslatedText>
            </h2>
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
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  <TranslatedText>Registration Status</TranslatedText>
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">
                    <TranslatedText>Registered</TranslatedText>
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-blue-50">
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Quick Actions</TranslatedText>
            </h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => window.location.href = '/records'} className="w-full">
                <TranslatedText>View Records</TranslatedText>
              </Button>
              <Button onClick={() => window.location.href = '/access'} variant="secondary" className="w-full">
                <TranslatedText>Manage Access</TranslatedText>
              </Button>
              <Button onClick={() => window.location.href = '/emergency'} variant="outline" className="w-full">
                <TranslatedText>Emergency Settings</TranslatedText>
              </Button>
              <Button variant="outline" className="w-full">
                <TranslatedText>Upload New Record</TranslatedText>
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Records Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-blue-50 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Recent Medical Records</TranslatedText>
            </h2>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/records'}>
              <TranslatedText>View All</TranslatedText>
            </Button>
          </div>
          <div className="border-t border-gray-200">
            {loadingRecords ? (
              <div className="p-6 text-center text-gray-500">
                <TranslatedText>Loading records...</TranslatedText>
              </div>
            ) : records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <TranslatedText>Date</TranslatedText>
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
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.timestamp * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <TranslatedText>{record.type}</TranslatedText>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {record.provider}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono break-all">{record.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => viewRecord(record.cid)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <TranslatedText>View Record</TranslatedText>
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <TranslatedText>Delete</TranslatedText>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <TranslatedText>No records found.</TranslatedText>
              </div>
            )}
          </div>
        </div>

        {/* Access Requests Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-blue-50 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Access Management</TranslatedText>
            </h2>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/access'}>
              <TranslatedText>Manage</TranslatedText>
            </Button>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-6 py-8 text-center text-gray-500">
              <TranslatedText>
                Manage who can access your medical records in the Access Management section.
              </TranslatedText>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 