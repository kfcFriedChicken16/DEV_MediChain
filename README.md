# 🏥 MediDrop - Blockchain Medical Records Platform

**Your Health Data, Your Control, Your Life Saved**

MediDrop is a revolutionary blockchain-based medical records management system that puts patients in complete control of their health data while enabling secure, instant access for healthcare providers and emergency responders.

## 🚀 Live Demo

**Try the live application:** [Coming Soon]

*Note: You'll need MetaMask and some test ETH to interact with the blockchain features.*

## ✨ Key Features

### 👤 **Patient Features**
- 🔐 **Secure Storage**: Medical records encrypted and stored on IPFS
- 🎯 **Complete Control**: Full ownership and control over data sharing
- 🚨 **Emergency Access**: Configure emergency contact information and access permissions
- 📝 **Human-Readable Records**: Custom titles and types for easy identification
- 🔄 **Access Management**: Approve or deny provider access requests

### 👨‍⚕️ **Provider Features**
- 📋 **Record Management**: Add new medical records with custom titles
- 🔍 **Patient Access**: Request and view patient records with time-limited permissions
- 📊 **Dashboard**: Comprehensive view of all patient records and access status
- ⏰ **Time-Limited Access**: Automatic expiration of access permissions

### 🚨 **Emergency Access Features**
- ⚡ **Sub-1-Second Access**: Critical medical information available instantly
- 🆔 **Secure QR Codes**: Emergency data accessible without private keys
- 🏥 **First Responder Ready**: Designed for emergency room scenarios
- 🔒 **Zero-Knowledge Proofs**: Privacy-preserving emergency access

### 🤖 **AI Health Assistant**
- 📊 **Medical Record Analysis**: AI-powered insights from your health data
- 💬 **Health Chat**: Natural language queries about your medical information
- 📈 **Risk Assessment**: Identify potential health concerns
- 💡 **Personalized Recommendations**: Lifestyle suggestions based on your data

### 🌐 **Global Accessibility**
- 🗣️ **Multi-Language Support**: Automatic translation to 20+ languages
- 🌍 **Worldwide Access**: Web-based platform accessible globally
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

### 🛡️ **Security Features**
- 🔒 **End-to-End Encryption**: AES-256-GCM encryption for all medical data
- ⛓️ **Blockchain Access Control**: Smart contract-based permission management
- 🔑 **Patient-Controlled Sharing**: Patients decide what, when, and with whom to share
- 🔄 **Re-encryption**: Secure data sharing through provider-specific encryption
- 📋 **Audit Trail**: Complete logging of all access attempts

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **MetaMask** - Ethereum wallet integration

### Blockchain
- **Hardhat** - Ethereum development environment
- **Solidity** - Smart contract development
- **Ethereum** - Blockchain network (supports local, Sepolia, and mainnet)

### Storage & Security
- **IPFS** - Decentralized file storage
- **Pinata** - IPFS pinning service
- **AES-256-GCM** - Military-grade encryption
- **Web Crypto API** - Secure key management

### AI & Analytics
- **OpenRouter API** - AI health assistant powered by advanced language models
- **Natural Language Processing** - Health query understanding
- **Medical Data Analysis** - Pattern recognition and insights

## 📋 Prerequisites

- **Node.js** (v16 or later)
- **npm** or **yarn**
- **MetaMask** browser extension
- **Hardhat** for local blockchain development
- **IPFS account** (Pinata or Infura)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/kfcFriedChicken16/DEV_MediChain.git
cd DEV_MediChain
```

### 2. Install Dependencies

#### Frontend Setup
```bash
cd medichain
npm install
```

#### Backend Setup
```bash
cd ../medi-chain-backend
npm install
```

### 3. Environment Setup
```bash
# In medichain folder
cp .env.example .env.local

# Edit .env.local with your credentials
```

### 4. Configure Environment Variables
```env
# Contract Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address

# IPFS Configuration
NEXT_PUBLIC_IPFS_SERVICE=pinata
NEXT_PUBLIC_IPFS_GATEWAY=https://dweb.link/ipfs/

# Pinata API Keys (get from https://pinata.cloud/)
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_pinata_secret_key

# AI Assistant Configuration
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key

# Feature Flags
NEXT_PUBLIC_FEATURE_EMERGENCY_ACCESS=true
NEXT_PUBLIC_FEATURE_ENCRYPTION=true
```

### 5. Smart Contract Deployment
```bash
# In medi-chain-backend folder
npx hardhat node

# In new terminal
npx hardhat run scripts/deploy-medical-registry.ts --network localhost
```

### 6. Start Development Server
```bash
# In medichain folder
npm run dev
```

### 7. Open Your Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure
