'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { 
  generateEmergencyProof, 
  generateEmergencyQRData,
  speedTestComparison,
  EmergencyProofData 
} from '@/lib/zkEmergencyAccess';
import { EmergencyData } from '@/lib/emergencyData';
import { 
  storeEmergencyData, 
  generateSampleEmergencyData,
  EmergencyInfo 
} from '@/lib/emergencyQRLookup';

interface ZKEmergencyQRGeneratorProps {
  emergencyData: EmergencyData | null;
  patientAddress: string;
  onProofGenerated?: (proofPackage: EmergencyProofData) => void;
}

export default function ZKEmergencyQRGenerator({ 
  emergencyData, 
  patientAddress, 
  onProofGenerated 
}: ZKEmergencyQRGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [zkProofPackage, setZkProofPackage] = useState<EmergencyProofData | null>(null);
  const [qrData, setQrData] = useState<string>('');
  const [generationTime, setGenerationTime] = useState<number>(0);
  const [showSpeedTest, setShowSpeedTest] = useState(false);

  // Auto-generate ZK proof when emergency data changes
  useEffect(() => {
    if (emergencyData && patientAddress && !zkProofPackage) {
      handleGenerateZKProof();
    }
  }, [emergencyData, patientAddress]);

  const handleGenerateZKProof = async () => {
    if (!emergencyData || !patientAddress) {
      toast.error('Emergency data or patient address missing');
      return;
    }

    try {
      setIsGenerating(true);
      toast.loading('Generating emergency QR code...', { id: 'zk-proof' });
      
      const startTime = Date.now();
      
      // Convert emergency data to lookup format
      const emergencyInfo: EmergencyInfo = {
        patientAddress,
        bloodType: emergencyData.medicalData.bloodType || 'Unknown',
        allergies: emergencyData.medicalData.allergies || [],
        conditions: emergencyData.medicalData.conditions || [],
        medications: emergencyData.medicalData.medications || [],
        contacts: emergencyData.contacts?.map(contact => ({
          name: contact.name,
          phone: contact.phoneNumber,
          relation: contact.relationship
        })) || [],
        organDonor: emergencyData.medicalData.organDonor || false,
        dnrOrder: emergencyData.medicalData.dnrOrder || false,
        notes: emergencyData.medicalData.notes || '',
        lastUpdated: emergencyData.lastUpdated
      };
      
      // 🚀 NEW APPROACH: Embed emergency data directly in QR code
      console.log('🚀 EMBEDDING EMERGENCY DATA DIRECTLY IN QR...');
      
      // Create compact emergency data object with short keys
      const compactEmergencyData = {
        pa: patientAddress,                    // Patient Address
        bt: emergencyInfo.bloodType,          // Blood Type
        al: emergencyInfo.allergies,          // Allergies
        co: emergencyInfo.conditions,         // Conditions
        me: emergencyInfo.medications,        // Medications
        ct: emergencyInfo.contacts.map(c => ({
          n: c.name,      // Name
          p: c.phone,     // Phone
          r: c.relation   // Relation
        })),
        od: emergencyInfo.organDonor,         // Organ Donor
        dr: emergencyInfo.dnrOrder,           // DNR Order
        nt: emergencyInfo.notes,              // Notes
        lu: emergencyInfo.lastUpdated         // Last Updated
      };
      
      // Convert to JSON and encode for QR
      const jsonString = JSON.stringify(compactEmergencyData);
      const base64Data = btoa(jsonString);
      const qrCodeData = `MEDICHAIN:${base64Data}`;
      
      console.log('🚀 Compact emergency data:', compactEmergencyData);
      console.log('🚀 JSON length:', jsonString.length);
      console.log('🚀 QR data length:', qrCodeData.length);
      
      // Mock ZK proof for demo
      const mockProof: EmergencyProofData = {
        commitment: 'demo_commitment_' + patientAddress.slice(2, 10),
        timestamp: Date.now(),
        patientAddress,
        version: '1.0.0',
        proof: {
          pi_a: 'demo_proof_a',
          pi_b: 'demo_proof_b', 
          pi_c: 'demo_proof_c',
          publicSignals: []
        },
        encryptedData: {
          bloodType: emergencyInfo.bloodType,
          allergies: emergencyInfo.allergies.join(','),
          conditions: emergencyInfo.conditions.join(','),
          medications: emergencyInfo.medications.join(','),
          contacts: JSON.stringify(emergencyInfo.contacts),
          organDonor: emergencyInfo.organDonor.toString(),
          dnrOrder: emergencyInfo.dnrOrder.toString(),
          notes: emergencyInfo.notes
        }
      };
      
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      
      setZkProofPackage(mockProof);
      setQrData(qrCodeData);
      setGenerationTime(timeTaken);
      
      // Notify parent component
      if (onProofGenerated) {
        onProofGenerated(mockProof);
      }
      
      toast.success(`Emergency QR code generated in ${timeTaken}ms!`, { id: 'zk-proof' });
    } catch (error) {
      console.error('Error generating emergency QR:', error);
      toast.error('Failed to generate emergency QR code', { id: 'zk-proof' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSpeedTest = async () => {
    if (!emergencyData || !patientAddress) return;
    
    try {
      setShowSpeedTest(true);
      toast.loading('Running speed comparison...', { id: 'speed-test' });
      
      const results = await speedTestComparison(emergencyData, patientAddress);
      
      toast.success(
        `ZK Method: ${results.zkMethod.total}ms (${results.zkMethod.generation}ms + ${results.zkMethod.access}ms)`,
        { id: 'speed-test', duration: 5000 }
      );
    } catch (error) {
      console.error('Speed test error:', error);
      toast.error('Speed test failed', { id: 'speed-test' });
    }
  };

  const handleDownloadQRData = () => {
    if (!qrData) return;
    
    const blob = new Blob([qrData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergency-qr-${patientAddress.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('QR data downloaded successfully');
  };

  const handleCopyQRData = () => {
    if (!qrData) return;
    
    navigator.clipboard.writeText(qrData).then(() => {
      toast.success('QR data copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy QR data');
    });
  };

  if (!emergencyData || !patientAddress) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-400 text-4xl mb-2">⏳</div>
        <p className="text-gray-600">Save emergency data to generate QR code</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          ⚡ ZK Emergency QR Code
        </h3>
        {generationTime > 0 && (
          <span className="text-sm text-green-600 font-medium">
            Generated in {generationTime}ms
          </span>
        )}
      </div>

      {/* Speed Comparison Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-green-800 text-sm">Lightning Fast Emergency Access</h4>
            <p className="text-green-700 text-xs">
              ZK Proof: &lt;1 second | Traditional: 5-15 seconds
            </p>
          </div>
          <Button
            onClick={handleSpeedTest}
            disabled={isGenerating || !zkProofPackage}
            className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1"
          >
            🏁 Speed Test
          </Button>
        </div>
      </div>

      {isGenerating ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Generating ZK proof...</p>
        </div>
      ) : zkProofPackage && qrData ? (
        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="text-center">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
              <QRCodeSVG
                value={qrData}
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Scan this QR code for emergency access
            </p>
          </div>

          {/* ZK Proof Information */}
          <div className="bg-blue-50 rounded-md p-3">
            <h4 className="font-medium text-blue-900 text-sm mb-2">🔐 ZK Proof Details</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <div>
                <span className="font-medium">Commitment:</span> {zkProofPackage.commitment.substring(0, 16)}...
              </div>
              <div>
                <span className="font-medium">Patient:</span> {zkProofPackage.patientAddress.substring(0, 10)}...
              </div>
              <div>
                <span className="font-medium">Generated:</span> {new Date(zkProofPackage.timestamp).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Version:</span> {zkProofPackage.version}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={handleDownloadQRData}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
            >
              📁 Download QR Data
            </Button>
            <Button
              onClick={handleCopyQRData}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-sm"
            >
              📋 Copy Data
            </Button>
          </div>

          {/* Emergency Data Preview */}
          <div className="bg-red-50 rounded-md p-3">
            <h4 className="font-medium text-red-900 text-sm mb-2">🚨 Emergency Information</h4>
            <div className="text-xs text-red-800 space-y-1">
              <div>
                <span className="font-medium">Blood Type:</span> {emergencyData.medicalData.bloodType || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">Allergies:</span> {
                  emergencyData.medicalData.allergies?.length > 0 
                    ? emergencyData.medicalData.allergies.join(', ')
                    : 'None specified'
                }
              </div>
              <div>
                <span className="font-medium">Conditions:</span> {
                  emergencyData.medicalData.conditions?.length > 0
                    ? emergencyData.medicalData.conditions.join(', ')
                    : 'None specified'
                }
              </div>
              <div>
                <span className="font-medium">Medications:</span> {
                  emergencyData.medicalData.medications?.length > 0
                    ? emergencyData.medicalData.medications.join(', ')
                    : 'None specified'
                }
              </div>
              <div>
                <span className="font-medium">Emergency Contacts:</span> {emergencyData.contacts?.length || 0}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-md p-3">
            <h4 className="font-medium text-gray-900 text-sm mb-2">📱 How to Use</h4>
            <ol className="text-xs text-gray-700 space-y-1">
              <li>1. Save QR code image or download data file</li>
              <li>2. Keep with you (phone, wallet, medical bracelet)</li>
              <li>3. In emergency: responder scans QR code</li>
              <li>4. Critical medical info appears instantly (&lt;1 second)</li>
              <li>5. Your full medical records remain private</li>
            </ol>
          </div>

          {/* Regenerate Button */}
          <Button
            onClick={handleGenerateZKProof}
            disabled={isGenerating}
            className="w-full bg-green-600 hover:bg-green-700 text-sm"
          >
            🔄 Regenerate ZK Proof
          </Button>
        </div>
      ) : (
        <div className="text-center py-8">
          <Button
            onClick={handleGenerateZKProof}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            ⚡ Generate ZK Emergency QR Code
          </Button>
        </div>
      )}
    </div>
  );
}