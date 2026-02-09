#!/bin/bash

echo "🧹 Cleaning up build artifacts and sensitive files..."

# Remove embedded git repositories
echo "Removing embedded git repositories..."
git rm --cached -r delivery-1 2>/dev/null || true
git rm --cached -r delivery-repo 2>/dev/null || true

# Remove Rust build artifacts
echo "Removing Rust build artifacts..."
git rm --cached -r contracts/substrate/nft-portfolio/target 2>/dev/null || true
git rm --cached contracts/substrate/nft-portfolio/Cargo.lock 2>/dev/null || true

# Remove any dist directories
echo "Removing dist directories..."
git rm --cached -r dist 2>/dev/null || true
git rm --cached -r backend/dist 2>/dev/null || true
git rm --cached -r src/dist 2>/dev/null || true

# Remove any .env files
echo "Removing .env files..."
git rm --cached .env 2>/dev/null || true
git rm --cached backend/.env 2>/dev/null || true
git rm --cached src/.env 2>/dev/null || true

# Remove node_modules if accidentally committed
echo "Removing node_modules..."
git rm --cached -r node_modules 2>/dev/null || true
git rm --cached -r backend/node_modules 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Commit cleanup: git commit -m 'Remove build artifacts and sensitive files'"
echo "3. Push changes: git push"
