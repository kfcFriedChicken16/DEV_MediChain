import { ethers } from "hardhat";
import yargs from "yargs/yargs";

// Handle arguments for Hardhat
const argv = yargs(process.argv.slice(2).filter(arg => !arg.startsWith('--network')))
  .option('provider', {
    alias: 'p',
    description: "Provider's Ethereum address to grant access to",
    type: 'string',
    demandOption: true
  })
  .option('contract', {
    alias: 'c',
    description: 'Contract address (optional)',
    type: 'string',
    default: "0xa85EffB2658CFd81e0B1AaD4f2364CdBCd89F3a1"
  })
  .help()
  .parseSync();

async function main() {
  const providerAddress = argv.provider;
  const contractAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

  // Get the MedicalRegistry contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const medicalRegistry = MedicalRegistry.attach(contractAddress);
  
  console.log(`Interacting with MedicalRegistry at: ${contractAddress}`);
  
  // Get signers - patient is the first account
  const [patient] = await ethers.getSigners();
  
  console.log("\nUsing accounts:");
  console.log(`- Patient (your account): ${patient.address}`);
  console.log(`- Provider to grant access: ${providerAddress}`);
  
  try {
    // Check if provider already has access to patient records
    const hasAccess = await medicalRegistry.hasAccess(patient.address, providerAddress);
    console.log(`\nProvider already has access to patient records: ${hasAccess}`);
    
    if (hasAccess) {
      console.log("Access is already granted. No action needed.");
      return;
    }
    
    // Grant access to provider
    console.log("\nGranting access to provider...");
    const grantTx = await medicalRegistry.connect(patient).grantAccess(providerAddress);
    await grantTx.wait();
    console.log("Access granted successfully!");
    
    // Verify access was granted
    const accessVerified = await medicalRegistry.hasAccess(patient.address, providerAddress);
    console.log(`\nVerifying access: Provider has access = ${accessVerified}`);
    
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