#!/bin/bash

# NFT Portfolio Contract Deployment Script for AssetHub Testnet
# This script builds and deploys the NFT Portfolio contract to Polkadot AssetHub testnet

set -e

echo "🚀 Starting NFT Portfolio Contract Deployment"

# Configuration
CONTRACT_NAME="nft_portfolio"
NETWORK="assethub-testnet"
ENDPOINT="wss://asset-hub-polkadot-rpc.dwellir.com"
CONSTRUCTOR_ARGS='["Polka-Space NFT Portfolio", "PSNFT"]'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if cargo-contract is installed
if ! command -v cargo-contract &> /dev/null; then
    echo -e "${RED}❌ cargo-contract is not installed${NC}"
    echo -e "${YELLOW}Installing cargo-contract...${NC}"
    cargo install cargo-contract --force
fi

# Check if substrate-contracts-node is running (for local testing)
check_local_node() {
    if curl -s http://localhost:9944 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Local substrate-contracts-node detected${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  No local node detected, will deploy to testnet${NC}"
        return 1
    fi
}

# Build the contract
echo -e "${BLUE}📦 Building contract...${NC}"
cargo contract build --release

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract built successfully${NC}"

# Check contract size
WASM_SIZE=$(stat -f%z target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.wasm 2>/dev/null || stat -c%s target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.wasm 2>/dev/null)
echo -e "${BLUE}📏 Contract size: ${WASM_SIZE} bytes${NC}"

if [ $WASM_SIZE -gt 1048576 ]; then # 1MB
    echo -e "${YELLOW}⚠️  Warning: Contract size is larger than 1MB${NC}"
fi

# Run tests
echo -e "${BLUE}🧪 Running contract tests...${NC}"
cargo test

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All tests passed${NC}"

# Deploy options
echo -e "${BLUE}🌐 Deployment Options:${NC}"
echo "1. Local testnet (substrate-contracts-node)"
echo "2. AssetHub testnet"
echo "3. AssetHub mainnet (NOT RECOMMENDED for testing)"

read -p "Choose deployment target (1-3): " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
    1)
        echo -e "${BLUE}🏠 Deploying to local testnet...${NC}"
        ENDPOINT="ws://localhost:9944"
        NETWORK="local"
        
        if ! check_local_node; then
            echo -e "${RED}❌ Local node not running. Start substrate-contracts-node first.${NC}"
            echo -e "${YELLOW}Run: substrate-contracts-node --dev --tmp${NC}"
            exit 1
        fi
        ;;
    2)
        echo -e "${BLUE}🧪 Deploying to AssetHub testnet...${NC}"
        ENDPOINT="wss://asset-hub-polkadot-rpc.dwellir.com"
        NETWORK="assethub-testnet"
        ;;
    3)
        echo -e "${RED}⚠️  MAINNET DEPLOYMENT - ARE YOU SURE?${NC}"
        read -p "Type 'YES' to confirm mainnet deployment: " CONFIRM
        if [ "$CONFIRM" != "YES" ]; then
            echo -e "${YELLOW}Deployment cancelled${NC}"
            exit 0
        fi
        ENDPOINT="wss://asset-hub-polkadot-rpc.polkadot.io"
        NETWORK="assethub-mainnet"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Check if account is set up
echo -e "${BLUE}👤 Checking account setup...${NC}"

# For testnet/mainnet, we need to use polkadot-js or similar
if [ "$NETWORK" != "local" ]; then
    echo -e "${YELLOW}⚠️  For testnet/mainnet deployment, you need to:${NC}"
    echo "1. Have a funded account on $NETWORK"
    echo "2. Use polkadot-js apps or cargo-contract with --suri flag"
    echo "3. Ensure you have sufficient balance for deployment"
    echo ""
    echo -e "${BLUE}📋 Manual deployment steps:${NC}"
    echo "1. Go to https://polkadot.js.org/apps/"
    echo "2. Connect to $ENDPOINT"
    echo "3. Navigate to Developer > Contracts"
    echo "4. Upload the contract WASM: target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.wasm"
    echo "5. Upload the metadata: target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.json"
    echo "6. Deploy with constructor arguments: $CONSTRUCTOR_ARGS"
    echo ""
    echo -e "${GREEN}✅ Contract ready for deployment${NC}"
    echo -e "${BLUE}📁 Files location:${NC}"
    echo "  WASM: target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.wasm"
    echo "  Metadata: target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.json"
    echo "  ABI: target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.json"
else
    # Local deployment using cargo-contract
    echo -e "${BLUE}🚀 Deploying to local node...${NC}"
    
    # Deploy with Alice account (default for local testing)
    cargo contract instantiate \
        --constructor new \
        --args "$CONSTRUCTOR_ARGS" \
        --suri //Alice \
        --url $ENDPOINT \
        --execute
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Contract deployed successfully to local testnet${NC}"
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 Deployment process completed!${NC}"

# Generate deployment summary
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "Contract Name: $CONTRACT_NAME"
echo "Network: $NETWORK"
echo "Endpoint: $ENDPOINT"
echo "Constructor Args: $CONSTRUCTOR_ARGS"
echo "WASM Size: $WASM_SIZE bytes"
echo "Build Date: $(date)"

# Save deployment info
cat > deployment-info.json << EOF
{
  "contractName": "$CONTRACT_NAME",
  "network": "$NETWORK",
  "endpoint": "$ENDPOINT",
  "constructorArgs": $CONSTRUCTOR_ARGS,
  "wasmSize": $WASM_SIZE,
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "files": {
    "wasm": "target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.wasm",
    "metadata": "target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.json"
  }
}
EOF

echo -e "${GREEN}📄 Deployment info saved to deployment-info.json${NC}"