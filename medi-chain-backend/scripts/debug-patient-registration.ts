import { ethers } from "hardhat";

async function main() {
  console.log("=== PATIENT REGISTRATION DEBUG ===");
  
  const MEDICAL_REGISTRY_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  console.log(`Using contract at: ${MEDICAL_REGISTRY_ADDRESS}`);
  
  // Get signers
  const [patient, , , , , , , , , , provider] = await ethers.getSigners();
  
  console.log(`\nChecking accounts:`);
  console.log(`- Patient: ${patient.address}`);
  console.log(`- Provider: ${provider.address}`);
  
  // Connect to the contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const contract = MedicalRegistry.attach(MEDICAL_REGISTRY_ADDRESS);
  
  try {
    // Check if patient is registered by calling a patient function
    console.log(`\n=== CHECKING PATIENT REGISTRATION ===`);
    
    // Try to get record IDs for the patient
    try {
      const recordIds = await contract.connect(patient).getRecordIds(patient.address);
      console.log(`✅ Patient IS registered. Record count: ${recordIds.length}`);
      
      // Check access for provider
      const hasAccess = await contract.hasAccess(patient.address, provider.address);
      console.log(`Provider access status: ${hasAccess}`);
      
    } catch (error: any) {
      console.log(`❌ Patient NOT registered. Error: ${error.message}`);
      
      // Register the patient
      console.log(`\n=== REGISTERING PATIENT ===`);
      const registerTx = await contract.connect(patient).registerPatient();
      await registerTx.wait();
      console.log(`✅ Patient registered successfully!`);
      
      // Verify registration
      const recordIds = await contract.connect(patient).getRecordIds(patient.address);
      console.log(`✅ Verification: Record count is now ${recordIds.length}`);
    }
    
    // Check and fix access if needed
    console.log(`\n=== CHECKING/FIXING ACCESS ===`);
    const hasAccess = await contract.hasAccess(patient.address, provider.address);
    console.log(`Provider has access: ${hasAccess}`);
    
    if (!hasAccess) {
      console.log(`Granting access to provider...`);
      const grantTx = await contract.connect(patient).grantAccess(provider.address);
      await grantTx.wait();
      console.log(`✅ Access granted!`);
    }
    
    // Final verification
    console.log(`\n=== FINAL STATUS ===`);
    const finalRecordIds = await contract.connect(patient).getRecordIds(patient.address);
    const finalHasAccess = await contract.hasAccess(patient.address, provider.address);
    console.log(`Patient records: ${finalRecordIds.length}`);
    console.log(`Provider access: ${finalHasAccess}`);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 