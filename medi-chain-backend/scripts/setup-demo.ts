import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("=== MEDICHAIN DEMO SETUP ===");
  
  // Get the deployed contract address
  const MEDICAL_REGISTRY_ADDRESS = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
  console.log(`Using MedicalRegistry at: ${MEDICAL_REGISTRY_ADDRESS}`);
  
  // Get signers
  const [patient, , , , , , , , , , provider] = await ethers.getSigners();
  
  console.log("\nAccount information:");
  console.log(`- Patient (Account #0): ${patient.address}`);
  console.log(`- Provider (Account #10): ${provider.address}`);
  
  // Connect to the deployed contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const registry = MedicalRegistry.attach(MEDICAL_REGISTRY_ADDRESS);
  
  console.log("\nStep 1: Registering patient...");
  try {
    // Register patient first
    const registerTx = await registry.connect(patient).registerPatient();
    await registerTx.wait();
    console.log("Patient registered successfully!");
  } catch (error: any) {
    if (error.message.includes("already registered")) {
      console.log("Patient already registered.");
    } else {
      console.error("Error registering patient:", error.message);
      throw error;
    }
  }
  
  console.log("\nStep 2: Patient granting access to provider...");
  try {
    // Patient grants access to provider
    const grantTx = await registry.connect(patient).grantAccess(provider.address);
    await grantTx.wait();
    console.log("Access granted successfully!");
    
    // Verify access
    const hasAccess = await registry.hasAccess(patient.address, provider.address);
    console.log(`Access verification: ${hasAccess ? 'Successful' : 'Failed'}`);
  } catch (error: any) {
    console.error("Error granting access:", error.message);
    throw error;
  }
  
  console.log("\nStep 3: Creating a sample medical record...");
  
  // Create sample medical record data
  const medicalRecord = {
    patientAddress: patient.address,
    recordType: "Blood Test",
    date: new Date().toISOString(),
    provider: provider.address,
    doctorName: "Dr. Smith",
    facilityName: "Demo Hospital",
    createdAt: new Date().toISOString(),
    metadata: {
      recordFormat: "v1.0",
      encryptionMethod: "AES-256",
      accessControl: "blockchain-based"
    },
    results: "All values within normal range. Glucose: 95 mg/dL, Cholesterol: 180 mg/dL",
    notes: "Patient is healthy. Recommend annual checkup."
  };
  
  // Save the record to a file
  const recordPath = path.join(__dirname, '../demo-medical-record.json');
  fs.writeFileSync(recordPath, JSON.stringify(medicalRecord, null, 2));
  console.log(`Medical record saved to: ${recordPath}`);
  
  // For demo purposes, we'll simulate what the frontend encryption would do
  // In a real app, this would be done in the frontend before uploading to IPFS
  const patientKey = patient.address; // Use patient address as encryption key (same as frontend)
  const encryptedData = Buffer.from(JSON.stringify(medicalRecord)).toString('base64'); // Simple base64 for demo
  
  // Create a mock IPFS response that matches what the frontend expects
  const mockIPFSData = {
    content: encryptedData,
    metadata: {
      encryptionMethod: "AES-256",
      encryptedBy: provider.address,
      timestamp: new Date().toISOString()
    }
  };
  
  // For demo, save the "IPFS data" locally and use a predictable CID
  const ipfsDataPath = path.join(__dirname, '../mock-ipfs-data.json');
  fs.writeFileSync(ipfsDataPath, JSON.stringify(mockIPFSData, null, 2));
  
  // Use a consistent demo CID that the frontend can recognize
  const demoCID = "QmDemo1234567890abcdefghijklmnopqrstuvwxyz";
  console.log(`Generated IPFS CID: ${demoCID}`);
  
  console.log("\nStep 4: Provider adding record to the blockchain...");
  
  // Generate a unique record ID
  const recordName = `blood-test-${Date.now()}-demo`;
  const recordId = ethers.utils.id(recordName);
  console.log(`Record ID: ${recordId}`);
  console.log(`CID: ${demoCID}`);
  
  try {
    // Provider adds the record (should work now since patient granted access)
    const timestamp = Math.floor(Date.now() / 1000);
    const addRecordTx = await registry.connect(provider).addRecord(
      patient.address,
      recordId,
      demoCID,
      timestamp
    );
    await addRecordTx.wait();
    console.log("Record added successfully!");
  } catch (error: any) {
    console.error("Error adding record:", error.message);
    throw error;
  }
  
  console.log("\nStep 5: Verifying records...");
  
  // Verify records can be retrieved by patient
  console.log("\nPatient's records (as patient):");
  try {
    const patientRecordIds = await registry.connect(patient).getRecordIds(patient.address);
    console.log(`Found ${patientRecordIds.length} records`);
    
    for (let i = 0; i < patientRecordIds.length; i++) {
      const record = await registry.connect(patient).getRecord(patient.address, patientRecordIds[i]);
      console.log(`Record ${i + 1}:`);
      console.log(`- ID: ${patientRecordIds[i]}`);
      console.log(`- CID: ${record.cid}`);
      console.log(`- Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
      console.log(`- Provider: ${record.provider}`);
      console.log(`- Version: ${record.version}`);
    }
  } catch (error: any) {
    console.error("Error retrieving patient records:", error.message);
  }
  
  // Verify records can be retrieved by provider
  console.log("\nPatient's records (as provider):");
  try {
    const providerRecordIds = await registry.connect(provider).getRecordIds(patient.address);
    console.log(`Found ${providerRecordIds.length} records`);
    
    for (let i = 0; i < providerRecordIds.length; i++) {
      const record = await registry.connect(provider).getRecord(patient.address, providerRecordIds[i]);
      console.log(`Record ${i + 1}:`);
      console.log(`- ID: ${providerRecordIds[i]}`);
      console.log(`- CID: ${record.cid}`);
      console.log(`- Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
      console.log(`- Provider: ${record.provider}`);
      console.log(`- Version: ${record.version}`);
    }
  } catch (error: any) {
    console.error("Error retrieving provider records:", error.message);
  }
  
  console.log("\n=== DEMO INSTRUCTIONS ===");
  console.log("1. Start your frontend: cd ../medichain && npm run dev");
  console.log("2. Connect with MetaMask to http://localhost:8545 (Hardhat Network)");
  console.log("3. Import these accounts into MetaMask:");
  console.log(`   - Patient: ${patient.address} -> Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`   - Provider: ${provider.address} -> Private Key: 0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897`);
  console.log("4. When using the patient account, you should be able to view your records");
  console.log("5. When using the provider account, you should be able to add records for the patient");
  console.log("\nProper Workflow:");
  console.log("- Patient connects and goes to /access to grant access to providers");
  console.log("- Provider connects and goes to /provider/dashboard to add records");
  console.log("- Patient can view records in /records and they update automatically!");
  console.log("- Patient can revoke access in /access when needed");
  
  console.log("\nIf you have issues with the frontend:");
  console.log("- Check that your contract address is correct in the frontend");
  console.log("- Make sure you're using the correct MetaMask account for each role");
  console.log("- Verify your frontend is calling the contract methods correctly");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 