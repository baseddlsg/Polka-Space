# NFT Portfolio Contract

Enhanced smart contract for minting 3D artwork as NFTs with comprehensive metadata support on Polkadot AssetHub.

## Overview

The NFT Portfolio contract is designed specifically for the Polka-Space platform to enable artists to mint 3D artwork as NFTs with rich metadata support. It provides comprehensive validation, efficient storage, and portfolio management features.

## Features

### Core NFT Functionality
- ✅ ERC-721 compatible NFT minting and management
- ✅ Transfer and approval mechanisms
- ✅ Burn functionality for removing NFTs from circulation
- ✅ Batch operations for efficient portfolio queries

### 3D Metadata Support
- ✅ Comprehensive 3D model metadata (format, dimensions, materials)
- ✅ Support for multiple 3D formats (GLB, GLTF, OBJ, FBX, USDZ, Three.js)
- ✅ Material property definitions with JSON flexibility
- ✅ IPFS integration for decentralized storage

### Validation & Security
- ✅ Robust metadata validation before minting
- ✅ Size limits and format validation
- ✅ JSON structure validation for attributes
- ✅ Error handling with detailed error types

### Portfolio Features
- ✅ Creator registry for community discovery
- ✅ Public NFT listing for marketplace integration
- ✅ Efficient token ownership tracking
- ✅ Compact metadata storage for performance

## Contract Structure

```
contracts/substrate/nft-portfolio/
├── lib.rs                    # Main contract implementation
├── metadata.rs              # Metadata validation and storage utilities
├── Cargo.toml               # Project configuration
├── deploy.sh                # Deployment script
├── test.sh                  # Comprehensive test suite
├── deployment-config.toml   # Deployment configuration
└── README.md               # This file
```

## Quick Start

### Prerequisites

1. Install Rust and Cargo
2. Install cargo-contract:
   ```bash
   cargo install cargo-contract --force
   ```

### Building the Contract

```bash
# Build the contract
cargo contract build --release

# Run tests
./test.sh

# Or run specific test categories
cargo test minting
cargo test validation
```

### Testing

The contract includes comprehensive tests covering:

- **Unit Tests**: Core functionality testing
- **Metadata Validation**: 3D model metadata validation
- **Minting Workflow**: Complete NFT minting process
- **Transfer & Approval**: Ownership management
- **Burn Functionality**: NFT removal from circulation
- **Batch Operations**: Efficient portfolio queries

Run the full test suite:
```bash
./test.sh
```

Generate coverage report:
```bash
./test.sh --coverage
```

### Deployment

#### Local Testing
```bash
# Start local substrate-contracts-node
substrate-contracts-node --dev --tmp

# Deploy to local testnet
./deploy.sh
# Choose option 1 for local deployment
```

#### AssetHub Testnet
```bash
./deploy.sh
# Choose option 2 for testnet deployment
# Follow the manual deployment instructions
```

## Contract API

### Constructor

```rust
pub fn new(name: String, symbol: String) -> Self
```

Creates a new NFT collection with the specified name and symbol.

### Core Functions

#### Minting
```rust
pub fn mint_token(
    &mut self,
    to: AccountId,
    name: String,
    description: String,
    model_url: String,
    model_format: ModelFormat,
    model_size: u32,
    dimensions: ModelDimensions,
    materials: Vec<MaterialProperty>,
    attributes: String,
    ipfs_hash: String,
) -> Result<u32>
```

Mints a new 3D NFT with comprehensive metadata validation.

#### Transfer
```rust
pub fn transfer_from(&mut self, from: AccountId, to: AccountId, token_id: u32) -> Result<()>
```

Transfers an NFT from one account to another.

#### Approval
```rust
pub fn approve(&mut self, to: AccountId, token_id: u32) -> Result<()>
pub fn set_approval_for_all(&mut self, operator: AccountId, approved: bool) -> Result<()>
```

Manages approval for NFT transfers.

### Query Functions

#### Metadata Queries
```rust
pub fn token_metadata(&self, token_id: u32) -> Result<NFTMetadata>
pub fn get_compact_metadata(&self, token_id: u32) -> Result<CompactMetadata>
pub fn get_compact_metadata_batch(&self, token_ids: Vec<u32>) -> Vec<Option<CompactMetadata>>
```

#### Portfolio Queries
```rust
pub fn tokens_of_owner(&self, owner: AccountId) -> Vec<u32>
pub fn get_creators(&self) -> Vec<AccountId>
pub fn get_public_nfts(&self, limit: Option<u32>) -> Vec<u32>
```

#### Validation
```rust
pub fn validate_mint_data(
    &self,
    name: String,
    description: String,
    model_url: String,
    model_format: ModelFormat,
    model_size: u32,
    dimensions: ModelDimensions,
    materials: Vec<MaterialProperty>,
    attributes: String,
    ipfs_hash: String,
) -> Result<bool>
```

Pre-validates metadata before minting.

## Data Structures

### ModelFormat
Supported 3D model formats:
- `GLB` - Binary glTF
- `GLTF` - Text-based glTF
- `OBJ` - Wavefront OBJ
- `FBX` - Autodesk FBX
- `USDZ` - Apple's Universal Scene Description
- `THREE_JS` - Three.js JSON format

### ModelDimensions
```rust
pub struct ModelDimensions {
    pub width: u32,   // in millimeters
    pub height: u32,  // in millimeters
    pub depth: u32,   // in millimeters
}
```

### MaterialProperty
```rust
pub struct MaterialProperty {
    pub name: String,
    pub material_type: MaterialType,
    pub properties_json: String,
}
```

### MaterialType
- `PBR` - Physically Based Rendering
- `Standard` - Standard material
- `Lambert` - Lambert material
- `Phong` - Phong material
- `Toon` - Toon/Cartoon material
- `Custom` - Custom shader material

## Validation Rules

### Name Validation
- Must not be empty
- Maximum 100 characters
- Alphanumeric characters and basic punctuation only

### Model URL Validation
- Must not be empty
- Maximum 200 characters
- Must start with `ipfs://`, `https://`, `http://`, or `ar://`

### Model Size Validation
- Must be greater than 0
- Maximum 100MB (100,000,000 bytes)

### Dimensions Validation
- All dimensions must be greater than 0
- Maximum 10 meters (10,000,000 mm) per dimension

### Materials Validation
- Maximum 10 materials per NFT
- Each material name: 1-50 characters
- Properties JSON: maximum 1000 characters
- JSON structure validation

### Attributes Validation
- Maximum 2048 characters
- Valid JSON structure if not empty

### IPFS Hash Validation
- Must not be empty
- Maximum 100 characters
- Must start with `Qm`, `ba`, or `ipfs://`

## Error Handling

The contract provides detailed error types:

- `TokenNotFound` - Token does not exist
- `NotAuthorized` - Caller not authorized for operation
- `InvalidMetadata` - General metadata validation error
- `MintingFailed` - Minting process failed
- `TransferFailed` - Transfer operation failed
- `ApprovalFailed` - Approval operation failed
- `ValidationError(ValidationError)` - Specific validation errors

## Events

### NFTMinted
Emitted when a new NFT is minted:
```rust
pub struct NFTMinted {
    pub owner: AccountId,
    pub token_id: u32,
    pub creator: AccountId,
    pub metadata_uri: String,
    pub name: String,
    pub model_type: String,
}
```

### Transfer
Emitted for all transfers (including minting and burning):
```rust
pub struct Transfer {
    pub from: Option<AccountId>,
    pub to: Option<AccountId>,
    pub token_id: u32,
}
```

### Approval
Emitted when approval is granted:
```rust
pub struct Approval {
    pub owner: AccountId,
    pub approved: AccountId,
    pub token_id: u32,
}
```

## Gas Optimization

The contract includes several optimizations:

1. **Compact Metadata Storage**: Separate compact metadata for efficient queries
2. **Batch Operations**: Retrieve multiple token metadata in single call
3. **Efficient Token Tracking**: Optimized owned tokens mapping
4. **Validation Caching**: Pre-validation to avoid failed transactions

## Security Considerations

1. **Input Validation**: Comprehensive validation of all inputs
2. **Access Control**: Proper authorization checks for all operations
3. **Overflow Protection**: Safe arithmetic operations
4. **Storage Limits**: Reasonable limits on data sizes
5. **Error Handling**: Graceful error handling without panics

## Integration with Polka-Space

This contract is designed to integrate with the Polka-Space platform:

1. **Frontend Integration**: Provides all necessary query functions for portfolio display
2. **IPFS Integration**: Supports IPFS for decentralized metadata storage
3. **Community Features**: Creator registry and public NFT discovery
4. **Validation API**: Pre-validation endpoints for better UX

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the test suite: `./test.sh`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the Polka-Space development team
- Join our community Discord

---

Built with ❤️ for the Polkadot ecosystem