# IPFS Implementation Summary for MediChain

This document provides a technical overview of how IPFS is implemented in the MediChain application.

## Architecture

MediChain uses a hybrid architecture for medical record storage:

1. **Blockchain**: Stores record metadata, access control, and IPFS Content Identifiers (CIDs)
2. **IPFS**: Stores the actual medical record data (encrypted)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│   Patient   │◄────────►  MediChain  │◄────────►  Provider   │
│             │         │             │         │             │
└─────────────┘         └──────┬──────┘         └─────────────┘
                               │
                        ┌──────┴──────┐
                        │             │
                        │ Blockchain  │
                        │             │
                        └──────┬──────┘
                               │
                               │ CIDs
                               │
                        ┌──────┴──────┐
                        │             │
                        │    IPFS     │
                        │             │
                        └─────────────┘
```

## Implementation Details

### IPFS Service Providers

MediChain supports two IPFS service providers:

1. **Pinata**: The recommended provider with a user-friendly API and reliable pinning service
2. **Infura**: An alternative provider with good integration with Ethereum infrastructure

The application can be configured to use either provider through environment variables.

### Data Flow

#### Uploading Medical Records

1. Medical record data is prepared client-side
2. (Optional) Data is encrypted using AES-GCM encryption
3. Data is uploaded to IPFS using the configured provider (Pinata or Infura)
4. The resulting CID is stored on the blockchain via the MedicalRegistry smart contract
5. The contract emits events that can be monitored by the frontend

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│  Raw Data   │────►│  Encryption │────►│ IPFS Upload │────►│    CID      │
│             │     │ (Optional)  │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                                                            ┌──────┴──────┐
                                                            │             │
                                                            │ Blockchain  │
                                                            │  Storage    │
                                                            │             │
                                                            └─────────────┘
```

#### Retrieving Medical Records

1. The application queries the blockchain for record CIDs
2. The CID is used to fetch the encrypted data from IPFS
3. (If encrypted) Data is decrypted client-side
4. The record is displayed to the authorized user

### Key Components

#### 1. IPFS Client Configuration (`src/lib/ipfs.ts`)

The application provides a unified interface for IPFS operations that abstracts away the differences between Pinata and Infura:

- `uploadToIPFS()`: Uploads data to IPFS and returns a CID
- `fetchFromIPFS()`: Retrieves data from IPFS using a CID
- `encryptData()` / `decryptData()`: Utilities for client-side encryption

#### 2. Environment Configuration (`src/config.ts`)

The IPFS configuration is centralized in the config file:

```typescript
export const IPFS_CONFIG = {
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  
  infura: {
    projectId: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || '',
    projectSecret: process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET || '',
  },
  
  pinata: {
    apiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY || '',
    secretApiKey: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || '',
  },
  
  defaultService: 'pinata',
};
```

#### 3. Testing Component (`src/components/IPFSTest.tsx`)

A dedicated component for testing IPFS functionality:

- Upload files to IPFS
- Upload text data to IPFS
- Fetch data from IPFS using a CID

## Security Considerations

1. **Client-Side Encryption**: Sensitive medical data should be encrypted before uploading to IPFS
2. **API Key Security**: The current implementation exposes API keys to the client. In production, consider using a backend service for IPFS operations
3. **Access Control**: The blockchain handles access control, but the IPFS CIDs themselves are public. Always encrypt sensitive data

## Future Improvements

1. **Server-Side IPFS Integration**: Move IPFS operations to a backend service to protect API keys
2. **Improved Error Handling**: Add more robust error handling and retry mechanisms
3. **Upload Progress Tracking**: Implement progress tracking for large file uploads
4. **Pinning Management**: Add functionality to manage pinned content (unpin, repin, etc.)
5. **Dedicated IPFS Node**: Consider running a dedicated IPFS node for production deployments 