# VR Genesis Frame

## ✨ Summary
VR Genesis Frame is a cross-chain 3D VR metaverse platform that enables NFT creation and integration across multiple blockchain networks with a focus on the Polkadot ecosystem. The platform leverages XCM for cross-chain compatibility, allowing users to mint, transfer, and interact with 3D NFT assets in immersive virtual environments.

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

## Problems Solved

VR Genesis Frame addresses several key challenges in the blockchain and VR space:

1. **Cross-Chain Interoperability**: Traditional NFTs are restricted to their native blockchains, limiting reach and utility. Our solution leverages Polkadot's XCM protocol to enable seamless NFT transfers across parachains.

2. **Costly NFT Creation**: High gas fees on many blockchains make NFT creation prohibitively expensive. By implementing our primary NFT contract on Polkadot's Asset Hub, we significantly reduce minting costs.

3. **Complex 3D Asset Ownership**: Traditional NFTs lack the specialized metadata needed for 3D assets. Our smart contract extends NFT functionality with properties specific to 3D rendering and VR interaction.

4. **Technical Barriers to VR/Blockchain Integration**: We bridge the gap between complex blockchain technologies and immersive VR experiences with an intuitive interface that abstracts away the underlying technical complexity.

## How Polkadot Was Used

Our project leverages Polkadot's unique architecture in several ways:

1. **Core NFT Contract on Asset Hub**: We deployed our primary NFT smart contract on Polkadot's Asset Hub (formerly Statemint), taking advantage of its specialized parachain designed for asset management.

2. **XCM Implementation**: We implemented Cross-Consensus Messaging (XCM) to enable NFT transfers between different parachains in the Polkadot ecosystem, creating a truly interconnected experience.

3. **Shared Security Model**: By building on Polkadot, our application benefits from the shared security model, ensuring our assets are protected by the full security of the relay chain.

4. **Multi-Parachain Integration**: Our platform connects with multiple parachains including Asset Hub, Moonbeam, and Astar, showcasing Polkadot's interoperability.

## Technical Description

### SDKs and Tools Used

- **Polkadot.js API**: For interacting with Substrate-based chains
- **ink!**: For developing Substrate-based smart contracts
- **React Three Fiber**: For 3D rendering in our web-based VR environment
- **XCM SDK**: For implementing cross-chain messaging
- **Substrate Chain Extension**: For custom runtime functionality
- **IPFS**: For decentralized storage of 3D models and metadata

### Polkadot-Specific Features

- **Asset Hub NFT Support**: Utilizing Asset Hub's specialized infrastructure for NFT creation and management
- **Cross-Consensus Messaging (XCM)**: Enabling seamless NFT transfers between parachains
- **Low-Fee Transactions**: Leveraging Polkadot's efficient fee structure for affordable NFT operations
- **Shared Security**: Benefiting from Polkadot's shared security model

## Smart Contract Implementation

Our VR Genesis Frame project integrates a custom NFT smart contract built with ink! and deployed on Polkadot Asset Hub. The smart contract is specifically designed to handle 3D assets in virtual reality environments.

### Core Functionality

The `AssetHubNFT` contract implements:

1. **NFT Minting**: Creates new tokens representing 3D objects with metadata including:
   - IPFS URI pointing to 3D model data
   - Model type classification (box, sphere, custom model, etc.)
   - Custom properties for rendering in VR
   - Creation timestamp and creator information

2. **Ownership Management**: Full NFT ownership tracking with standard transfer capabilities:
   - Mapping of token IDs to owner addresses
   - Functions to transfer tokens between addresses
   - Approval mechanism for delegated transfers

3. **Cross-Chain Compatibility**: Includes XCM (Cross-Consensus Messaging) integration allowing NFT assets to be transferred between different parachains in the Polkadot ecosystem:
   - `initiate_xcm_transfer`: Initiates cross-chain NFT movement
   - `receive_xcm_nft`: Handles incoming NFTs from other chains
   - XCM status tracking for transfer monitoring

4. **Metadata Storage**: Rich metadata that extends beyond standard NFTs to include 3D-specific properties:
   - Properties for 3D rendering
   - Origin chain tracking for cross-chain NFTs
   - Model type categorization

### Technical Design

The contract uses Substrate's ink! language for optimal integration with the Polkadot ecosystem. Key technical aspects include:

- **Storage Layout**: Efficient mapping structures for token ownership and metadata
- **Event Emission**: Robust event system for tracking NFT creation, transfers and XCM operations
- **Advanced Queries**: Methods to retrieve tokens by owner, detailed metadata, and cross-chain status

### Integration with VR Environment

When a user creates a 3D object in the VR environment:
1. The 3D model and properties are uploaded to IPFS
2. The `mint_token` function is called with metadata URI and properties
3. Upon successful minting, the token appears in the user's NFT gallery
4. Users can import their NFTs back into VR scenes as interactive objects

## Presentation Slides

Our project presentation is available on Canva: [VR Genesis Frame Presentation](https://www.canva.com/design/DAF-VDMmIi0/tVRsMBn63iOgxVV-EXqejg/view)

## Demo Materials

### Video Demo
✅ Demo video showing the VR environment and NFT functionality is available in the GitHub repository as `oiub.mp4`.

### Screenshots
✅ Screenshots of the VR environment, NFT gallery, and asset creation process are available in the GitHub repository as `1.png` through `6.png`.

### Project Explanation
✅ An explainer video detailing how our project works is included in the demo video.

## Deployed Smart Contract

**Deployment Status**: 
- [x] Contract deployed
- [x] Contract address added to this README

Our MinimalNFT contract has been successfully deployed to the Shibuya testnet on the Astar network:

```
Contract Address: 5G7WkE8BE1cFjMPmSFz7moHcxKCnsya5LpEDujvRSTtpPY5a
```

You can view the contract on the Shibuya explorer: [https://shibuya.subscan.io/account/5G7WkE8BE1cFjMPmSFz7moHcxKCnsya5LpEDujvRSTtpPY5a](https://shibuya.subscan.io/account/5G7WkE8BE1cFjMPmSFz7moHcxKCnsya5LpEDujvRSTtpPY5a)

### Alternative Minimal NFT Contract

We've created a simplified MinimalNFT contract that successfully builds with the latest ink! version 5.1.1:

```bash
# The contract is located at:
cd contracts/minimal_nft/minimal_nft

# Build the contract:
cargo contract build
```

This minimal version implements core NFT functionality:
- Token minting with custom URI
- Ownership management
- Token URI retrieval
- Transfer event emission

This minimal contract can be deployed in place of the full contract if you encounter build issues with the complete version.

### Deployment Instructions

To deploy the smart contract to Polkadot Asset Hub or alternative networks, follow these steps:

1. **Prepare your contract:**
   ```bash
   # For the full contract:
   cd contracts/substrate/asset_hub_nft_final
   
   # OR for the minimal version:
   cd contracts/minimal_nft/minimal_nft
   ```

2. **Build the contract:**
   ```bash
   # For the full contract (with compatible cargo-contract version):
   cargo install cargo-contract --version 3.2.0 --force
   cargo contract build
   
   # OR for the minimal version (with latest cargo-contract):
   cargo install cargo-contract --force
   cargo contract build
   ```

3. **Deploy to your chosen network:**

   **Option A: Polkadot Asset Hub (Production)**
   ```bash
   # Upload the contract (replace with your own seed/private key)
   cargo contract upload --suri "your-private-key" --url wss://polkadot-asset-hub-rpc.polkadot.io target/ink/asset_hub_nft_final.contract --execute
   
   # OR for minimal version:
   cargo contract upload --suri "your-private-key" --url wss://polkadot-asset-hub-rpc.polkadot.io target/ink/minimal_nft.contract --execute
   ```

   **Option B: Shibuya Testnet (Astar's Testnet)**
   ```bash
   # Upload the contract (replace with your own seed/private key)
   cargo contract upload --suri "your-private-key" --url wss://shibuya-rpc.dwellir.com target/ink/minimal_nft.contract --execute
   
   # Note: Before deploying to Shibuya, ensure your account has sufficient SBY tokens
   # Get testnet tokens from: https://portal.astar.network/shibuya-testnet/assets
   ```

4. **Instantiate the contract:**

   **Option A: Polkadot Asset Hub**
   ```bash
   # For the full contract:
   cargo contract instantiate --constructor new --args "VR Genesis NFT" "VRGNFT" --suri "your-private-key" --url wss://polkadot-asset-hub-rpc.polkadot.io CODE_HASH --execute
   
   # OR for the minimal version:
   cargo contract instantiate --constructor new --suri "your-private-key" --url wss://polkadot-asset-hub-rpc.polkadot.io CODE_HASH --execute
   ```

   **Option B: Shibuya Testnet**
   ```bash
   cargo contract instantiate --constructor new --suri "your-private-key" --url wss://shibuya-rpc.dwellir.com CODE_HASH --execute
   ```

5. **Update your application configuration:**
   After successful deployment, update your application's configuration with your actual contract address and network details.

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
# Build the full featured Substrate contracts
cd contracts/substrate/asset_hub_nft_final
cargo contract build

# OR build the minimal NFT contract
cd contracts/minimal_nft/minimal_nft
cargo contract build
```

The project includes two NFT contract implementations:

1. **Full-featured Asset Hub NFT Contract**: Includes advanced features like XCM integration, rich metadata for 3D assets, and cross-chain support. Located in `contracts/substrate/asset_hub_nft_final`.

2. **Minimal NFT Contract**: A simplified implementation with core NFT features (minting, ownership, URIs) built with the latest ink! 5.1.1. Located in `contracts/minimal_nft/minimal_nft`.

For the hackathon submission, either contract can be deployed to the Polkadot Asset Hub.

## License

MIT License
