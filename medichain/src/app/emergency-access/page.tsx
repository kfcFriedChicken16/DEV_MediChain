'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';

import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { fetchEmergencyAccessibleData } from '@/lib/emergencyData';
import TranslatedText from '@/components/TranslatedText';

export default function EmergencyAccess() {
  const { isConnected, account, userType } = useWallet();

  
  // State for patient address input
  const [patientAddress, setPatientAddress] = useState('');
  const [emergencyCid, setEmergencyCid] = useState('');
  
  // State for loading and data
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [error, setError] = useState('');

  // Handle emergency access
  const handleEmergencyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientAddress.trim() || !emergencyCid.trim()) {
      toast.error('Please provide both patient address and emergency data CID');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Fetch emergency accessible data
      const data = await fetchEmergencyAccessibleData(emergencyCid, patientAddress);
      setEmergencyData(data);
      
      toast.success('Emergency data accessed successfully');
    } catch (error) {
      console.error('Error accessing emergency data:', error);
      setError('Failed to access emergency data. Please verify the patient address and CID.');
      toast.error('Failed to access emergency data');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if not connected or not a provider
  if (!isConnected || userType !== 'provider') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-800">
            <TranslatedText>Emergency Medical Access</TranslatedText>
          </h2>
          <p className="mb-6 text-red-700">
            <TranslatedText>
              This page is for emergency access only. You must be connected as a healthcare provider.
            </TranslatedText>
          </p>
          <Button onClick={() => window.location.href = '/'}>
            <TranslatedText>Home</TranslatedText>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          🚨 <TranslatedText>Emergency Medical Access</TranslatedText>
        </h1>
        <p className="mt-2 text-gray-600">
          <TranslatedText>
            Access critical patient information in emergency situations when the patient is unable to provide their key.
          </TranslatedText>
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">
              <strong><TranslatedText>Emergency Use Only:</TranslatedText></strong> <TranslatedText>This access method is for life-threatening emergency situations only. All access attempts are logged and monitored.</TranslatedText>
            </p>
          </div>
        </div>
      </div>

      {/* Access Form */}
      <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            <TranslatedText>Emergency Access Request</TranslatedText>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            <TranslatedText>
              Enter the patient's information to access their emergency data.
            </TranslatedText>
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <form onSubmit={handleEmergencyAccess} className="space-y-4">
            <div>
              <label htmlFor="patientAddress" className="block text-sm font-medium text-gray-700 mb-1">
                <TranslatedText>Patient Ethereum Address *</TranslatedText>
              </label>
              <input
                type="text"
                id="patientAddress"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
                placeholder="0x..."
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                required
              />
            </div>
            
            <div>
              <label htmlFor="emergencyCid" className="block text-sm font-medium text-gray-700 mb-1">
                <TranslatedText>Emergency Data CID *</TranslatedText>
              </label>
              <input
                type="text"
                id="emergencyCid"
                value={emergencyCid}
                onChange={(e) => setEmergencyCid(e.target.value)}
                placeholder="Qm..."
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-800"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                <TranslatedText>
                  This should be provided by the patient or their emergency contacts.
                </TranslatedText>
              </p>
            </div>

            <div>
              <Button 
                type="submit" 
                isLoading={isLoading}
                className="bg-red-600 hover:bg-red-700 border-red-600"
              >
                <TranslatedText>Access Emergency Data</TranslatedText>
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-800"><TranslatedText>{error}</TranslatedText></p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Data Display */}
      {emergencyData && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">
              <TranslatedText>Emergency Patient Information</TranslatedText>
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              <TranslatedText>
                Critical information for emergency care.
              </TranslatedText>
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Medical Information */}
              <div>
                <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  🩸 <TranslatedText>Critical Medical Information</TranslatedText>
                </h3>
                
                <div className="space-y-3">
                  {emergencyData.medicalData?.bloodType && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        <TranslatedText>Blood Type:</TranslatedText>
                      </span>
                      <span className="ml-2 text-sm text-gray-900"><TranslatedText>{emergencyData.medicalData.bloodType}</TranslatedText></span>
                    </div>
                  )}
                  
                  {emergencyData.medicalData?.allergies && emergencyData.medicalData.allergies.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        <TranslatedText>Allergies:</TranslatedText>
                      </span>
                      <span className="ml-2 text-sm text-gray-900"><TranslatedText>{emergencyData.medicalData.allergies.join(', ')}</TranslatedText></span>
                    </div>
                  )}
                  
                  {emergencyData.medicalData?.medications && emergencyData.medicalData.medications.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        <TranslatedText>Medications:</TranslatedText>
                      </span>
                      <span className="ml-2 text-sm text-gray-900"><TranslatedText>{emergencyData.medicalData.medications.join(', ')}</TranslatedText></span>
                    </div>
                  )}
                  
                  {emergencyData.medicalData?.conditions && emergencyData.medicalData.conditions.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        <TranslatedText>Conditions:</TranslatedText>
                      </span>
                      <span className="ml-2 text-sm text-gray-900"><TranslatedText>{emergencyData.medicalData.conditions.join(', ')}</TranslatedText></span>
                    </div>
                  )}
                  
                  {emergencyData.medicalData?.notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        <TranslatedText>Emergency Notes:</TranslatedText>
                      </span>
                      <p className="mt-1 text-sm text-gray-900"><TranslatedText>{emergencyData.medicalData.notes}</TranslatedText></p>
                    </div>
                  )}
                  
                  {emergencyData.medicalData?.organDonor && (
                    <div className="bg-green-50 p-3 rounded-md">
                      <span className="text-sm font-medium text-green-800">
                        <TranslatedText>✓ Organ Donor</TranslatedText>
                      </span>
                    </div>
                  )}
                  
                  {emergencyData.medicalData?.dnrOrder && (
                    <div className="bg-red-50 p-3 rounded-md">
                      <span className="text-sm font-medium text-red-800">
                        <TranslatedText>⚠️ DNR Order in Place</TranslatedText>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contacts */}
              <div>
                <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  📞 <TranslatedText>Emergency Contacts</TranslatedText>
                </h3>
                
                {emergencyData.contacts && emergencyData.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {emergencyData.contacts.map((contact: any) => (
                      <div key={contact.id} className="border border-gray-200 rounded-md p-3">
                        <p className="text-sm font-medium text-gray-900"><TranslatedText>{contact.name}</TranslatedText></p>
                        <p className="text-sm text-gray-600"><TranslatedText>{contact.relationship}</TranslatedText></p>
                        <p className="text-sm text-gray-600"><TranslatedText>{contact.phoneNumber}</TranslatedText></p>
                        {contact.email && (
                          <p className="text-sm text-gray-600"><TranslatedText>{contact.email}</TranslatedText></p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    <TranslatedText>No emergency contacts available.</TranslatedText>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                  <strong><TranslatedText>Access Log:</TranslatedText></strong> Emergency access granted to {account || 'Unknown'} at {new Date().toLocaleString()}
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 