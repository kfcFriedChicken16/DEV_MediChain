'use client';

import React, { useState, useEffect } from 'react';

interface IPFSStatusProps {
  cid: string | null;
  isUploading: boolean;
  error: string | null;
}

const IPFSStatus: React.FC<IPFSStatusProps> = ({ cid, isUploading, error }) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Verify the CID is accessible via gateway
  useEffect(() => {
    const verifyIPFS = async () => {
      if (!cid) return;
      
      setIsVerifying(true);
      try {
        // Change from pinata.cloud to gateway.pinata.cloud
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        const response = await fetch(gatewayUrl, { method: 'HEAD' });
        setIsVerified(response.ok);
      } catch (error) {
        console.error('IPFS verification error:', error);
        setIsVerified(false);
      } finally {
        setIsVerifying(false);
      }
    };

    if (cid) {
      verifyIPFS();
    }
  }, [cid]);

  if (!cid && !isUploading && !error) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <h3 className="text-lg font-medium mb-2">IPFS Status</h3>
      
      {isUploading && (
        <div className="flex items-center text-blue-600">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Uploading to IPFS...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 mb-2">
          <span className="font-medium">Error: </span>
          <span>{error}</span>
        </div>
      )}

      {cid && (
        <div>
          <div className="mb-2">
            <span className="font-medium">Content ID (CID): </span>
            <span className="font-mono text-sm break-all">{cid}</span>
          </div>
          
          <div className="mb-3">
            {isVerifying ? (
              <span className="text-blue-600 text-sm">Verifying accessibility...</span>
            ) : isVerified === true ? (
              <span className="text-green-600 text-sm">✓ Content verified and accessible</span>
            ) : isVerified === false ? (
              <span className="text-red-600 text-sm">⚠ Content not accessible via gateway</span>
            ) : null}
          </div>
          
          <div className="flex space-x-4">
            <a
              href={`https://gateway.pinata.cloud/ipfs/${cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View on Gateway
            </a>
            <a
              href={`https://app.pinata.cloud/pinmanager?name=${cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View on Pinata
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPFSStatus; 