'use client';

import React, { useState } from 'react';
import { useRecordContext } from '@/context/RecordContext';
import TranslatedText from '@/components/TranslatedText';

interface FAQItem {
  question: string;
  answer: string;
  category: 'patient' | 'provider' | 'general';
}

const faqData: FAQItem[] = [
  // Patient Questions
  {
    question: "How do I grant access to my doctor?",
    answer: `Here's how to grant access to your doctor:

1. Navigate to your Patient Dashboard
2. Click the "Grant Access" button
3. Enter your doctor's wallet address in the field
4. Click "Submit Request"
5. Pay the gas fee to complete the transaction
6. Wait for the transaction to be confirmed on the blockchain

💡 Tips:
• Make sure you have the correct wallet address from your doctor
• Ensure you have enough ETH for gas fees
• You can revoke access later if needed`,
    category: 'patient'
  },
  {
    question: "How do I revoke access from a doctor?",
    answer: `Here's how to revoke access from a doctor:

1. Go to your Patient Dashboard
2. Find the "Manage Access" section
3. Locate the doctor you want to revoke access from
4. Click "Revoke Access" button
5. Confirm the action and pay gas fee
6. Wait for transaction confirmation

💡 Tips:
• Revoking access is immediate and cannot be undone
• The doctor will no longer be able to write to your records`,
    category: 'patient'
  },
  {
    question: "How do I view my medical records?",
    answer: `Here's how to view your medical records:

1. Navigate to the "Medical Records" page
2. All your medical records will be displayed
3. Click on any record to view detailed information
4. Records are sorted by date (newest first)

💡 Tips:
• Only doctors you've granted access to can add records
• Records are stored securely on IPFS and blockchain`,
    category: 'patient'
  },
  {
    question: "How do I see which doctors have access to my records?",
    answer: `Here's how to view your authorized doctors:

1. Go to your Patient Dashboard
2. Look for "Authorized Doctors" or "Access List" section
3. You'll see all doctors who have access to your records
4. You can revoke access from this list`,
    category: 'patient'
  },
  {
    question: "What happens if I revoke access from a doctor?",
    answer: `When you revoke access from a doctor:

• The doctor will immediately lose access to your records
• They can no longer write new medical records for you
• Existing records remain on the blockchain (they cannot be deleted)
• The doctor will see you removed from their patient list
• You can grant access again later if needed

💡 Note: This action is permanent and cannot be undone.`,
    category: 'patient'
  },

  // Provider Questions
  {
    question: "How do I write a medical record for a patient?",
    answer: `Here's how to write a medical record:

1. Navigate to your Provider Dashboard
2. Go to "My Patients" section
3. Select a patient from your authorized list
4. Click "Add Medical Record"
5. Fill in the medical details (diagnosis, treatment, etc.)
6. Upload any relevant files if needed
7. Click "Submit Record"
8. Pay gas fee to complete the transaction

💡 Tips:
• You can only write records for patients who have granted you access
• Records are permanently stored on the blockchain
• Be thorough and accurate in your documentation`,
    category: 'provider'
  },
  {
    question: "How do I view my patients?",
    answer: `Here's how to view your patients:

1. Go to your Provider Dashboard
2. Click on "My Patients" tab
3. You'll see all patients who have granted you access
4. Click on any patient to view their records`,
    category: 'provider'
  },
  {
    question: "How do I view a patient's medical records?",
    answer: `Here's how to view a patient's records:

1. Navigate to "My Patients" section
2. Select a patient from your list
3. Click "View Records" or the patient's name
4. All medical records for that patient will be displayed
5. Records are sorted by date (newest first)`,
    category: 'provider'
  },
  {
    question: "How do I update a medical record?",
    answer: `Here's how to update a medical record:

1. Go to the patient's record page
2. Find the record you want to update
3. Click "Edit" or "Update" button
4. Make your changes to the record
5. Submit the updated record
6. Pay gas fee for the transaction

💡 Tips:
• Note: Updating records creates a new version
• Previous versions remain on the blockchain for audit purposes`,
    category: 'provider'
  },
  {
    question: "What if a patient revokes my access?",
    answer: `If a patient revokes your access:

• You will immediately lose access to their records
• You can no longer write new medical records for them
• They will disappear from your patient list
• Existing records you wrote remain on the blockchain
• You'll need them to grant access again to continue treating them

💡 Note: Patients have full control over who can access their records.`,
    category: 'provider'
  },

  // General Questions
  {
    question: "What is MediDrop?",
    answer: `MediDrop is a decentralized medical records platform that:

• Stores medical records securely on the blockchain
• Gives patients full control over their data
• Allows patients to grant/revoke access to doctors
• Ensures data integrity and immutability
• Uses IPFS for decentralized file storage
• Provides transparent audit trails

💡 Key Features:
• Patient-controlled access
• Blockchain-based security
• Decentralized storage
• Transparent record keeping`,
    category: 'general'
  },
  {
    question: "How secure is my medical data?",
    answer: `Your medical data is highly secure:

• All data is encrypted and stored on IPFS
• Access is controlled by blockchain smart contracts
• Only authorized doctors can view your records
• You have full control over who can access your data
• Records are immutable and cannot be tampered with
• All access is logged on the blockchain

💡 Security Features:
• End-to-end encryption
• Blockchain-based access control
• Decentralized storage
• Audit trail for all access`,
    category: 'general'
  },
  {
    question: "What are gas fees?",
    answer: `Gas fees are transaction costs on the blockchain:

• Required for all blockchain operations (granting access, writing records, etc.)
• Paid in ETH (Ethereum cryptocurrency)
• Varies based on network congestion
• Covers the computational cost of processing transactions
• Similar to transaction fees on traditional payment systems

💡 Tips:
• Keep some ETH in your wallet for gas fees
• Gas fees are typically small amounts
• Fees are paid to network validators, not to MediDrop`,
    category: 'general'
  },
  {
    question: "How do I connect my wallet?",
    answer: `Here's how to connect your wallet:

1. Click the "Connect Wallet" button in the top navigation
2. Choose your wallet provider (MetaMask, WalletConnect, etc.)
3. Approve the connection in your wallet
4. Sign the connection request
5. Your wallet address will be displayed

💡 Tips:
• Make sure you have a wallet installed (like MetaMask)
• Ensure you have some ETH for gas fees
• Keep your private keys secure and never share them`,
    category: 'general'
  }
];

export default function HelpPage() {
  const { userType } = useRecordContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'patient' | 'provider' | 'general'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { key: 'all', label: 'All Questions', count: faqData.length },
    { key: 'patient', label: 'Patient Questions', count: faqData.filter(f => f.category === 'patient').length },
    { key: 'provider', label: 'Provider Questions', count: faqData.filter(f => f.category === 'provider').length },
    { key: 'general', label: 'General Questions', count: faqData.filter(f => f.category === 'general').length }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <TranslatedText>Help & FAQ</TranslatedText>
          </h1>
          <p className="text-gray-600">
            <TranslatedText>
              Find answers to common questions about using MediDrop
            </TranslatedText>
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              {categories.map(category => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.key === 'all' && <TranslatedText>All Questions</TranslatedText>}
                  {category.key === 'patient' && <TranslatedText>Patient Questions</TranslatedText>}
                  {category.key === 'provider' && <TranslatedText>Provider Questions</TranslatedText>}
                  {category.key === 'general' && <TranslatedText>General Questions</TranslatedText>}
                  ({category.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                <TranslatedText>No questions found matching your search.</TranslatedText>
              </p>
            </div>
          ) : (
            filteredFAQs.map((item, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">
                    <TranslatedText>{item.question}</TranslatedText>
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedItems.has(index) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedItems.has(index) && (
                  <div className="px-6 pb-4">
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700">
                        <TranslatedText>{item.answer}</TranslatedText>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            <TranslatedText>Still need help?</TranslatedText>
          </h3>
          <p className="text-blue-700 mb-4">
            <TranslatedText>
              If you couldn't find the answer you're looking for, please contact our support team.
            </TranslatedText>
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
            <TranslatedText>Contact Support</TranslatedText>
          </button>
        </div>
      </div>
    </div>
  );
} 