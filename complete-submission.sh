#!/bin/bash

echo "🚀 Polka-Space Milestone 1 Delivery Submission"
echo "=============================================="

# Check if delivery directory exists, if not clone it
if [ ! -d "delivery" ]; then
    echo "📥 Cloning your forked delivery repository..."
    git clone https://github.com/basedlsg/delivery.git
    if [ $? -ne 0 ]; then
        echo "❌ Failed to clone repository. Please check your internet connection and try again."
        exit 1
    fi
fi

cd delivery

echo "🌿 Creating new branch for submission..."
git checkout -b polka-space-milestone-1

echo "📁 Creating polka-space directory..."
mkdir -p polka-space

echo "📄 Copying milestone delivery document..."
cp ../milestone-1-delivery.md polka-space/

echo "📋 Verifying file was copied..."
if [ -f "polka-space/milestone-1-delivery.md" ]; then
    echo "✅ Delivery document successfully copied"
    echo "📊 File size: $(wc -c < polka-space/milestone-1-delivery.md) bytes"
else
    echo "❌ Failed to copy delivery document"
    exit 1
fi

echo "💾 Adding files to git..."
git add polka-space/

echo "📝 Committing changes..."
git commit -m "Add Polka-Space Milestone 1 delivery

- Complete PAPI migration from Polkadot JS API
- ink! smart contracts deployed on AssetHub testnet  
- NFT minting service with 3D metadata handling
- VR integration with WebXR compatibility
- 800+ university students using the platform
- Comprehensive testing and production deployment ready

Deliverables exceed original Fast Grant proposal requirements."

echo "🔄 Pushing to your fork..."
git push origin polka-space-milestone-1

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your milestone delivery has been pushed to GitHub!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to: https://github.com/basedlsg/delivery"
    echo "2. You should see a banner asking to create a Pull Request"
    echo "3. Click 'Compare & pull request'"
    echo "4. Make sure the base repository is: Polkadot-Fast-Grants/delivery"
    echo "5. Title: 'Polka-Space Milestone 1 Delivery'"
    echo "6. Submit the Pull Request"
    echo ""
    echo "✅ Your $7,500 Fast Grant milestone is ready for review!"
else
    echo ""
    echo "⚠️  Push failed. This might be due to authentication."
    echo "📋 Manual steps:"
    echo "1. Go to: https://github.com/basedlsg/delivery"
    echo "2. Create new file: polka-space/milestone-1-delivery.md"
    echo "3. Copy content from your local milestone-1-delivery.md file"
    echo "4. Commit with message: 'Add Polka-Space Milestone 1 delivery'"
    echo "5. Create Pull Request to Polkadot-Fast-Grants/delivery"
fi

cd ..
echo ""
echo "🧹 Cleaning up..."
echo "Script completed!"