# VR Genesis Frame

A cross-chain 3D VR platform that integrates NFT functionality across multiple blockchain networks (Polkadot, Kusama, and EVM chains).

## Features

- 3D Virtual Reality environment built with React Three Fiber and Three.js
- Cross-chain NFT Gallery with support for multiple blockchain networks
- Import NFTs into the 3D scene as interactive objects
- Avatar customization with Ready Player Me integration
- Virtual land plot system with ownership tracked on blockchain
- XCM integration for cross-chain NFT transfers
- Interactive object placement and manipulation

## Supported Blockchain Networks

- Polkadot & Kusama ecosystem (via Substrate)
  - Asset Hub (formerly Statemint/Statemine)
  - Unique Network
- EVM-compatible chains
  - Moonbeam
  - Astar
  - Ethereum (via bridges)

## Architecture

The application consists of:
1. React.js frontend with Three.js for 3D rendering
2. Smart Contracts in ink! (Substrate) and Solidity (EVM)
3. IPFS integration for decentralized storage of 3D models and metadata
4. Blockchain integration via Polkadot.js API and ethers.js

## Getting Started

### Prerequisites
- Node.js (v16+)
- Rust and Cargo (for ink! contract development)
- Substrate Contract Node (for local testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vr-genesis-frame.git
cd vr-genesis-frame

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Smart Contract Development

```bash
# Build the Substrate contracts
cd contracts/substrate/AssetHubNFT_new
cargo contract build
```

## License

MIT License
