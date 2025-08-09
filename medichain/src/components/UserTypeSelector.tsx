'use client';

import React, { useState } from 'react';
import Button from './ui/Button';

interface UserTypeSelectorProps {
  onSelect: (type: 'patient' | 'provider') => void;
  isOpen: boolean;
}

const UserTypeSelector: React.FC<UserTypeSelectorProps> = ({ onSelect, isOpen }) => {
  const [selectedType, setSelectedType] = useState<'patient' | 'provider' | null>(null);

  if (!isOpen) return null;

  const handleSelect = (type: 'patient' | 'provider') => {
    setSelectedType(type);
    onSelect(type);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Select Your Account Type</h2>
        <p className="text-gray-600 mb-6 text-center">
        Please select whether you are a patient or a healthcare provider.
      </p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => handleSelect('patient')}
            className={`p-4 border-2 rounded-lg flex flex-col items-center transition-all ${
              selectedType === 'patient' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Patient</span>
            <span className="text-xs text-gray-500 mt-1">Access your medical records</span>
          </button>
          
          <button
            onClick={() => handleSelect('provider')}
            className={`p-4 border-2 rounded-lg flex flex-col items-center transition-all ${
              selectedType === 'provider' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-medium">Healthcare Provider</span>
            <span className="text-xs text-gray-500 mt-1">Manage patient records</span>
          </button>
          </div>
        
        <div className="flex justify-center">
          <Button
            onClick={() => selectedType && handleSelect(selectedType)}
            disabled={!selectedType}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelector; 