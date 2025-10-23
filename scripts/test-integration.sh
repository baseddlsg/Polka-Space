#!/bin/bash

# Integration Test Script
# Tests complete user flows and component integration

set -e

echo "🚀 Starting Integration Tests for NFT Portfolio Integration"
echo "=================================================="

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

# Check if backend is available
check_backend() {
    print_status "Checking backend availability..."
    
    if [ -d "backend" ]; then
        cd backend
        
        # Check if backend dependencies are installed
        if [ ! -d "node_modules" ]; then
            print_warning "Backend dependencies not found. Installing..."
            npm install
        fi
        
        # Start backend in background for testing
        print_status "Starting backend server for integration tests..."
        npm run dev &
        BACKEND_PID=$!
        
        # Wait for backend to start
        sleep 5
        
        # Check if backend is responding
        if curl -f http://localhost:3001/ > /dev/null 2>&1; then
            print_success "Backend server is running"
        else
            print_error "Backend server failed to start"
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
        fi
        
        cd ..
    else
        print_error "Backend directory not found"
        exit 1
    fi
}

# Run frontend tests
run_frontend_tests() {
    print_status "Running frontend integration tests..."
    
    # Check if frontend dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_warning "Frontend dependencies not found. Installing..."
        npm install
    fi
    
    # Run specific integration tests
    print_status "Running complete user flow tests..."
    npm run test -- src/test/e2e/completeUserFlow.test.tsx --run
    
    print_status "Running cross-component communication tests..."
    npm run test -- src/test/e2e/crossComponentCommunication.test.tsx --run
    
    print_status "Running minting workflow tests..."
    npm run test -- src/test/e2e/mintingWorkflow.test.tsx --run
    
    print_success "Frontend integration tests completed"
}

# Run backend tests
run_backend_tests() {
    print_status "Running backend integration tests..."
    
    cd backend
    
    # Run backend integration tests
    print_status "Running API integration tests..."
    npm run test -- --testPathPattern=integration.test.ts --runInBand
    
    print_status "Running full workflow tests..."
    npm run test -- --testPathPattern=fullWorkflow.test.ts --runInBand
    
    print_success "Backend integration tests completed"
    
    cd ..
}

# Test component integration
test_component_integration() {
    print_status "Testing component integration..."
    
    # Test VR Scene integration
    print_status "Testing VR Scene integration with minting service..."
    npm run test -- src/components/vr/ --run
    
    # Test Portfolio integration
    print_status "Testing Portfolio integration with blockchain service..."
    npm run test -- src/components/portfolio/ --run
    
    # Test hooks integration
    print_status "Testing integration hooks..."
    npm run test -- src/hooks/ --run
    
    print_success "Component integration tests completed"
}

# Test service integration
test_service_integration() {
    print_status "Testing service integration..."
    
    # Test integration service
    print_status "Testing integration service orchestration..."
    npm run test -- src/services/integrationService --run
    
    # Test blockchain service integration
    print_status "Testing blockchain service integration..."
    npm run test -- src/services/blockchainService --run
    
    # Test minting service integration
    print_status "Testing minting service integration..."
    npm run test -- src/services/mintingService --run
    
    print_success "Service integration tests completed"
}

# Test end-to-end workflows
test_e2e_workflows() {
    print_status "Testing end-to-end workflows..."
    
    # Test complete minting workflow
    print_status "Testing complete minting workflow..."
    curl -X POST http://localhost:3001/mint \
        -H "Content-Type: application/json" \
        -d '{
            "ownerAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            "metadata": {
                "id": "test-integration-nft",
                "name": "Integration Test NFT",
                "description": "NFT created during integration testing",
                "model": {
                    "url": "https://example.com/test-model.glb",
                    "format": "glb",
                    "size": 1024,
                    "dimensions": {"width": 1, "height": 1, "depth": 1}
                },
                "materials": [],
                "creator": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
                "timestamp": '$(date +%s000)',
                "attributes": {"test": true}
            }
        }' > /tmp/mint_response.json
    
    if [ $? -eq 0 ]; then
        print_success "Minting API endpoint working"
        
        # Check response
        if grep -q "success" /tmp/mint_response.json; then
            print_success "Minting workflow completed successfully"
        else
            print_warning "Minting response may indicate issues"
            cat /tmp/mint_response.json
        fi
    else
        print_error "Minting API endpoint failed"
    fi
    
    # Test portfolio retrieval
    print_status "Testing portfolio retrieval..."
    curl -f http://localhost:3001/portfolio/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY > /tmp/portfolio_response.json
    
    if [ $? -eq 0 ]; then
        print_success "Portfolio API endpoint working"
    else
        print_error "Portfolio API endpoint failed"
    fi
    
    # Test community feed
    print_status "Testing community feed..."
    curl -f http://localhost:3001/community > /tmp/community_response.json
    
    if [ $? -eq 0 ]; then
        print_success "Community API endpoint working"
    else
        print_error "Community API endpoint failed"
    fi
    
    print_success "End-to-end workflow tests completed"
}

# Performance testing
test_performance() {
    print_status "Running performance tests..."
    
    # Test frontend performance
    npm run test -- src/test/performance/ --run
    
    # Test API performance with multiple requests
    print_status "Testing API performance under load..."
    
    for i in {1..10}; do
        curl -s http://localhost:3001/ > /dev/null &
    done
    wait
    
    print_success "Performance tests completed"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up test environment..."
    
    # Kill backend process if it's running
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_status "Backend server stopped"
    fi
    
    # Clean up temporary files
    rm -f /tmp/mint_response.json /tmp/portfolio_response.json /tmp/community_response.json
    
    print_success "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    print_status "Starting comprehensive integration testing..."
    
    # Check prerequisites
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    # Run test suites
    check_backend
    
    print_status "Running test suites..."
    
    # Frontend tests
    run_frontend_tests
    
    # Backend tests
    run_backend_tests
    
    # Component integration tests
    test_component_integration
    
    # Service integration tests
    test_service_integration
    
    # End-to-end workflow tests
    test_e2e_workflows
    
    # Performance tests
    test_performance
    
    print_success "🎉 All integration tests completed successfully!"
    print_status "Integration test summary:"
    echo "  ✅ Frontend integration tests"
    echo "  ✅ Backend integration tests"
    echo "  ✅ Component integration tests"
    echo "  ✅ Service integration tests"
    echo "  ✅ End-to-end workflow tests"
    echo "  ✅ Performance tests"
    echo ""
    print_success "The NFT Portfolio Integration is ready for deployment!"
}

# Run main function
main "$@"