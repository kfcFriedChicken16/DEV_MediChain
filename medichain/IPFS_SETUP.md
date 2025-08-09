# IPFS Setup for MediChain

This document provides instructions for setting up IPFS integration for the MediChain application.

## Overview

MediChain uses IPFS (InterPlanetary File System) to store medical records in a decentralized manner. The application supports two IPFS providers:

1. **Pinata** (recommended)
2. **Infura**

## Setting Up Pinata

Pinata is the recommended IPFS provider for MediChain.

### Step 1: Create a Pinata Account

1. Go to [Pinata](https://www.pinata.cloud/) and sign up for an account.
2. After signing up, navigate to the API Keys section.
3. Create a new API key with the following permissions:
   - pinFileToIPFS
   - pinJSONToIPFS
   - unpin

### Step 2: Configure Environment Variables

1. Create a `.env.local` file in the root of the `medichain` directory if it doesn't exist.
2. Add the following environment variables:

```
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_pinata_secret_api_key
```

## Setting Up Infura (Alternative)

If you prefer to use Infura instead of Pinata, follow these steps:

### Step 1: Create an Infura Account

1. Go to [Infura](https://infura.io/) and sign up for an account.
2. Create a new project and select "IPFS" as the network.
3. Once created, you'll get a Project ID and Project Secret.

### Step 2: Configure Environment Variables

1. Create a `.env.local` file in the root of the `medichain` directory if it doesn't exist.
2. Add the following environment variables:

```
NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_project_id
NEXT_PUBLIC_INFURA_PROJECT_SECRET=your_infura_project_secret
```

## Configuring the Default IPFS Service

By default, MediChain is configured to use Pinata. If you want to change this:

1. Open `src/config.ts`
2. Find the IPFS_CONFIG section
3. Change the `defaultService` value to either `'pinata'` or `'infura'`

## Testing Your IPFS Configuration

To test if your IPFS configuration is working:

1. Start the development server: `npm run dev`
2. Navigate to the IPFS Test page: `http://localhost:3000/ipfs-test`
3. Try uploading a file or text to IPFS
4. If successful, you'll receive an IPFS CID (Content Identifier)
5. You can then fetch the content using the CID

## Troubleshooting

If you encounter issues with IPFS integration:

1. **API Key Errors**: Verify that your API keys are correctly set in the `.env.local` file.
2. **CORS Issues**: If you're getting CORS errors, make sure your Pinata or Infura account has the correct permissions.
3. **File Size Limits**: Be aware that there are file size limits for both Pinata and Infura free tiers.
4. **Network Issues**: Ensure your application can reach the IPFS gateways and APIs.

## Security Considerations

- The API keys in `.env.local` are exposed to the client-side code. In a production environment, consider implementing a backend service to handle IPFS uploads.
- For sensitive medical data, ensure proper encryption is implemented before uploading to IPFS.