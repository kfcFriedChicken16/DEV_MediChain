import { ethers } from "hardhat";

async function main() {
  console.log("=== TESTING PERMISSIONS ===");
  
  // Get the MedicalRegistry contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const contractAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const medicalRegistry = MedicalRegistry.attach(contractAddress);
  
  console.log(`Interacting with MedicalRegistry at: ${contractAddress}`);
  
  // Get signers
  const signers = await ethers.getSigners();
  const patient = signers[0];  // Account #0
  const provider = signers[10]; // Account #10
  
  console.log("\nAccount information:");
  console.log(`- Patient (Account #0): ${patient.address}`);
  console.log(`- Provider (Account #10): ${provider.address}`);
  
  try {
    // Test 1: Patient accessing their own records
    console.log("\nTest 1: Patient accessing their own records");
    try {
      const recordIds = await medicalRegistry.connect(patient).getRecordIds(patient.address);
      console.log(`✅ SUCCESS: Patient can access their own records (${recordIds.length} records)`);
    } catch (error: any) {
      console.error(`❌ FAILED: Patient cannot access their own records: ${error.message}`);
    }
    
    // Test 2: Provider accessing patient records with access
    console.log("\nTest 2: Provider accessing patient records with access");
    try {
      const hasAccess = await medicalRegistry.hasAccess(patient.address, provider.address);
      console.log(`Provider has access: ${hasAccess}`);
      
      const recordIds = await medicalRegistry.connect(provider).getRecordIds(patient.address);
      console.log(`✅ SUCCESS: Provider can access patient records (${recordIds.length} records)`);
    } catch (error: any) {
      console.error(`❌ FAILED: Provider cannot access patient records: ${error.message}`);
    }
    
    // Test 3: Patient trying to access provider records (should fail)
    console.log("\nTest 3: Patient trying to access provider records");
    try {
      const recordIds = await medicalRegistry.connect(patient).getRecordIds(provider.address);
      console.log(`⚠️ UNEXPECTED: Patient can access provider records (${recordIds.length} records)`);
    } catch (error: any) {
      console.log(`✅ EXPECTED FAILURE: Patient cannot access provider records: ${error.message}`);
    }
    
    // Test 4: Provider trying to access their own records
    console.log("\nTest 4: Provider accessing their own records");
    try {
      const recordIds = await medicalRegistry.connect(provider).getRecordIds(provider.address);
      console.log(`✅ SUCCESS: Provider can access their own records (${recordIds.length} records)`);
    } catch (error: any) {
      console.error(`❌ FAILED: Provider cannot access their own records: ${error.message}`);
    }
    
    // Frontend debugging instructions
    console.log("\n=== FRONTEND DEBUGGING INSTRUCTIONS ===");
    console.log("1. Make sure you're using the correct MetaMask account for each role:");
    console.log("   - When acting as a patient, use Account #0");
    console.log("   - When acting as a provider, use Account #10");
    console.log("2. Check that your frontend code is calling getRecordIds with the correct parameters:");
    console.log("   - When patient views their records: contract.getRecordIds(patientAddress)");
    console.log("   - When provider views patient records: contract.getRecordIds(patientAddress)");
    console.log("3. Verify that you're connecting to the contract with the correct signer:");
    console.log("   - Use the currently connected MetaMask account as the signer");
    
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