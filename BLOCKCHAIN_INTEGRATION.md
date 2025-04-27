# Blockchain Integration for VR Genesis Frame

This document provides instructions for setting up and configuring the blockchain integration for VR Genesis Frame.

## Required API Keys and Configurations

To use the blockchain features, you'll need to create a `.env.local` file in the root directory with the following variables:

```
# VR Genesis Frame - Environment Variables

# NFT.Storage API Key - Get one at https://nft.storage/
VITE_NFT_STORAGE_API_KEY="your_nft_storage_api_key"

# IPFS Gateway (optional - defaults to ipfs.io)
VITE_IPFS_GATEWAY="https://ipfs.io/ipfs/"

# Pinata IPFS (alternative to NFT.Storage)
VITE_PINATA_API_KEY="your_pinata_api_key"
VITE_PINATA_SECRET_KEY="your_pinata_secret_key"

# --- BLOCKCHAIN CONFIGURATION ---

# -- Unique Network --
# Production
VITE_UNIQUE_NETWORK_RPC_URL="wss://quartz.unique.network"
VITE_UNIQUE_EXPLORER_URL="https://uniquescan.io/quartz/"
VITE_UNIQUE_NFT_CONTRACT="your_unique_contract_address"

# Testnet
VITE_UNIQUE_TESTNET_RPC_URL="wss://opal.unique.network"
VITE_UNIQUE_TESTNET_EXPLORER_URL="https://uniquescan.io/opal/"
VITE_UNIQUE_TESTNET_NFT_CONTRACT="your_unique_testnet_contract_address"

# -- Moonbeam --
# Production
VITE_MOONBEAM_RPC_URL="https://rpc.api.moonbeam.network"
VITE_MOONBEAM_EXPLORER_URL="https://moonbeam.moonscan.io/"
VITE_MOONBEAM_NFT_CONTRACT="your_moonbeam_contract_address"

# Testnet (Moonbase Alpha)
VITE_MOONBASE_RPC_URL="https://rpc.api.moonbase.moonbeam.network"
VITE_MOONBASE_EXPLORER_URL="https://moonbase.moonscan.io/"
VITE_MOONBASE_NFT_CONTRACT="your_moonbase_contract_address"

# -- Astar Network --
# Production
VITE_ASTAR_RPC_URL="https://astar.api.onfinality.io/public"
VITE_ASTAR_EXPLORER_URL="https://astar.subscan.io/"
VITE_ASTAR_NFT_CONTRACT="your_astar_contract_address"

# Testnet (Shibuya)
VITE_SHIBUYA_RPC_URL="https://shibuya.public.blastapi.io"
VITE_SHIBUYA_EXPLORER_URL="https://shibuya.subscan.io/"
VITE_SHIBUYA_NFT_CONTRACT="your_shibuya_contract_address"

# Feature flags
VITE_ENABLE_TESTNET_CHAINS="true"
VITE_DEFAULT_CHAIN="uniqueTest" # Use 'unique', 'moonbeam', 'astar', or their testnet versions
```

## Required API Keys

1. **NFT.Storage API Key**:
   - Sign up at [https://nft.storage/](https://nft.storage/)
   - Create a new API key
   - Add it to your `.env.local` file

2. **Pinata API Key (optional alternative to NFT.Storage)**:
   - Sign up at [https://pinata.cloud/](https://pinata.cloud/)
   - Create new API keys
   - Add them to your `.env.local` file

## Smart Contract Deployment

For each supported blockchain, you'll need to deploy an NFT contract. Below are instructions for each chain:

### Unique Network (Substrate-based)

1. Deploy a RMRK or Unique NFT contract on Quartz (production) or Opal (testnet)
2. Add the contract address to your `.env.local` file

### Moonbeam (EVM-compatible)

1. Deploy an ERC-721 contract on Moonbeam (production) or Moonbase Alpha (testnet)
2. A sample contract is provided below
3. Add the contract address to your `.env.local` file

### Astar Network (EVM-compatible)

1. Deploy an ERC-721 contract on Astar (production) or Shibuya (testnet)
2. Use the same contract as for Moonbeam
3. Add the contract address to your `.env.local` file

## Sample ERC-721 Contract (for Moonbeam & Astar)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VRGenesisNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Events for front-end tracking
    event NFTMinted(address indexed owner, uint256 tokenId, string tokenURI);
    
    constructor() ERC721("VR Genesis 3D Objects", "VRGO") {}
    
    function mintToken(address owner, string memory metadataURI) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(owner, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        
        emit NFTMinted(owner, newTokenId, metadataURI);
        
        return newTokenId;
    }
}
```

## Testing Your Integration

1. Create testnet accounts on each blockchain
   - Unique Network (Opal): Use the [Unique Network Faucet](https://uniquescan.io/opal/faucet)
   - Moonbeam (Moonbase Alpha): Use the [Moonbase Faucet](https://docs.moonbeam.network/builders/get-started/networks/moonbase/#get-tokens)
   - Astar (Shibuya): Use the [Astar Faucet](https://portal.astar.network/#/astar/assets)

2. Install and set up a wallet
   - For Substrate chains: [Polkadot.js Extension](https://polkadot.js.org/extension/)
   - For EVM chains: [MetaMask](https://metamask.io/)

3. Test the full flow:
   - Connect wallet
   - Create 3D objects
   - Mint NFT
   - View in NFT gallery
   - Import back to scene

## Troubleshooting

### Common Issues

1. **Wallet connection failures**:
   - Ensure you have the appropriate browser extensions installed
   - Check that your browser allows the extensions to interact with the page

2. **Transaction failures**:
   - Check that you have sufficient funds for gas/fees
   - Verify that the contract addresses are correct
   - Check browser console for specific error messages

3. **IPFS upload issues**:
   - Verify your NFT.Storage API key is valid
   - Check if there are size limitations for the files you're uploading

4. **NFTs not appearing in gallery**:
   - Wait for blockchain confirmation (may take a few minutes)
   - Check that you're looking at the correct chain in the filter
   - Verify your wallet is connected properly 