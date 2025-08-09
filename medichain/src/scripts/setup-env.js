// Setup environment variables for MediChain
// Run with: node src/scripts/setup-env.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to the .env.local file
const envFilePath = path.join(process.cwd(), '.env.local');

// Check if .env.local already exists
const checkEnvFile = () => {
  if (fs.existsSync(envFilePath)) {
    console.log('\n⚠️  A .env.local file already exists!');
    rl.question('Do you want to overwrite it? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        startSetup();
      } else {
        console.log('Setup canceled. Your existing .env.local file was not modified.');
        rl.close();
      }
    });
  } else {
    startSetup();
  }
};

// Start the setup process
const startSetup = () => {
  console.log('\n=== MediChain Environment Setup ===');
  console.log('This script will help you set up your IPFS configuration.\n');
  
  rl.question('Which IPFS provider would you like to use? (pinata/infura): ', (provider) => {
    if (provider.toLowerCase() === 'pinata') {
      setupPinata();
    } else if (provider.toLowerCase() === 'infura') {
      setupInfura();
    } else {
      console.log('Invalid choice. Please choose either "pinata" or "infura".');
      rl.close();
    }
  });
};

// Setup Pinata configuration
const setupPinata = () => {
  console.log('\n=== Pinata Configuration ===');
  console.log('You can get your API keys from https://app.pinata.cloud/developers/api-keys\n');
  
  rl.question('Enter your Pinata API Key: ', (apiKey) => {
    rl.question('Enter your Pinata Secret API Key: ', (secretKey) => {
      rl.question('Enter your Medical Registry contract address (default: 0x5FbDB2315678afecb367f032d93F642f64180aa3): ', (contractAddress) => {
        const envContent = `# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_PUBLIC_PINATA_API_KEY=${apiKey}
NEXT_PUBLIC_PINATA_SECRET_API_KEY=${secretKey}

# Contract Configuration
NEXT_PUBLIC_MEDICAL_REGISTRY_ADDRESS=${contractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}
`;
        
        writeEnvFile(envContent, 'Pinata');
      });
    });
  });
};

// Setup Infura configuration
const setupInfura = () => {
  console.log('\n=== Infura Configuration ===');
  console.log('You can get your Project ID and Secret from https://infura.io/dashboard\n');
  
  rl.question('Enter your Infura Project ID: ', (projectId) => {
    rl.question('Enter your Infura Project Secret: ', (projectSecret) => {
      rl.question('Enter your Medical Registry contract address (default: 0x5FbDB2315678afecb367f032d93F642f64180aa3): ', (contractAddress) => {
        const envContent = `# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_PUBLIC_INFURA_PROJECT_ID=${projectId}
NEXT_PUBLIC_INFURA_PROJECT_SECRET=${projectSecret}

# Contract Configuration
NEXT_PUBLIC_MEDICAL_REGISTRY_ADDRESS=${contractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}
`;
        
        writeEnvFile(envContent, 'Infura');
      });
    });
  });
};

// Write the .env.local file
const writeEnvFile = (content, provider) => {
  try {
    fs.writeFileSync(envFilePath, content);
    console.log(`\n✅ Environment file created successfully with ${provider} configuration!`);
    console.log(`File location: ${envFilePath}`);
    console.log('\nYou can now run the application with:');
    console.log('npm run dev');
    rl.close();
  } catch (error) {
    console.error('Error writing environment file:', error.message);
    rl.close();
  }
};

// Start the process
checkEnvFile(); 