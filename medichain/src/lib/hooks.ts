import { useEffect, RefObject, useState, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { MEDICAL_REGISTRY_ADDRESS, MEDICAL_REGISTRY_ABI } from '@/contracts/MedicalRegistry';
import { ethers } from 'ethers';

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      selectedAddress?: string;
      chainId?: string;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      if (!el || el.contains?.(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export interface MedicalRecord {
  cid: string;
  timestamp: number;
  provider: string;
  version: number;
}

// New hook that always uses a signer for all contract interactions
export function useRegistryContract() {
  const { account, isConnected, chainId } = useWallet();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function setupContract() {
      try {
        console.log("Setting up contract with:", {
          isConnected,
          account,
          chainId,
          hasWindow: typeof window !== "undefined",
          hasEthereum: typeof window !== "undefined" && !!window.ethereum,
          contractAddress: MEDICAL_REGISTRY_ADDRESS
        });
        
        // Clear any previous errors
        setError(null);
        
        // Check for wallet connection
        if (!isConnected) {
          setError("Wallet not connected. Please connect your wallet first");
          setContract(null);
          return;
        }
        
        // Check for account
        if (!account) {
          setError("No account available. Please unlock your MetaMask wallet");
          setContract(null);
          return;
        }
        
        // Check for ethereum provider
        if (typeof window === "undefined" || !window.ethereum) {
          setError("No ethereum provider available. Please install MetaMask");
          setContract(null);
          return;
        }
        
        console.log("Creating Web3Provider from window.ethereum");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Check if we're connected to the right network
        const network = await provider.getNetwork();
        console.log("Connected to network:", network);
        
        // Check if the contract address is valid
        if (!ethers.utils.isAddress(MEDICAL_REGISTRY_ADDRESS)) {
          setError(`Invalid contract address: ${MEDICAL_REGISTRY_ADDRESS}`);
          setContract(null);
          return;
        }
        
        console.log("Getting signer for account:", account);
        // Explicitly use the account to get the signer
        const signer = provider.getSigner();
        
        // Verify signer has an address
        try {
          const signerAddress = await signer.getAddress();
          console.log("Signer address:", signerAddress);
          
          // Verify signer matches current account
          if (signerAddress.toLowerCase() !== account.toLowerCase()) {
            console.error(`Signer address (${signerAddress}) doesn't match current account (${account})`);
            setError(`Signer address (${signerAddress}) doesn't match current account (${account})`);
            setContract(null);
            return;
          }
        } catch (err) {
          console.error("Failed to get signer address:", err);
          setError("Failed to get signer address. Please check your wallet connection");
          setContract(null);
          return;
        }
        
        console.log("Creating contract with signer");
        try {
          // Verify the contract address is valid
          console.log("Checking if contract exists at address:", MEDICAL_REGISTRY_ADDRESS);
          const code = await provider.getCode(MEDICAL_REGISTRY_ADDRESS);
          console.log("Contract code length:", code.length);
          
          if (code === '0x') {
            console.error("No contract deployed at address:", MEDICAL_REGISTRY_ADDRESS);
            setError(`No contract deployed at address: ${MEDICAL_REGISTRY_ADDRESS}. Make sure your Hardhat node is running and the contract is deployed.`);
            setContract(null);
            return;
          }
          
          const newContract = new ethers.Contract(
            MEDICAL_REGISTRY_ADDRESS,
            MEDICAL_REGISTRY_ABI,
            signer
          );
          
          // Verify contract has a signer
          if (!newContract.signer) {
            console.error("Contract created without signer!");
            setError("Contract created without signer. Please check your wallet connection");
            setContract(null);
            return;
          }
          
          // Log contract info for debugging
          console.log("Contract created successfully:");
          console.log("- Contract address:", newContract.address);
          console.log("- Contract signer:", await newContract.signer.getAddress());
          
          // Test a simple call to verify the contract is working
          try {
            // Try a simple view function call
            console.log("Testing contract call...");
            await newContract.hasAccess(account, "0x0000000000000000000000000000000000000001");
            console.log("Contract call successful");
          } catch (err: unknown) {
            console.warn("Contract call test failed:", err);
            
            // Check if this is a "function not found" error, which would indicate wrong ABI or address
            if (err instanceof Error && err.message && err.message.includes("function not found")) {
              setError(`Contract function not found. This could indicate the wrong contract ABI or address. Error: ${err.message}`);
              setContract(null);
              return;
            }
            
            // Other errors might be expected (e.g., access denied), so we continue
            console.log("Continuing despite test call error");
          }
          
          setContract(newContract);
          setError(null);
        } catch (err: unknown) {
          console.error("Error creating contract:", err);
          
          // Provide more specific error messages based on the error type
          if (err instanceof Error) {
          if (err.message && err.message.includes("invalid address")) {
            setError(`Invalid contract address: ${MEDICAL_REGISTRY_ADDRESS}`);
          } else if (err.message && err.message.includes("network")) {
            setError(`Network error: ${err.message}. Make sure your Hardhat node is running.`);
          } else {
              setError(`Error creating contract: ${err.message}`);
            }
          } else {
            setError(`Error creating contract: ${String(err)}`);
          }
          
          setContract(null);
        }
      } catch (err: unknown) {
        console.error("Error in setupContract:", err);
        setError(`Error in setupContract: ${err instanceof Error ? err.message : String(err)}`);
        setContract(null);
      }
    }
    
    setupContract();
  }, [account, isConnected, chainId]);
  
  return { contract, error };
}

// Update useMedicalRegistry to use the new contract hook with error handling
export function useMedicalRegistry() {
  const { isConnected, account } = useWallet();
  const { contract, error: contractError } = useRegistryContract();
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (contractError) {
      setError(contractError);
    }
  }, [contractError]);
  
  // Check if user is registered
  const checkRegistration = useCallback(async () => {
    if (!isConnected || !account || !contract) {
      setIsRegistered(false);
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Checking registration for account:", account);
        // This will throw an error if the patient is not registered
        await contract.getRecordIds(account);
        setIsRegistered(true);
        return true;
      } catch (err) {
        console.log("Registration check failed:", err);
        setIsRegistered(false);
        return false;
      }
    } catch (err) {
      console.error('Error checking registration:', err);
      setError('Failed to check registration status');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, contract]);

  // Add this useEffect to check registration when component mounts
  useEffect(() => {
    if (isConnected && account && contract) {
      checkRegistration();
    }
  }, [isConnected, account, contract, checkRegistration]);

  // Register as a patient
  const registerPatient = useCallback(async () => {
    // Check for wallet connection first
    if (!isConnected) {
      console.error('Wallet not connected');
      setError('Please connect your wallet first');
      return false;
    }
    
    // Check for account
    if (!account) {
      console.error('No account available');
      setError('No wallet account available');
      return false;
    }
    
    // Check for contract
    if (!contract) {
      console.error('Contract not available');
      setError('Smart contract not available. Please make sure you are connected to the correct network');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Registering patient with account:", account);
      
      // Add more detailed logging
      console.log("Contract address:", contract.address);
      console.log("Using signer:", await contract.signer.getAddress());
      
      // Explicitly set gas limit to avoid estimation issues
      const tx = await contract.registerPatient({
        gasLimit: 200000
      });
      
      console.log("Registration transaction sent:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Registration transaction confirmed in block:", receipt.blockNumber);
      
      setIsRegistered(true);
      return true;
    } catch (err) {
      console.error('Error registering patient:', err);
      
      // Provide more specific error messages based on the error
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          setError('Transaction rejected. Please approve the transaction in your wallet');
        } else if (err.message.includes('network')) {
          setError('Network error. Please check your connection and try again');
        } else {
          setError(`Failed to register as patient: ${err.message}`);
        }
      } else {
        setError('Failed to register as patient. Please try again');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, contract]);

  // Grant access to a provider
  const grantAccess = useCallback(async (providerAddress: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check if user is registered first
      let isUserRegistered = false;
      try {
        // This will throw an error if not registered
        await contract.getRecordIds(account);
        isUserRegistered = true;
      } catch (err) {
        console.log("User not registered yet, will auto-register");
      }
      
      // If not registered, register first
      if (!isUserRegistered) {
        try {
          console.log("Registering patient before granting access");
          const registerTx = await contract.registerPatient({ gasLimit: 200000 });
          await registerTx.wait();
          console.log("Patient registered successfully");
        } catch (err) {
          // If registration fails with "already registered", we can continue
          if (err instanceof Error && !err.message.includes("already registered")) {
            console.error("Error registering patient:", err);
            throw new Error(`Failed to register: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
      
      // Now grant access
      console.log("Granting access to provider:", providerAddress);
      const tx = await contract.grantAccess(providerAddress, { gasLimit: 200000 });
      const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error granting access:', err);
      setError('Failed to grant access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract, account]);

  // Revoke access from a provider
  const revokeAccess = useCallback(async (providerAddress: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Revoking access from provider:", providerAddress);
      const tx = await contract.revokeAccess(providerAddress, { gasLimit: 200000 });
        const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error revoking access:', err);
      setError('Failed to revoke access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Check if a provider has access to a patient's records
  const hasAccess = useCallback(async (patientAddress: string, providerAddress: string) => {
    if (!contract) {
      throw new Error('Contract not available');
    }
    
    try {
      return await contract.hasAccess(patientAddress, providerAddress);
    } catch (err) {
      console.error('Error checking access:', err);
      throw err;
    }
  }, [contract]);

  // Get all record IDs for a patient
  const getRecordIds = useCallback(async (patientAddress?: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    const targetAddress = patientAddress || account;
    if (!targetAddress) {
      throw new Error('No target address provided');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const recordIds = await contract.getRecordIds(targetAddress);
      return recordIds as string[];
    } catch (err) {
      console.error('Error getting record IDs:', err);
      setError('Failed to get record IDs');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, account, contract]);

  // Get a specific record
  const getRecord = useCallback(async (patientAddress: string, recordId: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const [cid, timestamp, provider, version] = await contract.getRecord(patientAddress, recordId);
      return {
        cid,
        timestamp: timestamp.toNumber(),
        provider,
        version: version.toNumber()
      };
    } catch (err) {
      console.error('Error getting record:', err);
      setError('Failed to get record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Add a new record
  const addRecord = useCallback(async (patientAddress: string, recordId: string, cid: string, timestamp: number) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.addRecord(patientAddress, recordId, cid, timestamp);
      const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error adding record:', err);
      setError('Failed to add record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Update an existing record
  const updateRecord = useCallback(async (patientAddress: string, recordId: string, newCid: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.updateRecord(patientAddress, recordId, newCid);
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Error updating record:', err);
      setError('Failed to update record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Emergency access function
  const emergencyAccess = useCallback(async (patientAddress: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.emergencyAccess(patientAddress);
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Error using emergency access:', err);
      setError('Failed to use emergency access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Get access list (providers with access to the patient's records)
  const getAccessList = useCallback(async () => {
    if (!isConnected || !account || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    // This is a workaround since the contract doesn't have a direct method to get the access list
    // In a real-world scenario, you would add this function to the contract
    // For now, we'll use events to reconstruct the access list
    
    // This is just a placeholder - in a real implementation, you would query events
    return [];
  }, [isConnected, account, contract]);

  // Add these functions to the useMedicalRegistry hook
  // Update emergency data CID
  const updateEmergencyData = useCallback(async (cid: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.updateEmergencyData(cid, { gasLimit: 200000 });
      const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error updating emergency data:', err);
      setError('Failed to update emergency data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Get emergency data CID
  const getEmergencyDataCid = useCallback(async (patientAddress: string) => {
    if (!contract) {
      throw new Error('Contract not available');
    }
    
    try {
      return await contract.getEmergencyDataCid(patientAddress);
    } catch (err) {
      console.error('Error getting emergency data CID:', err);
      throw err;
    }
  }, [contract]);

  // Set emergency access flag
  const setEmergencyAccess = useCallback(async (allow: boolean) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.setEmergencyAccess(allow, { gasLimit: 200000 });
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Error setting emergency access:', err);
      setError('Failed to set emergency access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Check if emergency access is allowed
  const isEmergencyAccessAllowed = useCallback(async (patientAddress: string) => {
    if (!contract) {
      throw new Error('Contract not available');
    }
    
    try {
      return await contract.isEmergencyAccessAllowed(patientAddress);
    } catch (err) {
      console.error('Error checking emergency access:', err);
      throw err;
    }
  }, [contract]);

  // Doctor Access Request Functions
  
  // Request access to patient records
  const requestAccess = useCallback(async (
    patientAddress: string, 
    requestedRecords: string[], 
    reason: string, 
    durationInDays: number
  ) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.requestAccess(
        patientAddress, 
        requestedRecords, 
        reason, 
        durationInDays,
        { gasLimit: 300000 }
      );
      const receipt = await tx.wait();
      
      // Extract request ID from events
      const requestEvent = receipt.events?.find((e: any) => e.event === 'AccessRequested');
      const requestId = requestEvent?.args?.requestId;
      
      return { hash: tx.hash, receipt, requestId };
    } catch (err) {
      console.error('Error requesting access:', err);
      setError('Failed to request access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Approve access request
  const approveAccess = useCallback(async (
    requestId: string, 
    approvedRecords: string[], 
    sharedDataCid: string
  ) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.approveAccess(
        requestId, 
        approvedRecords, 
        sharedDataCid,
        { gasLimit: 300000 }
      );
      const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error approving access:', err);
      setError('Failed to approve access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Deny access request
  const denyAccess = useCallback(async (requestId: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.denyAccess(requestId, { gasLimit: 200000 });
      const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error denying access:', err);
      setError('Failed to deny access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Revoke doctor access
  const revokeDoctorAccess = useCallback(async (doctorAddress: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.revokeDoctorAccess(doctorAddress, { gasLimit: 200000 });
      const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error revoking doctor access:', err);
      setError('Failed to revoke doctor access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  // Get access request details
  const getAccessRequest = useCallback(async (requestId: string) => {
    if (!contract) {
      throw new Error('Contract not available');
    }
    
    try {
      const [doctor, patient, requestedRecords, reason, requestedDuration, timestamp, approved] = 
        await contract.getAccessRequest(requestId);
      
      return {
        doctor,
        patient,
        requestedRecords,
        reason,
        requestedDuration: requestedDuration.toNumber(),
        timestamp: timestamp.toNumber(),
        approved
      };
    } catch (err) {
      console.error('Error getting access request:', err);
      throw err;
    }
  }, [contract]);

  // Get pending requests for a patient
  const getPendingRequests = useCallback(async (patientAddress?: string) => {
    if (!contract) {
      throw new Error('Contract not available');
    }
    
    try {
      const targetAddress = patientAddress || account;
      if (!targetAddress) {
        throw new Error('No target address provided');
      }
      
      return await contract.getPendingRequests(targetAddress);
    } catch (err) {
      console.error('Error getting pending requests:', err);
      throw err;
    }
  }, [contract, account]);

  // Get doctor access details
  const getDoctorAccess = useCallback(async (patientAddress: string, doctorAddress: string) => {
    if (!contract) {
      throw new Error('Contract not available');
    }
    
    try {
      const [authorizedRecords, expiresAt, sharedDataCid, exists] = 
        await contract.getDoctorAccess(patientAddress, doctorAddress);
      
      return {
        authorizedRecords,
        expiresAt: expiresAt.toNumber(),
        sharedDataCid,
        exists
      };
    } catch (err) {
      console.error('Error getting doctor access:', err);
      throw err;
    }
  }, [contract]);

  // Check if doctor has access to specific record
  const hasDoctorAccess = useCallback(async (patientAddress: string, doctorAddress: string, recordId: string) => {
    if (!contract) {
      throw new Error('Contract not available');
    }
    
    try {
      return await contract.hasDoctorAccess(patientAddress, doctorAddress, recordId);
    } catch (err) {
      console.error('Error checking doctor access:', err);
      throw err;
    }
  }, [contract]);

  // Clean up expired access
  const cleanupExpiredAccess = useCallback(async (patientAddress: string, doctorAddress: string) => {
    if (!isConnected || !contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.cleanupExpiredAccess(patientAddress, doctorAddress, { gasLimit: 200000 });
      const receipt = await tx.wait();
      return { hash: tx.hash, receipt };
    } catch (err) {
      console.error('Error cleaning up expired access:', err);
      setError('Failed to cleanup expired access');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, contract]);

  return {
    contract,
    isRegistered,
    loading,
    error,
    checkRegistration,
    registerPatient,
    getRecordIds,
    getRecord,
    addRecord,
    updateRecord,
    grantAccess,
    revokeAccess,
    hasAccess,
    emergencyAccess,
    getAccessList,
    updateEmergencyData,
    getEmergencyDataCid,
    setEmergencyAccess,
    isEmergencyAccessAllowed,
    // Doctor access functions
    requestAccess,
    approveAccess,
    denyAccess,
    revokeDoctorAccess,
    getAccessRequest,
    getPendingRequests,
    getDoctorAccess,
    hasDoctorAccess,
    cleanupExpiredAccess
  };
} 