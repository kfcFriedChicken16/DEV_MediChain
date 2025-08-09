'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry } from '@/lib/hooks';
import { toast } from 'react-hot-toast';
import { 
  uploadEmergencyData, 
  fetchEmergencyData, 
  createEmptyEmergencyData, 
  EmergencyContact, 
  EmergencySettings as EmergencySettingsType,
  EmergencyData
} from '@/lib/emergencyData';
import ZKEmergencyQRGenerator from '@/components/ZKEmergencyQRGenerator';
import { storeEmergencyData, EmergencyInfo } from '@/lib/emergencyQRLookup';
import TranslatedText from '@/components/TranslatedText';

// Add dark placeholder style for consistency
const darkPlaceholderStyle = `
  ::placeholder {
    color: #4B5563; /* text-gray-600 */
    opacity: 1;
  }
`;

export default function EmergencySettings() {
  const { isConnected, account, userType } = useWallet();
  const { 
    updateEmergencyData, 
    getEmergencyDataCid, 
    setEmergencyAccess,
    isEmergencyAccessAllowed
  } = useMedicalRegistry();
  
  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for tracking unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // State for new contact form
  const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({ 
    name: '', 
    relationship: '', 
    phoneNumber: '',
    address: '',
    email: '',
    notes: ''
  });
  
  // State for emergency data
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null);
  const [emergencyCid, setEmergencyCid] = useState<string>('');
  
  // State for emergency settings
  const [settings, setSettings] = useState<EmergencySettingsType>({
    allowEmergencyAccess: true,
    notifyContacts: true,
    shareAllergies: true,
    shareBloodType: true,
    shareMedications: true,
    shareChronicConditions: true,
    shareEmergencyNotes: true,
    shareFullHistory: false,
  });

  // State for emergency medical information
  const [medicalInfo, setMedicalInfo] = useState({
    bloodType: '',
    allergies: '',
    currentMedications: '',
    chronicConditions: '',
    emergencyNotes: '',
    height: '',
    weight: '',
    primaryCarePhysician: '',
    insuranceInfo: '',
    recentSurgeries: '',
    pregnancyStatus: '',
    languagePreference: '',
    organDonor: false,
    dnrOrder: false
  });

  // State for success notification
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({
    title: '',
    details: {},
    timestamp: ''
  });
  const [activeTab, setActiveTab] = useState<'access' | 'setup'>('access');

  // Keep track of timeouts for cleanup
  const timeoutRefs = React.useRef<NodeJS.Timeout[]>([]);

  // Add warning for unsaved changes when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];
    };
  }, []);

  // Load emergency data on component mount
  useEffect(() => {
    let mounted = true; // Flag to track if component is still mounted
    
    const loadEmergencyData = async () => {
      if (!isConnected || !account || !mounted) return;
      
      try {
        if (mounted) setIsLoading(true);
        
        // Try to get the emergency data CID from the contract
        let cid;
        try {
          cid = await getEmergencyDataCid(account);
        } catch (error) {
          console.log('No emergency data found on contract, creating new data');
        }
        
        if (!mounted) return; // Check if component is still mounted
        
        if (cid) {
          // If CID exists, fetch the data from IPFS
          try {
            const data = await fetchEmergencyData(cid, account);
            if (!mounted) return; // Check again after async operation
            
            setEmergencyData(data);
            
            // Load medical information from the data
            if (data.medicalData) {
              setMedicalInfo({
                bloodType: data.medicalData.bloodType || '',
                allergies: Array.isArray(data.medicalData.allergies) ? data.medicalData.allergies.join(', ') : '',
                currentMedications: Array.isArray(data.medicalData.medications) ? data.medicalData.medications.join(', ') : '',
                chronicConditions: Array.isArray(data.medicalData.conditions) ? data.medicalData.conditions.join(', ') : '',
                emergencyNotes: data.medicalData.notes || '',
                height: '',
                weight: '',
                primaryCarePhysician: '',
                insuranceInfo: '',
                recentSurgeries: '',
                pregnancyStatus: '',
                languagePreference: '',
                organDonor: data.medicalData.organDonor || false,
                dnrOrder: data.medicalData.dnrOrder || false
              });
            }
            
            // Also update settings based on the blockchain
            const isAllowed = await isEmergencyAccessAllowed(account);
            if (!mounted) return; // Check again after async operation
            
            setSettings(prevSettings => ({
              ...prevSettings,
              allowEmergencyAccess: isAllowed
            }));
            
                         // Try to get the emergency CID from localStorage or derive it
             try {
               const storedEmergencyCid = localStorage.getItem(`emergencyCid_${account}`);
               if (storedEmergencyCid) {
                 if (!mounted) return;
                 setEmergencyCid(storedEmergencyCid);
               } else {
                 // Fallback: derive emergency CID (this will be a simplified version)
                 const { deriveEmergencyCid } = await import('@/lib/emergencyData');
                 const emergencyCid = deriveEmergencyCid(data, account);
                 if (!mounted) return;
                 setEmergencyCid(emergencyCid);
               }
             } catch (error) {
               console.log('Could not get emergency CID, but regular data is available');
             }
          } catch (error) {
            if (!mounted) return; // Don't show errors if component unmounted
            
            console.error('Error fetching emergency data:', error);
            toast.error('Failed to load emergency data');
            
            // Create empty data as fallback
            const emptyData = createEmptyEmergencyData(account);
            setEmergencyData(emptyData);
          }
        } else {
          if (!mounted) return;
          
          // If no CID, create empty data
          const emptyData = createEmptyEmergencyData(account);
          setEmergencyData(emptyData);
        }
      } catch (error) {
        if (!mounted) return; // Don't show errors if component unmounted
        
        console.error('Error in loadEmergencyData:', error);
        toast.error('Failed to load emergency data');
      } finally {
        if (mounted) {
          setIsLoading(false);
          // Reset unsaved changes when loading fresh data
          setHasUnsavedChanges(false);
        }
      }
    };
    
    loadEmergencyData().catch(error => {
      if (mounted) {
        console.error('Unhandled error in loadEmergencyData:', error);
      }
    });
    
    // Cleanup function
    return () => {
      mounted = false; // Set flag to false when component unmounts
    };
  }, [isConnected, account, getEmergencyDataCid, isEmergencyAccessAllowed]);

  // Handle adding a new contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emergencyData) {
      toast.error('Emergency data not loaded yet. Please wait and try again.');
      return;
    }
    
    if (!newContact.name?.trim() || !newContact.relationship?.trim() || !newContact.phoneNumber?.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Generate a unique ID for the contact
    const contactId = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the new contact
    const contact: EmergencyContact = {
      id: contactId,
      name: newContact.name.trim(),
      relationship: newContact.relationship.trim(),
      phoneNumber: newContact.phoneNumber.trim(),
      email: newContact.email?.trim(),
      address: newContact.address?.trim(),
      notes: newContact.notes?.trim(),
      lastUpdated: Date.now()
    };
    
    // Add to emergency data
    const updatedData = {
      ...emergencyData,
      contacts: [...emergencyData.contacts, contact],
      lastUpdated: Date.now()
    };
    
    // Update state
    setEmergencyData(updatedData);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
    
    // Clear form
    setNewContact({ 
      name: '', 
      relationship: '', 
      phoneNumber: '',
      address: '',
      email: '',
      notes: ''
    });
    
    // Show toast with save reminder
    toast.success('Contact added! Remember to save your changes to persist them.', { 
      duration: 4000,
      icon: '⚠️'
    });
  };

  // Handle removing a contact
  const handleRemoveContact = (id: string) => {
    if (!emergencyData) return;
    
    const updatedData = {
      ...emergencyData,
      contacts: emergencyData.contacts.filter(contact => contact.id !== id),
      lastUpdated: Date.now()
    };
    
    setEmergencyData(updatedData);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
    toast.success('Contact removed! Remember to save your changes to persist them.', { 
      duration: 4000,
      icon: '⚠️'
    });
  };

  // Handle settings change
  const handleSettingChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }));
    
    // If changing emergency access, update on blockchain immediately
    if (name === 'allowEmergencyAccess') {
      try {
        await setEmergencyAccess(checked);
        toast.success(`Emergency access ${checked ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('Error setting emergency access:', error);
        toast.error('Failed to update emergency access setting');
        
        // Revert the setting change
        setSettings(prev => ({
          ...prev,
          [name]: !checked
        }));
      }
    }
  };

  // Handle medical information changes
  const handleMedicalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setMedicalInfo(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setMedicalInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    setHasUnsavedChanges(true);
  };

  // Handle saving all settings
  const handleSaveSettings = async () => {
    if (!account || !emergencyData) return;
    
    try {
      setIsSaving(true);
      toast.loading('Saving emergency data...', { id: 'save-emergency' });
      
      // Update the emergency data with current settings and medical information
      const updatedData = {
        ...emergencyData,
        medicalData: {
          ...emergencyData.medicalData,
          bloodType: medicalInfo.bloodType,
          allergies: medicalInfo.allergies.split(',').map(item => item.trim()).filter(item => item.length > 0),
          conditions: medicalInfo.chronicConditions.split(',').map(item => item.trim()).filter(item => item.length > 0),
          medications: medicalInfo.currentMedications.split(',').map(item => item.trim()).filter(item => item.length > 0),
          notes: medicalInfo.emergencyNotes,
          organDonor: medicalInfo.organDonor,
          dnrOrder: medicalInfo.dnrOrder,
          lastVerifiedDate: Date.now()
        },
        lastUpdated: Date.now()
      };
      
      // Upload to IPFS (now returns both regular and emergency CIDs)
      const { regularCid, emergencyCid: newEmergencyCid } = await uploadEmergencyData(updatedData, account);
      
      // Update the regular CID on the blockchain
      await updateEmergencyData(regularCid);

      // Mark onboarding completion so a global success banner can appear once
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('medichain_onboarding_just_completed', 'true');
        }
      } catch (e) {
        // non-critical
      }
      
             // Store the emergency CID for display and persistence
       setEmergencyCid(newEmergencyCid);
       // Also store in localStorage for persistence across page refreshes
       localStorage.setItem(`emergencyCid_${account}`, newEmergencyCid);
      
      toast.success('Emergency data saved successfully', { id: 'save-emergency' });
      
      // Store in ZK lookup for fast emergency access
      try {
        const zkEmergencyInfo: EmergencyInfo = {
          patientAddress: account,
          bloodType: updatedData.medicalData.bloodType || 'Unknown',
          allergies: updatedData.medicalData.allergies || [],
          conditions: updatedData.medicalData.conditions || [],
          medications: updatedData.medicalData.medications || [],
          contacts: updatedData.contacts?.map(contact => ({
            name: contact.name,
            phone: contact.phoneNumber,
            relation: contact.relationship
          })) || [],
          organDonor: updatedData.medicalData.organDonor || false,
          dnrOrder: updatedData.medicalData.dnrOrder || false,
          notes: updatedData.medicalData.notes || '',
          lastUpdated: updatedData.lastUpdated
        };
        
        const lookupKey = storeEmergencyData(account, zkEmergencyInfo);
        console.log('🚀 Emergency data stored in ZK lookup with key:', lookupKey);
        toast.success('⚡ Emergency QR ready for instant access!', { duration: 4000 });
      } catch (zkError) {
        console.error('Failed to store in ZK lookup:', zkError);
        toast.error('Emergency QR generation failed - check console');
      }
      
      // Clear unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Show success notification
      setSuccessMessage({
        title: 'Emergency Data Saved Successfully!',
        details: {
          'Patient': `${account.substring(0, 6)}...${account.substring(account.length - 4)}`,
          'Contacts': `${emergencyData.contacts.length} contact${emergencyData.contacts.length !== 1 ? 's' : ''}`,
          'Regular CID': `${regularCid.substring(0, 10)}...${regularCid.substring(regularCid.length - 10)}`,
          'Emergency CID': `${emergencyCid.substring(0, 10)}...${emergencyCid.substring(emergencyCid.length - 10)}`,
        },
        timestamp: new Date().toLocaleString()
      });
      setShowSuccess(true);
      
      // Hide success notification after 10 seconds
      const timeoutId = setTimeout(() => {
        setShowSuccess(false);
      }, 10000);
      
      // Store timeout ID for cleanup
      timeoutRefs.current.push(timeoutId);
    } catch (error) {
      console.error('Error saving emergency data:', error);
      toast.error('Failed to save emergency data', { id: 'save-emergency' });
    } finally {
      setIsSaving(false);
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
              Please connect your wallet to manage emergency settings.
            </TranslatedText>
          </p>
          <Button onClick={() => window.location.href = '/'}>
            <TranslatedText>Return to Home</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  // Only patients can manage emergency settings
  if (userType !== 'patient') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">
            <TranslatedText>Access Denied</TranslatedText>
          </h2>
          <p className="mb-6 text-yellow-700">
            <TranslatedText>
              Only patients can manage emergency settings.
            </TranslatedText>
          </p>
          <Button onClick={() => window.location.href = '/'}>
            <TranslatedText>Return to Home</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Emergency Access Settings</h1>
        <div className="flex justify-center items-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-700">Loading emergency data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style jsx global>{darkPlaceholderStyle}</style>
      {/* Onboarding instruction banner (top, red) */}
      <div className="mb-8">
        <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 sm:p-8 text-green-900 shadow-sm">
          <div className="font-semibold text-xl sm:text-2xl mb-2">
            <TranslatedText>Complete this step to continue</TranslatedText>
          </div>
          <p className="text-base sm:text-lg leading-7">
            <TranslatedText>
              New patients must save their emergency information (including at least one emergency contact) to Pinata. Once saved, you can access the rest of MediDrop.
            </TranslatedText>
          </p>
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        <TranslatedText>Emergency Settings</TranslatedText>
      </h1>
      <p className="text-gray-600 mb-4">
        <TranslatedText>
          Configure your emergency medical information and access settings.
        </TranslatedText>
      </p>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('access')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium ${activeTab === 'access' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            <TranslatedText>Emergency Access</TranslatedText>
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium ${activeTab === 'setup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            <TranslatedText>Setup</TranslatedText>
          </button>
        </nav>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Emergency Access Settings</h1>
        {hasUnsavedChanges && (
          <div className="flex items-center bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
            <svg className="h-5 w-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-yellow-800">
              <TranslatedText>You have unsaved changes</TranslatedText>
            </span>
          </div>
        )}
      </div>

      {activeTab === 'access' && (
      <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong><TranslatedText>Important:</TranslatedText></strong> <TranslatedText>All changes to your emergency contacts and settings must be saved to persist them permanently. Unsaved changes will be lost when you refresh the page or navigate away.</TranslatedText>
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Success notification */}
      {showSuccess && (
        <div className="mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 w-full">
                <p className="text-sm font-medium text-green-800">
                  <TranslatedText>{successMessage.title}</TranslatedText>
                </p>
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {Object.entries(successMessage.details).map(([key, value]) => (
                      <li key={key}>
                        <TranslatedText>{`${key}:`}</TranslatedText> {String(value)}
                      </li>
                    ))}
                    <li><TranslatedText>Added:</TranslatedText> {successMessage.timestamp}</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowSuccess(false)}
                    className="text-sm font-medium text-green-600 hover:text-green-500"
                  >
                    <TranslatedText>Dismiss</TranslatedText>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'access' && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg mb-8 p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 w-full">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              <TranslatedText>🚨 Emergency Access Information</TranslatedText>
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              <TranslatedText>Share this information with emergency contacts or wear it on a medical alert bracelet for emergency access.</TranslatedText>
            </p>
            
            {emergencyCid ? (
              <div className="bg-white p-4 rounded-md border border-blue-300">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Patient Address:</span>
                    <p className="text-sm font-mono text-gray-900 break-all">{account}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Emergency Data CID:</span>
                    <p className="text-sm font-mono text-gray-900 break-all">{emergencyCid}</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    <strong><TranslatedText>Traditional Method:</TranslatedText></strong> <TranslatedText>Healthcare providers can access this data at</TranslatedText> <span className="font-mono">/emergency-access</span> <TranslatedText>using your address and this CID. This method is slow (5-15 seconds access time).</TranslatedText>
                    <br />
                                         <span className="text-red-600 font-medium">⚠️ <TranslatedText>Slow: 5-15 seconds access time</TranslatedText></span>
                  </p>
                </div>
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs text-green-800">
                                         <strong>⚡ <TranslatedText>NEW: ZK Emergency Access</TranslatedText></strong> <TranslatedText>- Lightning-fast access in &lt;1 second using the QR code below!</TranslatedText>
                    <br />
                    <span className="text-green-600 font-medium"><TranslatedText>✅ 10-50x faster than traditional method</TranslatedText></span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                   <strong><TranslatedText>No Emergency Data Saved Yet:</TranslatedText></strong> <TranslatedText>Finish and save your emergency information below. You’ll be redirected back to this page until it is saved.</TranslatedText>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'access' && (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 shadow overflow-hidden rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚡</div>
            <div>
              <h2 className="text-lg font-medium text-green-800">
                <TranslatedText>Lightning-Fast Emergency Access</TranslatedText>
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-green-700">
                <TranslatedText>Generate a Zero-Knowledge proof QR code for instant emergency access (&lt;1 second vs 5-15 seconds traditional)</TranslatedText>
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-green-200 px-4 py-5 sm:p-6">


          <ZKEmergencyQRGenerator
            emergencyData={emergencyData ? {
              ...emergencyData,
              medicalData: {
                ...emergencyData.medicalData,
                bloodType: medicalInfo.bloodType,
                allergies: medicalInfo.allergies.split(',').map(item => item.trim()).filter(item => item.length > 0),
                conditions: medicalInfo.chronicConditions.split(',').map(item => item.trim()).filter(item => item.length > 0),
                medications: medicalInfo.currentMedications.split(',').map(item => item.trim()).filter(item => item.length > 0),
                notes: medicalInfo.emergencyNotes,
                organDonor: medicalInfo.organDonor,
                dnrOrder: medicalInfo.dnrOrder,
                lastVerifiedDate: Date.now()
              },
              lastUpdated: Date.now()
            } : null}
            patientAddress={account || ''}
            key={`${account}-${medicalInfo.bloodType}-${medicalInfo.allergies}-${Date.now()}`}
            onProofGenerated={(proof) => {
              console.log('ZK Proof generated:', proof);
            }}
          />
        </div>
      </div>
      )}

      {activeTab === 'setup' && (
      <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Emergency Access Configuration</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            <TranslatedText>Configure what information is available during emergency situations.</TranslatedText>
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="allowEmergencyAccess"
                  name="allowEmergencyAccess"
                  type="checkbox"
                  checked={settings.allowEmergencyAccess}
                  onChange={handleSettingChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="allowEmergencyAccess" className="font-medium text-gray-700">
                  <TranslatedText>Allow Emergency Access</TranslatedText>
                </label>
                <p className="text-gray-500">
                  <TranslatedText>Enable emergency healthcare providers to access critical medical information.</TranslatedText>
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="notifyContacts"
                  name="notifyContacts"
                  type="checkbox"
                  checked={settings.notifyContacts}
                  onChange={handleSettingChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="notifyContacts" className="font-medium text-gray-700">
                  <TranslatedText>Notify Emergency Contacts</TranslatedText>
                </label>
                <p className="text-gray-500">
                  <TranslatedText>Send notifications to your emergency contacts when emergency access is used.</TranslatedText>
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Information to Share in Emergencies</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="shareAllergies"
                      name="shareAllergies"
                      type="checkbox"
                      checked={settings.shareAllergies}
                      onChange={handleSettingChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="shareAllergies" className="font-medium text-gray-700">Allergies</label>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="shareBloodType"
                      name="shareBloodType"
                      type="checkbox"
                      checked={settings.shareBloodType}
                      onChange={handleSettingChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="shareBloodType" className="font-medium text-gray-700">Blood Type</label>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="shareMedications"
                      name="shareMedications"
                      type="checkbox"
                      checked={settings.shareMedications}
                      onChange={handleSettingChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="shareMedications" className="font-medium text-gray-700">Current Medications</label>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="shareChronicConditions"
                      name="shareChronicConditions"
                      type="checkbox"
                      checked={settings.shareChronicConditions}
                      onChange={handleSettingChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="shareChronicConditions" className="font-medium text-gray-700">Chronic Conditions</label>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="shareEmergencyNotes"
                      name="shareEmergencyNotes"
                      type="checkbox"
                      checked={settings.shareEmergencyNotes}
                      onChange={handleSettingChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="shareEmergencyNotes" className="font-medium text-gray-700">Emergency Notes</label>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="shareFullHistory"
                      name="shareFullHistory"
                      type="checkbox"
                      checked={settings.shareFullHistory}
                      onChange={handleSettingChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="shareFullHistory" className="font-medium text-gray-700">Full Medical History</label>
                    <p className="text-gray-500">
                      <TranslatedText>Not recommended. Only enable if absolutely necessary.</TranslatedText>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={() => {
                handleSaveSettings().catch(error => {
                  console.error('Error in handleSaveSettings:', error);
                });
              }} 
              isLoading={isSaving}
              className={hasUnsavedChanges ? 'bg-yellow-600 hover:bg-yellow-700 border-yellow-600 animate-pulse' : ''}
            >
              {hasUnsavedChanges ? <TranslatedText>Save Changes Now!</TranslatedText> : <TranslatedText>Save Settings</TranslatedText>}
            </Button>
            {hasUnsavedChanges && (
              <p className="mt-2 text-sm text-yellow-600 font-medium">
                <TranslatedText>⚠️ You have unsaved changes that will be lost if you leave this page.</TranslatedText>
              </p>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'setup' && (
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Emergency Contacts</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            <TranslatedText>People to notify in case of emergency access to your medical records.</TranslatedText>
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <form onSubmit={(e) => {
            handleAddContact(e).catch(error => {
              console.error('Error in handleAddContact:', error);
            });
          }} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Name *</TranslatedText>
                </label>
                <input
                  type="text"
                  id="name"
                  value={newContact.name || ''}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                  required
                />
              </div>
              <div>
                <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Relationship *</TranslatedText>
                </label>
                <input
                  type="text"
                  id="relationship"
                  value={newContact.relationship || ''}
                  onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                  required
                />
              </div>
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Phone Number *</TranslatedText>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={newContact.phoneNumber || ''}
                  onChange={(e) => setNewContact({...newContact, phoneNumber: e.target.value})}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                  required
                />
              </div>
              <div>
                <label htmlFor="contactAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Wallet Address (Optional)</TranslatedText>
                </label>
                <input
                  type="text"
                  id="contactAddress"
                  value={newContact.address || ''}
                  onChange={(e) => setNewContact({...newContact, address: e.target.value})}
                  placeholder="0x..."
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>
            </div>
            <div>
              <Button type="submit">
                <TranslatedText>Add Contact</TranslatedText>
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Emergency Contacts</h3>
            {emergencyData && emergencyData.contacts.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {emergencyData.contacts.map((contact) => (
                    <li key={contact.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.relationship}</p>
                        <p className="text-sm text-gray-500">{contact.phoneNumber}</p>
                        {contact.address && (
                          <p className="text-sm font-mono text-gray-500">
                            {`${contact.address.substring(0, 6)}...${contact.address.substring(contact.address.length - 4)}`}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(contact.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        <TranslatedText>Remove</TranslatedText>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500">
                <TranslatedText>No emergency contacts added yet.</TranslatedText>
              </p>
            )}
          </div>
          
          {/* Save button for contacts */}
          {emergencyData && emergencyData.contacts.length > 0 && (
            <div className="mt-6">
              <Button 
                onClick={() => {
                  handleSaveSettings().catch(error => {
                    console.error('Error in handleSaveSettings:', error);
                  });
                }} 
                isLoading={isSaving}
                className={hasUnsavedChanges ? 'bg-yellow-600 hover:bg-yellow-700 border-yellow-600 animate-pulse' : ''}
              >
                {hasUnsavedChanges ? <TranslatedText>Save All Changes Now!</TranslatedText> : <TranslatedText>Save Contacts</TranslatedText>}
              </Button>
              {hasUnsavedChanges && (
                <p className="mt-2 text-sm text-yellow-600 font-medium">
                  <TranslatedText>⚠️ Contact changes need to be saved to persist across page reloads.</TranslatedText>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Emergency Information Section */}
      {activeTab === 'setup' && (
      <div className="bg-white shadow overflow-hidden rounded-lg mt-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Emergency Information</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            <TranslatedText>Critical medical information that emergency providers need to know.</TranslatedText>
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Critical Medical Information */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
                <TranslatedText>🩸 Critical Medical Information</TranslatedText>
              </h3>
              
              <div>
                <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Blood Type *</TranslatedText>
                </label>
                                 <select
                   id="bloodType"
                   name="bloodType"
                   value={medicalInfo.bloodType}
                   onChange={handleMedicalInfoChange}
                   className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                 >
                   <option value="">
                     <TranslatedText>Select Blood Type</TranslatedText>
                   </option>
                   <option value="A">
                     <TranslatedText>A (don't know if + or -)</TranslatedText>
                   </option>
                   <option value="B">
                     <TranslatedText>B (don't know if + or -)</TranslatedText>
                   </option>
                   <option value="O">
                     <TranslatedText>O (don't know if + or -)</TranslatedText>
                   </option>
                   <option value="AB">
                     <TranslatedText>AB (don't know if + or -)</TranslatedText>
                   </option>
                   <option value="A+">
                     <TranslatedText>A+</TranslatedText>
                   </option>
                   <option value="A-">
                     <TranslatedText>A-</TranslatedText>
                   </option>
                   <option value="B+">
                     <TranslatedText>B+</TranslatedText>
                   </option>
                   <option value="B-">
                     <TranslatedText>B-</TranslatedText>
                   </option>
                   <option value="O+">
                     <TranslatedText>O+</TranslatedText>
                   </option>
                   <option value="O-">
                     <TranslatedText>O-</TranslatedText>
                   </option>
                   <option value="AB+">
                     <TranslatedText>AB+</TranslatedText>
                   </option>
                   <option value="AB-">
                     <TranslatedText>AB-</TranslatedText>
                   </option>
                   <option value="Unknown">
                     <TranslatedText>Don't know my blood type</TranslatedText>
                   </option>
                 </select>
              </div>

              <div>
                <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Allergies</TranslatedText>
                </label>
                <textarea
                  id="allergies"
                  name="allergies"
                  value={medicalInfo.allergies}
                  onChange={handleMedicalInfoChange}
                  rows={3}
                  placeholder="e.g., Penicillin, Peanuts, Latex (separate with commas)"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>

              <div>
                <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Current Medications</TranslatedText>
                </label>
                <textarea
                  id="currentMedications"
                  name="currentMedications"
                  value={medicalInfo.currentMedications}
                  onChange={handleMedicalInfoChange}
                  rows={3}
                  placeholder="e.g., Metformin 500mg twice daily, Lisinopril 10mg daily (separate with commas)"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>

              <div>
                <label htmlFor="chronicConditions" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Chronic Conditions</TranslatedText>
                </label>
                <textarea
                  id="chronicConditions"
                  name="chronicConditions"
                  value={medicalInfo.chronicConditions}
                  onChange={handleMedicalInfoChange}
                  rows={3}
                  placeholder="e.g., Diabetes Type 2, Hypertension, Asthma (separate with commas)"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>
            </div>

            {/* Emergency-Specific Information */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
                <TranslatedText>🚨 Emergency-Specific Information</TranslatedText>
              </h3>
              
              <div>
                <label htmlFor="emergencyNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Emergency Notes</TranslatedText>
                </label>
                <textarea
                  id="emergencyNotes"
                  name="emergencyNotes"
                  value={medicalInfo.emergencyNotes}
                  onChange={handleMedicalInfoChange}
                  rows={3}
                  placeholder="Special instructions for emergency responders..."
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText>Height</TranslatedText>
                  </label>
                  <input
                    type="text"
                    id="height"
                    name="height"
                    value={medicalInfo.height}
                    onChange={handleMedicalInfoChange}
                    placeholder="e.g., 5'10&quot; or 178cm"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                  />
                </div>
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText>Weight</TranslatedText>
                  </label>
                  <input
                    type="text"
                    id="weight"
                    name="weight"
                    value={medicalInfo.weight}
                    onChange={handleMedicalInfoChange}
                    placeholder="e.g., 70kg or 154lbs"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="primaryCarePhysician" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Primary Care Physician</TranslatedText>
                </label>
                <input
                  type="text"
                  id="primaryCarePhysician"
                  name="primaryCarePhysician"
                  value={medicalInfo.primaryCarePhysician}
                  onChange={handleMedicalInfoChange}
                  placeholder="Dr. Smith - (555) 123-4567"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>

              <div>
                <label htmlFor="insuranceInfo" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Insurance Information</TranslatedText>
                </label>
                <input
                  type="text"
                  id="insuranceInfo"
                  name="insuranceInfo"
                  value={medicalInfo.insuranceInfo}
                  onChange={handleMedicalInfoChange}
                  placeholder="Provider: Blue Cross, Policy: 123456789"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>

              <div>
                <label htmlFor="recentSurgeries" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Recent Surgeries (Last 6 months)</TranslatedText>
                </label>
                <input
                  type="text"
                  id="recentSurgeries"
                  name="recentSurgeries"
                  value={medicalInfo.recentSurgeries}
                  onChange={handleMedicalInfoChange}
                  placeholder="e.g., Appendectomy - March 2024"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                />
              </div>

              <div>
                <label htmlFor="pregnancyStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Pregnancy Status</TranslatedText>
                </label>
                <select
                  id="pregnancyStatus"
                  name="pregnancyStatus"
                  value={medicalInfo.pregnancyStatus}
                  onChange={handleMedicalInfoChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                >
                  <option value="">
                    <TranslatedText>Select Status</TranslatedText>
                  </option>
                  <option value="Not Pregnant">
                    <TranslatedText>Not Pregnant</TranslatedText>
                  </option>
                  <option value="Pregnant - First Trimester">
                    <TranslatedText>Pregnant - First Trimester</TranslatedText>
                  </option>
                  <option value="Pregnant - Second Trimester">
                    <TranslatedText>Pregnant - Second Trimester</TranslatedText>
                  </option>
                  <option value="Pregnant - Third Trimester">
                    <TranslatedText>Pregnant - Third Trimester</TranslatedText>
                  </option>
                  <option value="Postpartum">
                    <TranslatedText>Postpartum</TranslatedText>
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="languagePreference" className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText>Language Preference</TranslatedText>
                </label>
                <select
                  id="languagePreference"
                  name="languagePreference"
                  value={medicalInfo.languagePreference}
                  onChange={handleMedicalInfoChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                >
                  <option value="">
                    <TranslatedText>Select Language</TranslatedText>
                  </option>
                  <option value="English">
                    <TranslatedText>English</TranslatedText>
                  </option>
                  <option value="Spanish">
                    <TranslatedText>Spanish</TranslatedText>
                  </option>
                  <option value="French">
                    <TranslatedText>French</TranslatedText>
                  </option>
                  <option value="German">
                    <TranslatedText>German</TranslatedText>
                  </option>
                  <option value="Chinese">
                    <TranslatedText>Chinese</TranslatedText>
                  </option>
                  <option value="Japanese">
                    <TranslatedText>Japanese</TranslatedText>
                  </option>
                  <option value="Korean">
                    <TranslatedText>Korean</TranslatedText>
                  </option>
                  <option value="Arabic">
                    <TranslatedText>Arabic</TranslatedText>
                  </option>
                  <option value="Other">
                    <TranslatedText>Other</TranslatedText>
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Medical Alerts */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">⚠️ Medical Alerts</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="organDonor"
                    name="organDonor"
                    type="checkbox"
                    checked={medicalInfo.organDonor}
                    onChange={handleMedicalInfoChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="organDonor" className="font-medium text-gray-700">
                    <TranslatedText>Organ Donor</TranslatedText>
                  </label>
                  <p className="text-gray-500">
                    <TranslatedText>I am registered as an organ donor.</TranslatedText>
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="dnrOrder"
                    name="dnrOrder"
                    type="checkbox"
                    checked={medicalInfo.dnrOrder}
                    onChange={handleMedicalInfoChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="dnrOrder" className="font-medium text-gray-700">
                    <TranslatedText>Do Not Resuscitate (DNR) Order</TranslatedText>
                  </label>
                  <p className="text-gray-500">
                    <TranslatedText>I have a valid DNR order in place.</TranslatedText>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save button for emergency information */}
          <div className="mt-6">
            <Button 
              onClick={() => {
                handleSaveSettings().catch(error => {
                  console.error('Error in handleSaveSettings:', error);
                });
              }} 
              isLoading={isSaving}
              className={hasUnsavedChanges ? 'bg-yellow-600 hover:bg-yellow-700 border-yellow-600 animate-pulse' : ''}
            >
              {hasUnsavedChanges ? <TranslatedText>Save All Emergency Information Now!</TranslatedText> : <TranslatedText>Save Emergency Information</TranslatedText>}
            </Button>
            {hasUnsavedChanges && (
              <p className="mt-2 text-sm text-yellow-600 font-medium">
                <TranslatedText>⚠️ Emergency information changes need to be saved to persist across page reloads.</TranslatedText>
              </p>
            )}
          </div>
        </div>
      </div>
      )}


    </div>
  );
} 