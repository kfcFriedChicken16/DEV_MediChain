import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

// Get the API key from .env or use a fallback for local development
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "";

// Set to false if you don't want to use forking
const ENABLE_FORKING = true; 

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: {
        url: MAINNET_RPC_URL,
        blockNumber: 18_000_000,  // Pin to a stable snapshot for better performance
        enabled: ENABLE_FORKING && MAINNET_RPC_URL !== ""
      },
      initialBaseFeePerGas: 0  // Set base fee to 0 for easier testing
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // You can add other networks here later
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;


