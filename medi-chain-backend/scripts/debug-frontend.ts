import { ethers } from "hardhat";

async function main() {
  console.log("=== FRONTEND DEBUGGING HELPER ===");
  
  // Get the MedicalRegistry contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const contractAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const medicalRegistry = MedicalRegistry.attach(contractAddress);
  
  console.log(`Contract address: ${contractAddress}`);
  console.log(`ABI: ${JSON.stringify(MedicalRegistry.interface.format('json'), null, 2)}`);
  
  // Get signers
  const signers = await ethers.getSigners();
  const patient = signers[0];  // Account #0
  const provider = signers[10]; // Account #10
  
  console.log("\nAccount information:");
  console.log(`- Patient (Account #0): ${patient.address}`);
  console.log(`- Provider (Account #10): ${provider.address}`);
  
  try {
    // Check access
    const hasAccess = await medicalRegistry.hasAccess(patient.address, provider.address);
    console.log(`\nProvider has access to patient records: ${hasAccess}`);
    
    // Check records
    const patientRecords = await medicalRegistry.connect(patient).getRecordIds(patient.address);
    console.log(`\nPatient has ${patientRecords.length} records`);
    
    // Print JavaScript code for frontend debugging
    console.log("\n=== FRONTEND CODE SNIPPETS ===");
    
    console.log("\n// Connect to contract as patient");
    console.log(`const contractAddress = "${contractAddress}";`);
    console.log(`const contractABI = ${JSON.stringify(MedicalRegistry.interface.format('json'))};`);
    console.log("const provider = new ethers.providers.Web3Provider(window.ethereum);");
    console.log("const signer = provider.getSigner();");
    console.log("const contract = new ethers.Contract(contractAddress, contractABI, signer);");
    
    console.log("\n// Get patient records");
    console.log("const address = await signer.getAddress();");
    console.log("const recordIds = await contract.getRecordIds(address);");
    console.log("console.log('Record IDs:', recordIds);");
    
    console.log("\n// Get record details");
    console.log("if (recordIds.length > 0) {");
    console.log("  const recordId = recordIds[0];");
    console.log("  const record = await contract.getRecord(address, recordId);");
    console.log("  console.log('Record details:', {");
    console.log("    cid: record[0],");
    console.log("    timestamp: new Date(record[1].toNumber() * 1000),");
    console.log("    provider: record[2],");
    console.log("    version: record[3].toNumber()");
    console.log("  });");
    console.log("}");
    
    console.log("\n// Grant access to provider");
    console.log(`const providerAddress = "${provider.address}";`);
    console.log("const tx = await contract.grantAccess(providerAddress);");
    console.log("await tx.wait();");
    console.log("console.log('Access granted');");
    
    console.log("\n=== METAMASK SETUP ===");
    console.log("1. Network Name: Hardhat");
    console.log("2. RPC URL: http://localhost:8545");
    console.log("3. Chain ID: 31337");
    console.log("4. Currency Symbol: ETH");
    
    console.log("\n=== PRIVATE KEYS ===");
    console.log("Patient (Account #0): 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("Provider (Account #10): 0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897");
    
  } catch (error) {
    console.error("Error during debugging:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 