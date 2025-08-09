import { ethers } from "hardhat";

async function main() {
  console.log("=== TESTING REAL RECORD ENCRYPTION/DECRYPTION ===");
  
  const MEDICAL_REGISTRY_ADDRESS = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
  console.log(`Using contract at: ${MEDICAL_REGISTRY_ADDRESS}`);
  
  // Get signers
  const [patient, , , , , , , , , , provider] = await ethers.getSigners();
  
  console.log(`\nAccounts:`);
  console.log(`- Patient: ${patient.address}`);
  console.log(`- Provider: ${provider.address}`);
  
  // Connect to the contract
  const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
  const contract = MedicalRegistry.attach(MEDICAL_REGISTRY_ADDRESS);
  
  try {
    // Get all records for the patient
    const recordIds = await contract.connect(patient).getRecordIds(patient.address);
    console.log(`\nFound ${recordIds.length} records for patient`);
    
    for (let i = 0; i < recordIds.length; i++) {
      const recordId = recordIds[i];
      const record = await contract.connect(patient).getRecord(patient.address, recordId);
      
      console.log(`\nRecord ${i + 1}:`);
      console.log(`- ID: ${recordId}`);
      console.log(`- CID: ${record.cid}`);
      console.log(`- Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
      console.log(`- Provider: ${record.provider}`);
      console.log(`- Version: ${record.version}`);
      
      // Test if this CID can be accessed
      if (record.cid.startsWith('Qm') && record.cid.length > 40) {
        console.log(`- Real IPFS CID detected: ${record.cid}`);
        console.log(`- Gateway URL: https://gateway.pinata.cloud/ipfs/${record.cid}`);
        
        // Test accessibility
        try {
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${record.cid}`);
          if (response.ok) {
            const data = await response.text();
            console.log(`- IPFS accessible: ✅`);
            console.log(`- Data preview: ${data.substring(0, 100)}...`);
            
            // Try to parse as JSON
            try {
              const jsonData = JSON.parse(data);
              if (jsonData.content) {
                console.log(`- Content field found: ✅`);
                console.log(`- Encrypted data length: ${jsonData.content.length}`);
              } else {
                console.log(`- Content field missing: ❌`);
                console.log(`- Available fields: ${Object.keys(jsonData)}`);
              }
            } catch (e) {
              console.log(`- Not valid JSON: ${e}`);
            }
          } else {
            console.log(`- IPFS not accessible: ❌ (${response.status})`);
          }
        } catch (error) {
          console.log(`- IPFS fetch error: ❌ ${error}`);
        }
      } else {
        console.log(`- Demo/Invalid CID: ${record.cid}`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 