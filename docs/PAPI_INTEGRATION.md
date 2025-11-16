# PAPI Integration Documentation

## Overview

This document explains the complete migration from Polkadot JS API to PAPI (Polkadot API) as required for Milestone 1 delivery. The migration ensures the project uses the officially recommended API and follows Polkadot ecosystem best practices.

---

## Migration Summary

### What Changed

**Before Migration:**
- Frontend directly connected to blockchain using `@polkadot/api`
- Mixed usage of legacy Polkadot JS API and PAPI
- Direct wallet connections from frontend
- Large frontend bundle size

**After Migration:**
- Backend uses PAPI exclusively for all blockchain operations
- Frontend calls backend API endpoints (no direct blockchain access)
- Centralized blockchain logic in backend
- Smaller frontend bundle, better security

---

## Architecture

### New Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Components (Portfolio, Minting, VR)            │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  Frontend Services (blockchainService.ts)             │ │
│  │  - mintNFT()                                           │ │
│  │  - getNFTsByOwner()                                    │ │
│  │  - getTokenBalance()                                   │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└─────────────────────────┼─────────────────────────────────────┘
                          │ HTTP/REST API
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                        Backend Layer                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Express API Server (server.ts)                        │  │
│  │  - POST /mint                                          │  │
│  │  - GET /portfolio/:address                             │  │
│  │  - GET /nft/:collectionId/:itemId                      │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │  Polkadot Service (polkadotService.ts)                 │  │
│  │  - mintNft()                                           │  │
│  │  - getNFTsByOwner()                                    │  │
│  │  - getAccountBalance()                                 │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │  PAPI Layer                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │ PAPIClient   │  │ WalletAdapter│  │ChainQueries │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │  │
│  └──────────────────────┬─────────────────────────────────┘  │
└─────────────────────────┼─────────────────────────────────────┘
                          │ PAPI (polkadot-api)
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                    Blockchain Layer                           │
│              AssetHub Testnet / Polkadot                      │
└───────────────────────────────────────────────────────────────┘
```

---

## PAPI Implementation Details

### Backend Implementation

#### 1. PAPI Client (`backend/src/papi/papiClient.ts`)

**Purpose**: Manages WebSocket connections to Polkadot chains using PAPI.

**Key Features**:
- Connection management with auto-reconnection
- Singleton pattern for efficient resource usage
- Error handling and retry logic
- Support for multiple chains

**Example Usage**:
```typescript
import { getAssetHubClient } from './papi/papiClient';

const client = await getAssetHubClient();
const chainInfo = await client.getChainInfo();
```

#### 2. Wallet Adapter (`backend/src/papi/walletAdapter.ts`)

**Purpose**: Manages server account for signing transactions.

**Key Features**:
- Keyring management using `@polkadot/keyring`
- Address validation
- Server account initialization from environment variables

**Example Usage**:
```typescript
import { WalletAdapter } from './papi/walletAdapter';

const wallet = new WalletAdapter(papiClient);
await wallet.initialize();
const serverAccount = wallet.getServerAccount();
```

#### 3. Chain Queries (`backend/src/papi/chainQueries.ts`)

**Purpose**: Provides typed blockchain query methods using PAPI.

**Key Methods**:
- `getNFTItem(collectionId, itemId)` - Get NFT information
- `getCollection(collectionId)` - Get collection details
- `getNFTsByOwner(address)` - Get all NFTs owned by address
- `mintNFT(params)` - Mint new NFT using PAPI transaction builder
- `transferNFT(params)` - Transfer NFT ownership
- `setNFTMetadata(params)` - Set NFT metadata
- `getAccountBalance(address)` - Get account balance
- `getAccountNonce(address)` - Get account nonce

**Example Usage**:
```typescript
import { ChainQueries } from './papi/chainQueries';

const queries = new ChainQueries(papiClient);

// Mint NFT
const result = await queries.mintNFT({
  collectionId: 1,
  itemId: 42,
  owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  metadata: 'ipfs://...',
  signer: serverAccount
});

// Query NFT
const nft = await queries.getNFTItem(1, 42);
```

#### 4. Polkadot Service (`backend/src/polkadotService.ts`)

**Purpose**: High-level service layer that coordinates PAPI components.

**Key Functions**:
- `initializeApi()` - Initialize PAPI client and services
- `mintNft(ownerAddress, metadata)` - Mint NFT with automatic item ID generation
- `getNFTInfo(collectionId, itemId)` - Get NFT details
- `getNFTsByOwner(address)` - Get user's NFT portfolio
- `getAccountBalance(address)` - Get account balance
- `transferNFT(from, to, collectionId, itemId)` - Transfer NFT

**Example Usage**:
```typescript
import * as polkadotService from './polkadotService';

// Initialize
await polkadotService.initializeApi();

// Mint NFT
const result = await polkadotService.mintNft(
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  { name: 'My NFT', description: '...' }
);

console.log(`Minted NFT ${result.itemId} in collection ${result.collectionId}`);
console.log(`Transaction hash: ${result.txHash}`);
```

### Frontend Implementation

#### 1. Blockchain Service (`src/services/blockchainService.ts`)

**Purpose**: Frontend API layer that calls backend endpoints.

**Key Functions**:
- `mintNFT(params)` - Mint NFT via backend API
- `getNFTsByOwner(address)` - Get NFTs via backend API
- `getNFTInfo(collectionId, itemId)` - Get NFT info via backend API
- `getTokenBalance(chainId, address)` - Get balance via backend API
- `connectToPAPI(address, chainType)` - Connect to PAPI services
- Utility functions: `formatAddress()`, `formatBalance()`, `getExplorerUrl()`

**Example Usage**:
```typescript
import { mintNFT, getNFTsByOwner } from '@/services/blockchainService';

// Mint NFT
const result = await mintNFT({
  ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  metadata: { name: 'My 3D Model', ... },
  chainId: 'assethub'
});

// Get user's NFTs
const nfts = await getNFTsByOwner('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
```

---

## API Endpoints

### Backend REST API

#### POST /mint
Mint a new NFT.

**Request**:
```json
{
  "ownerAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "metadata": {
    "name": "My 3D Model",
    "description": "A beautiful 3D creation",
    "image": "ipfs://...",
    "properties": { ... }
  },
  "chainId": "assethub"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "collectionId": 1,
    "itemId": 42,
    "metadata": { ... }
  },
  "timestamp": 1700000000000
}
```

#### GET /portfolio/:address
Get all NFTs owned by an address.

**Response**:
```json
{
  "success": true,
  "data": {
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "nfts": [
      {
        "collectionId": 1,
        "itemId": 42,
        "owner": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        "metadata": { ... }
      }
    ],
    "totalValue": 0,
    "createdCount": 1,
    "lastUpdated": 1700000000000
  },
  "timestamp": 1700000000000
}
```

#### GET /nft/:collectionId/:itemId
Get specific NFT information.

**Response**:
```json
{
  "collectionId": 1,
  "itemId": 42,
  "owner": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "metadata": { ... }
}
```

---

## Environment Variables

### Backend (.env)

```bash
# AssetHub/Statemint RPC Endpoint
ASSETHUB_ENDPOINT_URL=wss://westmint-rpc.polkadot.io
# or
STATEMINT_ENDPOINT_URL=wss://westmint-rpc.polkadot.io

# NFT Collection ID
NFT_COLLECTION_ID=1

# Server Account Seed (for signing transactions)
SERVER_ACCOUNT_SEED=//Alice

# Server Port
PORT=3001
```

### Frontend (.env)

```bash
# Backend API URL
VITE_API_URL=http://localhost:3001
```

---

## Testing

### Running Tests

```bash
# Frontend tests
npm run test

# Backend tests
cd backend
npm run test
```

### Test Coverage

- ✅ Backend PAPI integration tests
- ✅ Frontend service layer tests
- ✅ Component tests with mocked backend API
- ✅ End-to-end minting workflow tests

---

## Migration Checklist

### Completed ✅

- [x] Backend uses PAPI exclusively
- [x] Frontend calls backend API (no direct blockchain access)
- [x] Removed `@polkadot/api` from backend dependencies
- [x] Removed `@polkadot/api`, `@polkadot/api-contract`, `@polkadot/extension-dapp` from frontend
- [x] Updated test mocks to use backend API mocks
- [x] All blockchain operations use PAPI
- [x] Comprehensive error handling
- [x] Connection retry logic
- [x] Caching for performance

### Verification

```bash
# Verify no legacy imports in production code
grep -r "@polkadot/api" src/ backend/src/ --include="*.ts" --include="*.tsx" --exclude-dir=node_modules

# Should return: No matches (except in test files)
```

---

## Benefits of PAPI Migration

### 1. **Type Safety**
- Full TypeScript support with generated types
- Compile-time error detection
- Better IDE autocomplete

### 2. **Performance**
- Optimized RPC calls
- Built-in caching
- Smaller bundle size

### 3. **Modern Architecture**
- Promise-based API
- Better error handling
- Cleaner code structure

### 4. **Security**
- No private keys in frontend
- Centralized transaction signing
- Rate limiting and protection

### 5. **Maintainability**
- Officially recommended by Polkadot team
- Active development and support
- Future-proof implementation

---

## Troubleshooting

### Common Issues

#### 1. Connection Errors

**Problem**: Cannot connect to AssetHub  
**Solution**: Check `ASSETHUB_ENDPOINT_URL` in `.env` file

```bash
# Test connection
curl -X POST https://westmint-rpc.polkadot.io \
  -H "Content-Type: application/json" \
  -d '{"id":1,"jsonrpc":"2.0","method":"system_health"}'
```

#### 2. Minting Fails

**Problem**: Minting transaction fails  
**Solution**: 
- Verify `SERVER_ACCOUNT_SEED` is set correctly
- Ensure server account has sufficient balance
- Check `NFT_COLLECTION_ID` exists on chain

#### 3. Build Errors

**Problem**: TypeScript compilation errors  
**Solution**:
```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Code Examples

### Complete Minting Workflow

```typescript
// Backend: polkadotService.ts
export async function mintNft(ownerAddress: string, metadata: any) {
  await initializeApi();
  
  const wallet = getWalletAdapter();
  const queries = getChainQueries();
  const serverAccount = wallet.getServerAccount();
  
  const collectionId = parseInt(process.env.NFT_COLLECTION_ID || '1');
  const itemId = await queries.getNextAvailableItemId(collectionId);
  
  const result = await queries.mintNFT({
    collectionId,
    itemId,
    owner: ownerAddress,
    metadata: JSON.stringify(metadata),
    signer: serverAccount
  });
  
  return { txHash: result.txHash, collectionId, itemId: result.itemId };
}

// Frontend: blockchainService.ts
export async function mintNFT(params) {
  const response = await fetch(`${API_BASE_URL}/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerAddress: params.ownerAddress,
      metadata: params.metadata,
      chainId: params.chainId || 'assethub',
    }),
  });
  
  const result = await response.json();
  return {
    transactionHash: result.data.transactionHash,
    tokenId: result.data.itemId?.toString(),
    chainId: params.chainId || 'assethub',
  };
}
```

---

## References

- [Polkadot API (PAPI) Documentation](https://papi.how/)
- [Polkadot JS API (Legacy) Documentation](https://polkadot.js.org/docs/)
- [AssetHub Documentation](https://wiki.polkadot.network/docs/learn-assets)
- [NFTs Pallet Documentation](https://paritytech.github.io/substrate/master/pallet_nfts/index.html)

---

**Last Updated**: November 16, 2024  
**Version**: 1.0.0  
**Status**: ✅ Complete
