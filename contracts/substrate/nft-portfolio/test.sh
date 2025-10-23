#!/bin/bash

# NFT Portfolio Contract Test Suite
# Comprehensive testing script for the NFT Portfolio contract

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 NFT Portfolio Contract Test Suite${NC}"
echo "========================================"

# Test configuration
CONTRACT_NAME="nft_portfolio"
TEST_TIMEOUT=300

# Function to run a test category
run_test_category() {
    local category=$1
    local description=$2
    
    echo -e "${BLUE}📋 Running $description...${NC}"
    
    case $category in
        "unit")
            cargo test --lib
            ;;
        "integration")
            cargo test --test integration
            ;;
        "metadata")
            cargo test metadata
            ;;
        "validation")
            cargo test validation
            ;;
        "minting")
            cargo test minting
            ;;
        "transfer")
            cargo test transfer
            ;;
        "approval")
            cargo test approval
            ;;
        "burn")
            cargo test burn
            ;;
        "batch")
            cargo test batch
            ;;
        *)
            echo -e "${RED}❌ Unknown test category: $category${NC}"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $description passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
}

# Function to check contract build
check_build() {
    echo -e "${BLUE}🔨 Checking contract build...${NC}"
    
    cargo contract build --release
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Contract builds successfully${NC}"
        
        # Check contract size
        WASM_SIZE=$(stat -f%z target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.wasm 2>/dev/null || stat -c%s target/ink/${CONTRACT_NAME}/${CONTRACT_NAME}.wasm 2>/dev/null)
        echo -e "${BLUE}📏 Contract size: ${WASM_SIZE} bytes${NC}"
        
        if [ $WASM_SIZE -gt 2097152 ]; then # 2MB
            echo -e "${YELLOW}⚠️  Warning: Contract size is larger than 2MB${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Contract build failed${NC}"
        return 1
    fi
}

# Function to run clippy checks
run_clippy() {
    echo -e "${BLUE}📎 Running Clippy checks...${NC}"
    
    cargo clippy --all-targets --all-features -- -D warnings
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Clippy checks passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Clippy checks failed${NC}"
        return 1
    fi
}

# Function to run format checks
run_format_check() {
    echo -e "${BLUE}🎨 Checking code formatting...${NC}"
    
    cargo fmt -- --check
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Code formatting is correct${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Code formatting issues found. Run 'cargo fmt' to fix.${NC}"
        return 1
    fi
}

# Function to generate test coverage report
generate_coverage() {
    echo -e "${BLUE}📊 Generating test coverage report...${NC}"
    
    if command -v cargo-tarpaulin &> /dev/null; then
        cargo tarpaulin --out Html --output-dir coverage
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Coverage report generated in coverage/tarpaulin-report.html${NC}"
            return 0
        else
            echo -e "${RED}❌ Coverage report generation failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  cargo-tarpaulin not installed. Skipping coverage report.${NC}"
        echo -e "${BLUE}💡 Install with: cargo install cargo-tarpaulin${NC}"
        return 0
    fi
}

# Main test execution
main() {
    local failed_tests=0
    local total_tests=0
    
    echo -e "${BLUE}🚀 Starting comprehensive test suite...${NC}"
    echo ""
    
    # Build check
    ((total_tests++))
    if ! check_build; then
        ((failed_tests++))
    fi
    echo ""
    
    # Format check
    ((total_tests++))
    if ! run_format_check; then
        ((failed_tests++))
    fi
    echo ""
    
    # Clippy check
    ((total_tests++))
    if ! run_clippy; then
        ((failed_tests++))
    fi
    echo ""
    
    # Unit tests by category
    test_categories=(
        "unit:Unit Tests"
        "metadata:Metadata Tests"
        "validation:Validation Tests"
        "minting:Minting Tests"
        "transfer:Transfer Tests"
        "approval:Approval Tests"
        "burn:Burn Tests"
        "batch:Batch Operation Tests"
    )
    
    for test_cat in "${test_categories[@]}"; do
        IFS=':' read -r category description <<< "$test_cat"
        ((total_tests++))
        if ! run_test_category "$category" "$description"; then
            ((failed_tests++))
        fi
        echo ""
    done
    
    # Coverage report (optional)
    if [ "$1" = "--coverage" ]; then
        generate_coverage
        echo ""
    fi
    
    # Summary
    echo "========================================"
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo "========================================"
    echo "Total test categories: $total_tests"
    echo "Passed: $((total_tests - failed_tests))"
    echo "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        echo -e "${GREEN}✅ Contract is ready for deployment${NC}"
        return 0
    else
        echo -e "${RED}❌ $failed_tests test categories failed${NC}"
        echo -e "${RED}🚫 Contract is not ready for deployment${NC}"
        return 1
    fi
}

# Parse command line arguments
case "${1:-}" in
    "--help"|"-h")
        echo "NFT Portfolio Contract Test Suite"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --coverage    Generate test coverage report"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "Test Categories:"
        echo "  - Build verification"
        echo "  - Code formatting"
        echo "  - Clippy linting"
        echo "  - Unit tests"
        echo "  - Metadata validation tests"
        echo "  - Minting workflow tests"
        echo "  - Transfer and approval tests"
        echo "  - Burn functionality tests"
        echo "  - Batch operation tests"
        exit 0
        ;;
    "--coverage")
        main --coverage
        ;;
    "")
        main
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        echo "Use --help for usage information"
        exit 1
        ;;
esac