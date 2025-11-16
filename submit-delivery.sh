#!/bin/bash

# Script to submit Polka-Space Milestone 1 delivery to Polkadot Fast Grants

echo "🚀 Submitting Polka-Space Milestone 1 Delivery"
echo "=============================================="

# Step 1: Clone the delivery repository
echo "📥 Cloning the delivery repository..."
git clone https://github.com/Polkadot-Fast-Grants/delivery.git temp-delivery
cd temp-delivery

# Step 2: Create a new branch for our submission
echo "🌿 Creating new branch..."
git checkout -b polka-space-milestone-1

# Step 3: Create polka-space directory
echo "📁 Creating polka-space directory..."
mkdir -p polka-space

# Step 4: Copy our delivery file
echo "📄 Copying delivery document..."
cp ../milestone-1-delivery.md polka-space/

# Step 5: Add and commit changes
echo "💾 Committing changes..."
git add polka-space/
git commit -m "Add Polka-Space Milestone 1 delivery

- Complete PAPI migration from Polkadot JS API
- ink! smart contracts deployed on AssetHub testnet  
- NFT minting service with 3D metadata handling
- VR integration with WebXR compatibility
- 800+ university students using the platform
- Comprehensive testing and production deployment ready

Deliverables exceed original Fast Grant proposal requirements."

# Step 6: Push to your fork (you'll need to fork first)
echo "🔄 Ready to push to your fork..."
echo ""
echo "⚠️  IMPORTANT: Before running this script, you need to:"
echo "1. Fork https://github.com/Polkadot-Fast-Grants/delivery to your GitHub account"
echo "2. Update the remote URL below to point to YOUR fork"
echo ""
echo "Then uncomment and run these commands:"
echo "# git remote set-url origin https://github.com/YOUR_USERNAME/delivery.git"
echo "# git push origin polka-space-milestone-1"
echo ""
echo "After pushing, create a Pull Request from your fork to the main repository"

# Cleanup
cd ..
echo "🧹 Cleaning up temporary directory..."
rm -rf temp-delivery

echo "✅ Delivery preparation complete!"
echo ""
echo "Next steps:"
echo "1. Fork the delivery repo: https://github.com/Polkadot-Fast-Grants/delivery"
echo "2. Run this script after updating the remote URL"
echo "3. Create a Pull Request with your delivery"