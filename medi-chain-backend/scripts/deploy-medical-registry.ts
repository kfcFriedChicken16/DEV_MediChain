import { ethers } from "hardhat";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

async function main() {
  console.log("Deploying MedicalRegistry contract...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const medicalRegistry = await MedicalRegistry.deploy();
  
  await medicalRegistry.deployed();
  
  console.log(`MedicalRegistry deployed to: ${medicalRegistry.address}`);
  
  // Update the frontend config with the new contract address
  try {
    console.log("Updating frontend config...");
    await execPromise(`npx ts-node scripts/update-frontend-config.ts ${medicalRegistry.address}`);
    console.log("Frontend config updated successfully");
  } catch (error) {
    console.error("Failed to update frontend config:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 