import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("=== TESTING CONTRACT INTERACTION ===");
  
  // Get contract address from deployment
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log("Contract address:", contractAddress);
  
  // Get signers (accounts)
  const [patientSigner, providerSigner] = await ethers.getSigners();
  console.log("Patient address:", patientSigner.address);
  console.log("Provider address:", providerSigner.address);
  
  // Get contract factory
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  
  // Connect to deployed contract with patient signer
  const patientContract = MedicalRegistry.attach(contractAddress).connect(patientSigner);
  console.log("Connected to contract with patient signer");
  
  // Connect to deployed contract with provider signer
  const providerContract = MedicalRegistry.attach(contractAddress).connect(providerSigner);
  console.log("Connected to contract with provider signer");
  
  // Test 1: Grant access from patient to provider
  console.log("\nTest 1: Grant access from patient to provider");
  try {
    const tx1 = await patientContract.grantAccess(providerSigner.address);
    await tx1.wait();
    console.log("✅ Access granted successfully");
    
    // Verify access
    const hasAccess = await patientContract.hasAccess(patientSigner.address, providerSigner.address);
    console.log("Provider has access:", hasAccess);
  } catch (error) {
    console.error("❌ Failed to grant access:", error);
  }
  
  // Test 2: Add a record from provider
  console.log("\nTest 2: Add a record from provider");
  try {
    const recordId = ethers.utils.id("test-record-" + Date.now());
    const cid = "QmTestCID" + Date.now();
    console.log("Record ID:", recordId);
    console.log("CID:", cid);
    
    const tx2 = await providerContract.addRecord(patientSigner.address, recordId, cid);
    await tx2.wait();
    console.log("✅ Record added successfully");
    
    // Verify record
    const [recordCid, timestamp, provider, version] = await patientContract.getRecord(patientSigner.address, recordId);
    console.log("Record details:");
    console.log("- CID:", recordCid);
    console.log("- Timestamp:", new Date(timestamp.toNumber() * 1000).toISOString());
    console.log("- Provider:", provider);
    console.log("- Version:", version.toNumber());
  } catch (error) {
    console.error("❌ Failed to add record:", error);
  }
  
  // Test 3: Get all records for patient
  console.log("\nTest 3: Get all records for patient");
  try {
    const recordIds = await patientContract.getRecordIds(patientSigner.address);
    console.log("Patient has", recordIds.length, "records");
    
    for (let i = 0; i < recordIds.length; i++) {
      const recordId = recordIds[i];
      const [cid, timestamp, provider, version] = await patientContract.getRecord(patientSigner.address, recordId);
      console.log(`Record ${i + 1}:`);
      console.log("- ID:", recordId);
      console.log("- CID:", cid);
      console.log("- Timestamp:", new Date(timestamp.toNumber() * 1000).toISOString());
      console.log("- Provider:", provider);
      console.log("- Version:", version.toNumber());
    }
  } catch (error) {
    console.error("❌ Failed to get records:", error);
  }
  
  console.log("\n=== TEST COMPLETE ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 