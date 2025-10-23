#!/bin/bash

# Comprehensive test script for NFT Portfolio Integration
set -e

echo "🚀 Starting comprehensive test suite for NFT Portfolio Integration"

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

# Check if required services are running
check_services() {
    print_status "Checking required services..."
    
    # Check Redis
    if ! redis-cli ping > /dev/null 2>&1; then
        print_warning "Redis is not running. Starting Redis..."
        if command -v redis-server > /dev/null; then
            redis-server --daemonize yes --port 6379
            sleep 2
        else
            print_error "Redis is not installed. Please install Redis and try again."
            exit 1
        fi
    fi
    
    print_success "All required services are running"
}

# Setup test environment
setup_test_env() {
    print_status "Setting up test environment..."
    
    # Copy test environment files
    if [ ! -f .env.test ]; then
        print_warning ".env.test not found, creating from template..."
        cp .env.test.example .env.test 2>/dev/null || true
    fi
    
    if [ ! -f backend/.env.test ]; then
        print_warning "backend/.env.test not found, creating from template..."
        cp backend/.env.test.example backend/.env.test 2>/dev/null || true
    fi
    
    # Install dependencies if needed
    if [ ! -d node_modules ]; then
        print_status "Installing frontend dependencies..."
        npm ci
    fi
    
    if [ ! -d backend/node_modules ]; then
        print_status "Installing backend dependencies..."
        cd backend && npm ci && cd ..
    fi
    
    print_success "Test environment setup complete"
}

# Run frontend tests
run_frontend_tests() {
    print_status "Running frontend tests..."
    
    # Unit tests
    print_status "Running frontend unit tests..."
    npm run test || {
        print_error "Frontend unit tests failed"
        return 1
    }
    
    # Component tests
    print_status "Running component tests..."
    npm run test -- --run src/components/ || {
        print_error "Component tests failed"
        return 1
    }
    
    # Hook tests
    print_status "Running hook tests..."
    npm run test -- --run src/hooks/ || {
        print_error "Hook tests failed"
        return 1
    }
    
    # Accessibility tests
    print_status "Running accessibility tests..."
    npm run test -- --run src/test/accessibility.test.tsx || {
        print_error "Accessibility tests failed"
        return 1
    }
    
    print_success "Frontend tests completed successfully"
}

# Run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    
    cd backend
    
    # Unit tests
    print_status "Running backend unit tests..."
    npm test || {
        print_error "Backend unit tests failed"
        cd ..
        return 1
    }
    
    # API tests
    print_status "Running API tests..."
    npm test -- --testPathPattern=api.test.ts || {
        print_error "API tests failed"
        cd ..
        return 1
    }
    
    # Integration tests
    print_status "Running integration tests..."
    npm test -- --testPathPattern=integration.test.ts || {
        print_error "Integration tests failed"
        cd ..
        return 1
    }
    
    cd ..
    print_success "Backend tests completed successfully"
}

# Run contract tests
run_contract_tests() {
    print_status "Running smart contract tests..."
    
    cd contracts/substrate/nft-portfolio
    
    # Check if Rust and cargo-contract are installed
    if ! command -v cargo > /dev/null; then
        print_error "Rust is not installed. Please install Rust and try again."
        cd ../../..
        return 1
    fi
    
    if ! command -v cargo-contract > /dev/null; then
        print_warning "cargo-contract not found. Installing..."
        cargo install --force --locked cargo-contract --version 2.0.0
    fi
    
    # Run contract tests
    print_status "Running contract unit tests..."
    cargo test || {
        print_error "Contract tests failed"
        cd ../../..
        return 1
    }
    
    # Build contract
    print_status "Building contract..."
    cargo contract build || {
        print_error "Contract build failed"
        cd ../../..
        return 1
    }
    
    # Run contract integration tests if available
    if [ -f test.sh ]; then
        print_status "Running contract integration tests..."
        chmod +x test.sh
        ./test.sh || {
            print_error "Contract integration tests failed"
            cd ../../..
            return 1
        }
    fi
    
    cd ../../..
    print_success "Contract tests completed successfully"
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Start backend server for performance testing
    cd backend
    npm run build
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Wait for server to start
    sleep 5
    
    # Run performance tests
    npm run test -- --run performance || {
        print_warning "Performance tests failed or not found"
    }
    
    # Stop backend server
    kill $BACKEND_PID 2>/dev/null || true
    
    print_success "Performance tests completed"
}

# Generate test coverage report
generate_coverage() {
    print_status "Generating test coverage reports..."
    
    # Frontend coverage
    print_status "Generating frontend coverage..."
    npm run test:coverage || {
        print_warning "Frontend coverage generation failed"
    }
    
    # Backend coverage
    print_status "Generating backend coverage..."
    cd backend
    npm test -- --coverage || {
        print_warning "Backend coverage generation failed"
    }
    cd ..
    
    print_success "Coverage reports generated"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up test environment..."
    
    # Kill any remaining processes
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "redis-server" 2>/dev/null || true
    
    # Clean test databases
    redis-cli -n 1 FLUSHDB 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    # Parse command line arguments
    RUN_ALL=true
    RUN_FRONTEND=false
    RUN_BACKEND=false
    RUN_CONTRACTS=false
    RUN_PERFORMANCE=false
    GENERATE_COVERAGE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --frontend)
                RUN_ALL=false
                RUN_FRONTEND=true
                shift
                ;;
            --backend)
                RUN_ALL=false
                RUN_BACKEND=true
                shift
                ;;
            --contracts)
                RUN_ALL=false
                RUN_CONTRACTS=true
                shift
                ;;
            --performance)
                RUN_ALL=false
                RUN_PERFORMANCE=true
                shift
                ;;
            --coverage)
                GENERATE_COVERAGE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --frontend     Run only frontend tests"
                echo "  --backend      Run only backend tests"
                echo "  --contracts    Run only contract tests"
                echo "  --performance  Run only performance tests"
                echo "  --coverage     Generate coverage reports"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run tests based on arguments
    check_services
    setup_test_env
    
    if [ "$RUN_ALL" = true ] || [ "$RUN_FRONTEND" = true ]; then
        run_frontend_tests || exit 1
    fi
    
    if [ "$RUN_ALL" = true ] || [ "$RUN_BACKEND" = true ]; then
        run_backend_tests || exit 1
    fi
    
    if [ "$RUN_ALL" = true ] || [ "$RUN_CONTRACTS" = true ]; then
        run_contract_tests || exit 1
    fi
    
    if [ "$RUN_ALL" = true ] || [ "$RUN_PERFORMANCE" = true ]; then
        run_performance_tests || exit 1
    fi
    
    if [ "$GENERATE_COVERAGE" = true ]; then
        generate_coverage
    fi
    
    print_success "🎉 All tests completed successfully!"
}

# Run main function
main "$@"