# PAPI Migration Checklist

## Overview
This document tracks the complete migration from Polkadot JS API to PAPI (Polkadot API) as required by the grant reviewer.

**Status**: 🔴 In Progress  
**Last Updated**: 2024-11-16

---

## Files Requiring Migration

### Backend Files (Priority: HIGH)

#### ✅ Already Migrated
- [x] `backend/src/papi/papiClient.ts` - PAPI client implementation
- [x] `backend/src/papi/walletAdapter.ts` - Wallet adapter using PAPI
- [x] `backend/src/papi/chainQueries.ts` - Chain queries with PAPI
- [x] `backend/src/papi/papiService.ts` - PAPI service layer
- [x] `backend/src/papi/config.ts` - PAPI configuration

#### 🔴 Needs Migration
- [ ] `backend/src/polkadotService.ts`
  - **Current**: Uses `ApiPromise`, `WsProvider`, `Keyring` from `@polkadot/api`
  - **Required**: Migrate to use PAPI client from `backend/src/papi/papiClient.ts`
  - **Functions to migrate**:
    - `initializeApi()` → Use `getAssetHubClient()` from PAPI
    - `mintNft()` → Use PAPI transaction builder
    - `getNextAvailableItemId()` → Use PAPI chain queries
  - **Impact**: HIGH - Core minting functionality

### Frontend Files (Priority: HIGH)

#### 🔴 Needs Migration
- [ ] `src/services/blockchainService.ts`
  - **Current**: Uses `ApiPromise`, `WsProvider`, `ContractPromise` from `@polkadot/api`
  - **Current**: Uses `web3FromSource` from `@polkadot/extension-dapp`
  - **Required**: Refactor to call backend PAPI endpoints instead of direct blockchain access
  - **Functions to migrate**:
    - `getPolkadotApi()` → Remove, use backend API
    - `getNFTContract()` → Remove, use backend API
    - `mintSubstrateNFT()` → Call backend `/api/mint` endpoint
    - `getTokenBalance()` → Call backend `/api/balance/:address` endpoint
  - **Impact**: HIGH - Core blockchain interaction layer

- [ ] `src/services/mintingService.ts`
  - **Current**: Uses `ContractPromise` from `@polkadot/api-contract`
  - **Required**: Update to use backend minting endpoints
  - **Functions to migrate**:
    - `mintNFT()` → Call backend PAPI service
    - `extractTokenIdFromSubstrateResult()` → Handle backend response format
  - **Impact**: HIGH - NFT minting workflow

- [ ] `src/services/xcmService.ts`
  - **Current**: Uses `ApiPromise`, `WsProvider` from `@polkadot/api`
  - **Required**: Refactor to use backend abstraction or remove if not needed
  - **Functions to migrate**:
    - `initParachainConnections()` → Use backend service
    - `executeXCMTransfer()` → Use backend service
  - **Impact**: MEDIUM - XCM functionality (currently simulated)

- [ ] `src/contexts/WalletContext.tsx`
  - **Current**: Uses `web3Accounts`, `web3Enable`, `web3FromSource` from `@polkadot/extension-dapp`
  - **Required**: Update to use PAPI-compatible wallet connection
  - **Impact**: HIGH - Wallet connection functionality

- [ ] `src/components/wallet/WalletConnect.tsx`
  - **Current**: Uses `web3Accounts`, `web3Enable` from `@polkadot/extension-dapp`
  - **Required**: Update to use PAPI-compatible wallet connection
  - **Impact**: HIGH - Wallet UI component

### Test Files (Priority: MEDIUM)

#### 🔴 Needs Update
- [ ] `src/test/setup.ts`
  - **Current**: Mocks `@polkadot/api` and `@polkadot/extension-dapp`
  - **Required**: Update mocks to use PAPI interfaces
  - **Impact**: MEDIUM - Test infrastructure

---

## Package Dependencies

### Backend Dependencies

#### ✅ Keep (PAPI)
- `polkadot-api`: ^1.20.0
- `@polkadot-api/descriptors`: ^0.0.1
- `@polkadot-api/signer`: ^0.2.10
- `@polkadot-api/substrate-client`: ^0.4.7
- `@polkadot-api/ws-provider`: ^0.7.0

#### ✅ Keep (Utilities)
- `@polkadot/keyring`: ^13.4.4 (for key management)
- `@polkadot/util-crypto`: ^13.4.4 (for crypto utilities)

#### 🔴 Remove After Migration
- `@polkadot/api`: ^15.9.2 (legacy API)

### Frontend Dependencies

#### 🔴 Remove After Migration
- `@polkadot/api`: ^10.13.1 (legacy API)
- `@polkadot/api-contract`: ^15.9.2 (legacy contract API)
- `@polkadot/extension-dapp`: ^0.58.8 (will use backend for wallet)

#### ✅ Keep (Utilities)
- `@polkadot/util`: ^13.4.4 (for address formatting, etc.)
- `@polkadot/util-crypto`: ^13.4.4 (for crypto utilities)

---

## Migration Strategy

### Phase 1: Backend Migration (Task 11.2)
1. Complete `backend/src/papi/chainQueries.ts` implementation
2. Migrate `backend/src/polkadotService.ts` to use PAPI
3. Add backend API endpoints for blockchain operations
4. Test backend PAPI integration

### Phase 2: Frontend Migration (Task 11.3)
1. Update `src/services/blockchainService.ts` to call backend APIs
2. Update `src/services/mintingService.ts` to use backend endpoints
3. Refactor wallet connection to use PAPI-compatible approach
4. Remove direct blockchain connections from frontend

### Phase 3: Cleanup (Task 11.5)
1. Remove `@polkadot/api` from backend package.json
2. Remove `@polkadot/api`, `@polkadot/api-contract`, `@polkadot/extension-dapp` from frontend
3. Update test mocks
4. Verify build and runtime

---

## API Endpoint Requirements

### New Backend Endpoints Needed

```typescript
// Minting
POST /api/nft/mint
Body: { ownerAddress, metadataUrl, collectionId? }
Response: { success, transactionHash, tokenId }

// Balance Query
GET /api/account/:address/balance
Response: { free, reserved, frozen }

// NFT Ownership Query
GET /api/account/:address/nfts
Response: [{ collectionId, itemId, metadata }]

// Chain Info
GET /api/chain/info
Response: { name, version, endpoint }

// Wallet Connection (if needed)
POST /api/wallet/connect
Body: { address, signature }
Response: { success, accountInfo }
```

---

## Testing Requirements

### Integration Tests Needed
- [ ] PAPI client connection test
- [ ] PAPI wallet adapter test
- [ ] NFT minting via PAPI test
- [ ] Chain queries via PAPI test
- [ ] Error handling and reconnection test

### End-to-End Tests Needed
- [ ] Complete minting workflow (frontend → backend → blockchain)
- [ ] Portfolio loading (frontend → backend → blockchain)
- [ ] Wallet connection flow

---

## Success Criteria

### Code Quality
- [ ] Zero `@polkadot/api` imports in production code
- [ ] Zero `@polkadot/api-contract` imports in production code
- [ ] Zero `@polkadot/extension-dapp` imports in production code (frontend)
- [ ] All blockchain operations use PAPI

### Build & Runtime
- [ ] `npm run build` succeeds without errors
- [ ] `npm run dev` runs without errors
- [ ] Backend starts and connects to AssetHub via PAPI
- [ ] Frontend connects to backend successfully

### Testing
- [ ] All existing tests pass
- [ ] New PAPI integration tests pass
- [ ] End-to-end minting workflow works

### Documentation
- [ ] PAPI integration documented
- [ ] Migration guide created
- [ ] Setup instructions updated
- [ ] API endpoints documented

---

## Notes

### PAPI vs Legacy API Comparison

**Legacy API (Polkadot JS)**:
```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';
const provider = new WsProvider(endpoint);
const api = await ApiPromise.create({ provider });
const item = await api.query.nfts.item(collectionId, itemId);
```

**PAPI (Polkadot API)**:
```typescript
import { createClient } from "polkadot-api";
import { getWsProvider } from "@polkadot-api/ws-provider";
const client = createClient(getWsProvider(endpoint));
const item = await client.query.Nfts.Item.getValue(collectionId, itemId);
```

### Key Differences
- PAPI uses typed descriptors (capital letters: `Nfts.Item`)
- PAPI has better TypeScript support
- PAPI has smaller bundle size
- PAPI is officially recommended by Polkadot team
- PAPI has built-in caching and optimization

---

## Progress Tracking

**Overall Progress**: 30% Complete

- ✅ PAPI infrastructure created (30%)
- 🔴 Backend migration (0%)
- 🔴 Frontend migration (0%)
- 🔴 Testing (0%)
- 🔴 Documentation (0%)
- 🔴 Cleanup (0%)

**Next Steps**: Start with Task 11.2 - Backend PAPI migration
