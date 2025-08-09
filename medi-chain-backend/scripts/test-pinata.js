const axios = require('axios');

async function testPinata() {
  console.log("=== TESTING PINATA API ===");
  
  const apiKey = '90b2a3aea0428d420f24';
  const secretApiKey = '088ee00ba2b1fd5c56d0a7f4daad0119f10514494ac26c218f39f2975b155a49';
  
  console.log(`API Key: ${apiKey}`);
  console.log(`Secret Key: ${secretApiKey.substring(0, 10)}...`);
  
  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
  
  const testData = {
    content: "Hello from MediChain test!",
    timestamp: new Date().toISOString()
  };
  
  try {
    console.log("\nTesting Pinata upload...");
    
    const response = await axios.post(url, testData, {
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretApiKey
      }
    });
    
    console.log("✅ Pinata upload successful!");
    console.log("Response:", response.data);
    
    const cid = response.data.IpfsHash;
    console.log(`Generated CID: ${cid}`);
    
    // Test fetching the data back
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    console.log(`\nTesting retrieval from: ${gatewayUrl}`);
    
    try {
      const fetchResponse = await axios.get(gatewayUrl);
      console.log("✅ Data retrieval successful!");
      console.log("Retrieved data:", fetchResponse.data);
    } catch (fetchError) {
      console.log("❌ Data retrieval failed:", fetchError.message);
    }
    
  } catch (error) {
    console.log("❌ Pinata upload failed!");
    console.log("Error:", error.response?.data || error.message);
  }
}

testPinata().catch(console.error); 