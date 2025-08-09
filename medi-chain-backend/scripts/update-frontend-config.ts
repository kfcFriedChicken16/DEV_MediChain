import fs from 'fs';
import path from 'path';

// Get the contract address from the command line arguments
const contractAddress = process.argv[2];

if (!contractAddress) {
  console.error('Please provide a contract address as an argument');
  process.exit(1);
}

// Path to the frontend config file
const configFilePath = path.join(__dirname, '../../medichain/src/config.ts');

// Read the current config file
let configContent = fs.readFileSync(configFilePath, 'utf8');

// Replace the contract address in the config file
const newConfigContent = configContent.replace(
  /MEDICAL_REGISTRY_ADDRESS = process\.env\.NEXT_PUBLIC_MEDICAL_REGISTRY_ADDRESS \|\| '(0x[a-fA-F0-9]+)'/,
  `MEDICAL_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_MEDICAL_REGISTRY_ADDRESS || '${contractAddress}'`
);

// Write the updated config back to the file
fs.writeFileSync(configFilePath, newConfigContent);

console.log(`Updated frontend config with contract address: ${contractAddress}`); 