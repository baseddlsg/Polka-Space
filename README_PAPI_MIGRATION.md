# Polka-Space: PAPI Migration Complete ✅

## Overview

Polka-Space has successfully migrated from Polkadot JS API to PAPI (Polkadot API) as recommended by the Polkadot team. This document provides setup instructions and explains the new architecture.

---

## 🎯 What Changed

### Before Migration
- Frontend directly connected to blockchain using deprecated `@polkadot/api`
- Mixed usage of legacy and modern APIs
- Security concerns with private keys in frontend

### After Migration
- ✅ Backend uses PAPI exclusively for all blockchain operations
- ✅ Frontend calls secure backend API endpoints
- ✅ Zero legacy `@polkadot/api` imports in production code
- ✅ Better security, performance, and maintainability

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Access to AssetHub testnet (Westmint)
- Server account with sufficient balance for minting

### Installation

```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Environment Setup

#### Backend Environment (.env in backend/)

Create `backend/.env` file:

```bash
# AssetHub/Westmint RPC Endpoint
ASSETHUB_ENDPOINT_URL=wss://westmint-rpc.polkadot.io

# NFT Collection ID (must exist on chain)
NFT_COLLECTION_ID=1

# Server Account Seed (for signing transactions)
# For testing, use //Alice. For production, use a secure seed.
SERVER_ACCOUNT_SEED=//Alice

# Server Port
PORT=3001

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
```

#### Frontend Environment (.env in root)

Create `.env` file:

```bash
# Backend API URL
VITE_API_URL=http://localhost:3001

# IPFS Configuration (if using IPFS)
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

### Running the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## 📚 Architecture

### System Overview

```
Frontend (React + Three.js)
    ↓ HTTP/REST
Backend API (Express)
    ↓ PAPI
AssetHub Testnet
```

### Key Components

#### Backend (`backend/src/`)

1. **PAPI Client** (`papi/papiClient.ts`)
   - Manages WebSocket connections to Polkadot chains
   - Auto-reconnection and error handling
   - Singleton pattern for efficiency

2. **Wallet Adapter** (`papi/walletAdapter.ts`)
   - Server account management
   - Transaction signing
   - Address validation

3. **Chain Queries** (`papi/chainQueries.ts`)
   - NFT minting, transfer, metadata operations
   - Account balance and nonce queries
   - Typed blockchain queries using PAPI

4. **Polkadot Service** (`polkadotService.ts`)
   - High-level service layer
   - Coordinates PAPI components
   - Business logic for NFT operations

#### Frontend (`src/`)

1. **Blockchain Service** (`services/blockchainService.ts`)
   - Calls backend API endpoints
   - No direct blockchain access
   - Utility functions for formatting

2. **Minting Service** (`services/mintingService.ts`)
   - NFT minting workflow
   - IPFS integration for metadata
   - 3D model handling

---

## 🔌 API Endpoints

### POST /mint
Mint a new NFT.

**Request:**
```json
{
  "ownerAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "metadata": {
    "name": "My 3D Model",
    "description": "Created in Polka-Space",
    "image": "ipfs://...",
    "properties": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "collectionId": 1,
    "itemId": 42,
    "metadata": { ... }
  }
}
```

### GET /portfolio/:address
Get all NFTs owned by an address.

**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "nfts": [...],
    "totalValue": 0,
    "createdCount": 5
  }
}
```

### GET /nft/:collectionId/:itemId
Get specific NFT information.

---

## 🧪 Testing

### Run Tests

```bash
# Frontend tests
npm run test

# Backend tests
cd backend
npm run test

# Run all tests
npm run test:all
```

### Test Coverage

- ✅ PAPI integration tests
- ✅ Backend API endpoint tests
- ✅ Frontend service layer tests
- ✅ Component tests with mocked APIs
- ✅ End-to-end minting workflow tests

---

## 🔧 Development

### Project Structure

```
polka-space/
├── backend/
│   ├── src/
│   │   ├── papi/              # PAPI integration layer
│   │   │   ├── papiClient.ts
│   │   │   ├── walletAdapter.ts
│   │   │   ├── chainQueries.ts
│   │   │   └── papiService.ts
│   │   ├── services/          # Business logic
│   │   ├── polkadotService.ts # Main service
│   │   └── server.ts          # Express server
│   └── package.json
├── src/
│   ├── services/              # Frontend services
│   │   ├── blockchainService.ts
│   │   ├── mintingService.ts
│   │   └── xcmService.ts
│   ├── components/            # React components
│   └── ...
├── docs/
│   └── PAPI_INTEGRATION.md    # Detailed documentation
└── package.json
```

### Adding New Blockchain Operations

1. Add method to `backend/src/papi/chainQueries.ts`
2. Expose via `backend/src/polkadotService.ts`
3. Create API endpoint in `backend/src/server.ts`
4. Call from frontend via `src/services/blockchainService.ts`

---

## 📖 Documentation

- **[PAPI Integration Guide](docs/PAPI_INTEGRATION.md)** - Complete technical documentation
- **[Migration Checklist](.kiro/specs/nft-portfolio-integration/PAPI_MIGRATION_CHECKLIST.md)** - Migration tracking
- **[Migration Progress](.kiro/specs/nft-portfolio-integration/MIGRATION_PROGRESS.md)** - Status report

---

## 🐛 Troubleshooting

### Backend won't start

**Problem**: `Error: ASSETHUB_ENDPOINT_URL is not defined`  
**Solution**: Create `backend/.env` file with required variables

### Minting fails

**Problem**: `Minting failed: Insufficient funds`  
**Solution**: Ensure server account (from `SERVER_ACCOUNT_SEED`) has sufficient balance

**Problem**: `Collection not found`  
**Solution**: Verify `NFT_COLLECTION_ID` exists on AssetHub testnet

### Frontend can't connect to backend

**Problem**: `Failed to fetch`  
**Solution**: 
1. Ensure backend is running on port 3001
2. Check `VITE_API_URL` in frontend `.env`
3. Verify CORS is enabled in backend

---

## 🔒 Security Notes

### Production Deployment

1. **Never commit `.env` files** - Use environment variables
2. **Secure SERVER_ACCOUNT_SEED** - Use secrets management
3. **Enable rate limiting** - Already implemented in backend
4. **Use HTTPS** - Configure reverse proxy (nginx/Apache)
5. **Validate all inputs** - Already implemented with validation middleware

### Environment Variables

- ✅ `.env.example` files provided
- ✅ `.env` files in `.gitignore`
- ✅ Sensitive data never committed

---

## 📦 Dependencies

### Backend

- `polkadot-api` - Modern Polkadot API (PAPI)
- `@polkadot/keyring` - Key management
- `@polkadot/util-crypto` - Cryptographic utilities
- `express` - Web server
- `ioredis` - Caching (optional)

### Frontend

- `@polkadot/util` - Address formatting utilities
- `@polkadot/util-crypto` - Cryptographic utilities
- `react` + `@react-three/fiber` - UI and 3D rendering

**Note**: Legacy `@polkadot/api`, `@polkadot/api-contract`, and `@polkadot/extension-dapp` have been removed.

---

## 🎓 Learning Resources

- [PAPI Documentation](https://papi.how/)
- [Polkadot Wiki](https://wiki.polkadot.network/)
- [AssetHub Documentation](https://wiki.polkadot.network/docs/learn-assets)
- [NFTs Pallet](https://paritytech.github.io/substrate/master/pallet_nfts/)

---

## 🤝 Contributing

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting

### Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Run `npm run test` and `npm run build`
4. Submit PR with description

---

## 📝 License

[Your License Here]

---

## 👥 Team

Polka-Space Team  
Contact: [Your Contact Info]

---

## 🎉 Milestone 1 Deliverables

✅ **PAPI Integration**: Complete migration from Polkadot JS API to PAPI  
✅ **ink! Smart Contracts**: Deployed on AssetHub testnet  
✅ **NFT Minting Service**: Complete backend service with PAPI  
✅ **Portfolio UI Components**: React components for portfolio management  
✅ **VR Integration**: WebXR-compatible VR scene with NFT gallery  
✅ **3D Metadata Handling**: Service for processing 3D model metadata  

**Status**: ✅ Ready for Review

---

**Last Updated**: November 16, 2024  
**Version**: 2.0.0 (Post-PAPI Migration)
