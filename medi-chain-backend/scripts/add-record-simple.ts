import { ethers } from "hardhat";

async function main() {
  console.log("=== ADDING MEDICAL RECORD ===");
  
  // Get the MedicalRegistry contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const contractAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const medicalRegistry = MedicalRegistry.attach(contractAddress);
  
  console.log(`Interacting with MedicalRegistry at: ${contractAddress}`);
  
  // Get signers - using account #10 as provider
  const [owner, patient, provider] = await ethers.getSigners();
  
  console.log("Using accounts:");
  console.log(`- Owner: ${owner.address}`);
  console.log(`- Patient: ${patient.address}`);
  console.log(`- Provider: ${provider.address}`);
  
  try {
    // Check if provider has access to patient records
    const hasAccess = await medicalRegistry.hasAccess(patient.address, provider.address);
    console.log(`\nProvider has access to patient records: ${hasAccess}`);
    
    // If provider doesn't have access, grant access
    if (!hasAccess) {
      console.log("\nGranting access to provider...");
      const grantTx = await medicalRegistry.connect(patient).grantAccess(provider.address);
      await grantTx.wait();
      console.log("Access granted to provider!");
    }
    
    // Add a medical record
    const recordName = "blood-test-" + new Date().toISOString().split('T')[0];
    const recordId = ethers.utils.id(recordName);
    const cid = "QmWmyoMoctfbAaiEs2G46gpeUmhqFRDW6KWo64y5r581Vz"; // Example IPFS CID
    
    console.log("\nAdding a medical record...");
    console.log(`Record Name: ${recordName}`);
    console.log(`Record ID: ${recordId}`);
    console.log(`IPFS CID: ${cid}`);
    
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
    
    // Get the record
    console.log("\nRetrieving the record...");
    const [recordCid, timestamp, recordProvider, version] = await medicalRegistry.connect(provider).getRecord(patient.address, recordId);
    
    console.log("\nRecord details:");
    console.log(`- CID: ${recordCid}`);
    console.log(`- Timestamp: ${new Date(timestamp.toNumber() * 1000).toISOString()}`);
    console.log(`- Provider: ${recordProvider}`);
    console.log(`- Version: ${version.toNumber()}`);
    
    // Get all record IDs for the patient
    console.log("\nGetting all record IDs for the patient...");
    const recordIds = await medicalRegistry.connect(patient).getRecordIds(patient.address);
    console.log(`Patient has ${recordIds.length} records`);
    recordIds.forEach((id: string, index: number) => {
      console.log(`Record ${index + 1}: ${id}`);
    });
    
  } catch (error) {
    console.error("Error during interaction:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 