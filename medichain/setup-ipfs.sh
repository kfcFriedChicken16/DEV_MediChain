#!/bin/bash

# MediChain IPFS Setup Script

echo "=== MediChain IPFS Setup ==="
echo "This script will help you set up IPFS integration for MediChain."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Step 1: Set up environment variables
echo -e "\n=== Step 1: Setting up environment variables ==="
node src/scripts/setup-env.js

# Check if setup was successful
if [ ! -f .env.local ]; then
    echo "Error: Environment setup failed. Please run 'node src/scripts/setup-env.js' manually."
    exit 1
fi

# Step 2: Test IPFS integration
echo -e "\n=== Step 2: Testing IPFS integration ==="
echo "To test your IPFS configuration, start the development server with:"
echo "npm run dev"
echo ""
echo "Then visit http://localhost:3000/ipfs-test in your browser."

echo -e "\n=== Setup Complete ==="
echo "You can now start the development server with:"
echo "npm run dev" 