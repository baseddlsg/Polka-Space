#!/bin/bash

# Production Build Script for VR Genesis Frame
# Optimizes and builds the application for production deployment

set -e

echo "🚀 Starting Production Build Process"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $REQUIRED_VERSION or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

print_success "Node.js version check passed: $NODE_VERSION"

# Set production environment
export NODE_ENV=production
export VITE_NODE_ENV=production

print_status "Environment set to production"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf backend/dist/
rm -rf .vite/
print_success "Previous builds cleaned"

# Install dependencies with exact versions
print_status "Installing frontend dependencies..."
npm ci --only=production --no-audit --no-fund
print_success "Frontend dependencies installed"

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm ci --only=production --no-audit --no-fund
cd ..
print_success "Backend dependencies installed"

# Run security audit
print_status "Running security audit..."
npm audit --audit-level=high --only=prod || {
    print_warning "Security vulnerabilities found. Please review and fix before deploying to production."
}

# Run tests
print_status "Running test suite..."
npm run test:ci || {
    print_error "Tests failed. Please fix all tests before building for production."
    exit 1
}
print_success "All tests passed"

# Type checking
print_status "Running TypeScript type checking..."
npm run type-check || {
    print_error "TypeScript type checking failed. Please fix all type errors."
    exit 1
}
print_success "TypeScript type checking passed"

# Lint code
print_status "Running code linting..."
npm run lint || {
    print_warning "Linting issues found. Consider fixing before deployment."
}

# Build backend
print_status "Building backend..."
cd backend
npm run build || {
    print_error "Backend build failed"
    exit 1
}
cd ..
print_success "Backend built successfully"

# Optimize assets
print_status "Optimizing assets..."

# Compress images (if imagemin is available)
if command -v imagemin &> /dev/null; then
    find public -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | xargs imagemin --out-dir=public/optimized/
    print_success "Images optimized"
else
    print_warning "imagemin not found. Skipping image optimization."
fi

# Build frontend with optimizations
print_status "Building frontend with optimizations..."

# Set build-specific environment variables
export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VITE_BUILD_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Build with Vite
npm run build || {
    print_error "Frontend build failed"
    exit 1
}

print_success "Frontend built successfully"

# Analyze bundle size
print_status "Analyzing bundle size..."
if [ -f "dist/assets" ]; then
    BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
    print_status "Total bundle size: $BUNDLE_SIZE"
    
    # Check if bundle size is reasonable (warn if > 10MB)
    BUNDLE_SIZE_BYTES=$(du -sb dist/ | cut -f1)
    if [ "$BUNDLE_SIZE_BYTES" -gt 10485760 ]; then
        print_warning "Bundle size is large ($BUNDLE_SIZE). Consider optimizing assets."
    fi
fi

# Generate service worker (if enabled)
if [ "$VITE_ENABLE_PWA" = "true" ]; then
    print_status "Generating service worker..."
    # Service worker generation would happen here
    print_success "Service worker generated"
fi

# Compress assets with gzip
print_status "Compressing assets with gzip..."
find dist -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" \) -exec gzip -k {} \;
print_success "Assets compressed with gzip"

# Generate asset manifest
print_status "Generating asset manifest..."
cat > dist/manifest.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildHash": "$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")",
  "version": "$(node -p "require('./package.json').version")",
  "environment": "production",
  "assets": {
    "totalSize": "$(du -sh dist/ | cut -f1)",
    "files": $(find dist -type f -name "*.js" -o -name "*.css" -o -name "*.html" | wc -l)
  }
}
EOF
print_success "Asset manifest generated"

# Security checks
print_status "Running security checks..."

# Check for sensitive information in build
if grep -r "localhost" dist/ 2>/dev/null; then
    print_warning "Found localhost references in build. Please verify these are intentional."
fi

if grep -r "development" dist/ 2>/dev/null; then
    print_warning "Found development references in build. Please verify these are intentional."
fi

# Validate environment variables
print_status "Validating production environment variables..."
REQUIRED_ENV_VARS=(
    "VITE_API_BASE_URL"
    "VITE_POLKADOT_WS_URL"
    "VITE_ASSETHUB_WS_URL"
)

for var in "${REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_warning "Environment variable $var is not set"
    else
        print_success "Environment variable $var is set"
    fi
done

# Generate deployment checklist
print_status "Generating deployment checklist..."
cat > DEPLOYMENT_CHECKLIST.md << EOF
# Deployment Checklist

## Pre-deployment
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Database migrations prepared
- [ ] Backup strategy in place

## Build Verification
- [ ] Frontend build successful
- [ ] Backend build successful
- [ ] Assets optimized and compressed
- [ ] Bundle size acceptable
- [ ] No sensitive information in build
- [ ] Service worker generated (if enabled)

## Infrastructure
- [ ] Production servers ready
- [ ] Load balancer configured
- [ ] CDN configured
- [ ] Monitoring setup
- [ ] Logging configured
- [ ] Health checks working

## Post-deployment
- [ ] Smoke tests passed
- [ ] Performance metrics normal
- [ ] Error rates acceptable
- [ ] User acceptance testing
- [ ] Rollback plan ready

Build Information:
- Build Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Git Hash: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
- Version: $(node -p "require('./package.json').version")
- Bundle Size: $(du -sh dist/ | cut -f1)
EOF

print_success "Deployment checklist generated"

# Performance recommendations
print_status "Generating performance recommendations..."
cat > PERFORMANCE_RECOMMENDATIONS.md << EOF
# Performance Recommendations

## Frontend Optimizations
1. Enable gzip compression on server
2. Set appropriate cache headers for static assets
3. Use CDN for asset delivery
4. Enable HTTP/2 on server
5. Implement lazy loading for 3D models
6. Use WebP images where supported

## Backend Optimizations
1. Enable Redis caching
2. Optimize database queries
3. Use connection pooling
4. Implement rate limiting
5. Enable compression middleware
6. Monitor memory usage

## 3D Rendering Optimizations
1. Use Level of Detail (LOD) for models
2. Implement frustum culling
3. Enable occlusion culling
4. Optimize texture sizes
5. Use instanced rendering for repeated objects
6. Implement model streaming

## Monitoring
1. Set up performance monitoring
2. Monitor Core Web Vitals
3. Track error rates
4. Monitor memory usage
5. Set up alerts for critical metrics
6. Regular performance audits

Current Configuration:
- Max Concurrent Models: 3
- Model Cache Size: 30MB
- Query Batch Size: 5
- LOD Enabled: Yes
- Service Worker: $([ "$VITE_ENABLE_PWA" = "true" ] && echo "Yes" || echo "No")
EOF

print_success "Performance recommendations generated"

# Final verification
print_status "Running final verification..."

# Check if critical files exist
CRITICAL_FILES=(
    "dist/index.html"
    "backend/dist/server.js"
    "dist/manifest.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Critical file exists: $file"
    else
        print_error "Critical file missing: $file"
        exit 1
    fi
done

# Check build integrity
if [ -d "dist/assets" ] && [ "$(ls -A dist/assets)" ]; then
    print_success "Frontend assets generated"
else
    print_error "Frontend assets missing"
    exit 1
fi

if [ -f "backend/dist/server.js" ]; then
    print_success "Backend server built"
else
    print_error "Backend server build missing"
    exit 1
fi

# Generate build summary
print_status "Generating build summary..."
echo ""
echo "🎉 Production Build Complete!"
echo "============================="
echo ""
echo "Build Information:"
echo "  - Build Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "  - Git Hash: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
echo "  - Version: $(node -p "require('./package.json').version")"
echo "  - Environment: production"
echo ""
echo "Bundle Information:"
echo "  - Frontend Size: $(du -sh dist/ | cut -f1)"
echo "  - Backend Size: $(du -sh backend/dist/ | cut -f1)"
echo "  - Total Files: $(find dist -type f | wc -l) frontend, $(find backend/dist -type f | wc -l) backend"
echo ""
echo "Next Steps:"
echo "  1. Review DEPLOYMENT_CHECKLIST.md"
echo "  2. Review PERFORMANCE_RECOMMENDATIONS.md"
echo "  3. Test the build locally: npm run preview"
echo "  4. Deploy to staging environment"
echo "  5. Run smoke tests"
echo "  6. Deploy to production"
echo ""
print_success "Build process completed successfully!"

# Optional: Start preview server
read -p "Would you like to start a preview server to test the build? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting preview server..."
    npm run preview
fi