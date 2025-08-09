import { ethers } from "hardhat";
import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";

/**
 * Simple encryption function for demo purposes
 * In a real app, this would use proper encryption libraries
 */
function encryptData(data: string, key: string): string {
  const algorithm = 'aes-256-ctr';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Simple decryption function for demo purposes
 */
function decryptData(encryptedData: string, key: string): string {
  const algorithm = 'aes-256-ctr';
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Simulates IPFS upload by generating a CID
 * In a real app, this would use actual IPFS libraries
 */
function simulateIpfsUpload(data: string): string {
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `Qm${hash.substring(0, 44)}`;
}

async function main() {
  console.log("=== IPFS INTEGRATION TEST ===");
  
  // Get the MedicalRegistry contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const contractAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const medicalRegistry = MedicalRegistry.attach(contractAddress);
  
  console.log(`Contract address: ${contractAddress}`);
  
  // Get signers
  const [patient, provider] = await ethers.getSigners();
  
  console.log("\nAccount information:");
  console.log(`- Patient: ${patient.address}`);
  console.log(`- Provider: ${provider.address}`);
  
  try {
    // Step 1: Ensure provider has access
    console.log("\nStep 1: Checking provider access...");
    const hasAccess = await medicalRegistry.hasAccess(patient.address, provider.address);
    
    if (!hasAccess) {
      console.log("Provider doesn't have access. Granting access...");
      const grantTx = await medicalRegistry.connect(patient).grantAccess(provider.address);
      await grantTx.wait();
      console.log("Access granted successfully!");
    } else {
      console.log("Provider already has access.");
    }
    
    // Step 2: Create and encrypt a medical record
    console.log("\nStep 2: Creating and encrypting a medical record...");
    
    const medicalRecord = {
      patientAddress: patient.address,
      recordType: "Blood Test",
      date: new Date().toISOString().split('T')[0],
      provider: provider.address,
      doctorName: "Dr. Smith",
      facilityName: "MediChain Hospital",
      createdAt: new Date().toISOString(),
      results: {
        hemoglobin: "14.2 g/dL",
        whiteBloodCells: "6.8 x 10^9/L",
        platelets: "210 x 10^9/L"
      },
      notes: "All results within normal range."
    };
    
    const recordJson = JSON.stringify(medicalRecord);
    console.log("Medical record created.");
    
    // Generate a simple encryption key from patient's address (for demo only)
    const encryptionKey = crypto.createHash('sha256').update(patient.address).digest('hex');
    
    // Encrypt the record
    const encryptedRecord = encryptData(recordJson, encryptionKey);
    console.log("Record encrypted.");
    
    // Step 3: Simulate IPFS upload
    console.log("\nStep 3: Simulating IPFS upload...");
    const cid = simulateIpfsUpload(encryptedRecord);
    console.log(`Generated IPFS CID: ${cid}`);
    
    // Step 4: Store the CID on the blockchain
    console.log("\nStep 4: Storing CID on the blockchain...");
    const recordName = "blood-test-ipfs-" + new Date().toISOString().split('T')[0];
    const recordId = ethers.utils.id(recordName);
    
    console.log(`Record ID: ${recordId}`);
    
    try {
      const addTx = await medicalRegistry.connect(provider).addRecord(patient.address, recordId, cid);
      await addTx.wait();
      console.log("Record added successfully!");
    } catch (error: any) {
      if (error.reason && error.reason.includes("Record already exists")) {
        console.log("Record already exists, retrieving it instead...");
      } else {
        throw error;
      }
    }
    
    // Step 5: Retrieve and decrypt the record
    console.log("\nStep 5: Retrieving and decrypting the record...");
    
    const [retrievedCid, timestamp, recordProvider, version] = await medicalRegistry.connect(patient).getRecord(patient.address, recordId);
    
    console.log("Record details from blockchain:");
    console.log(`- CID: ${retrievedCid}`);
    console.log(`- Timestamp: ${new Date(timestamp.toNumber() * 1000).toISOString()}`);
    console.log(`- Provider: ${recordProvider}`);
    console.log(`- Version: ${version.toNumber()}`);
    
    // In a real app, we would fetch the data from IPFS using the CID
    // For this demo, we'll use our encrypted data directly
    console.log("\nDecrypting the record...");
    const decryptedRecord = decryptData(encryptedRecord, encryptionKey);
    const parsedRecord = JSON.parse(decryptedRecord);
    
    console.log("\nDecrypted record:");
    console.log(`- Patient: ${parsedRecord.patientAddress}`);
    console.log(`- Record Type: ${parsedRecord.recordType}`);
    console.log(`- Date: ${parsedRecord.date}`);
    console.log(`- Doctor: ${parsedRecord.doctorName}`);
    console.log(`- Results: ${JSON.stringify(parsedRecord.results)}`);
    
    console.log("\nIPFS integration test completed successfully!");
    
  } catch (error) {
    console.error("Error during test:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 