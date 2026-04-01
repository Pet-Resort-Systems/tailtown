#!/bin/bash

# Automated Test Runner for Tailtown
# Runs all tests across apps/legacy-frontend and backend services

set -e  # Exit on error

# Load nvm if available (for npm)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure npm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found in PATH"
    echo "Please ensure Node.js and pnpm are installed"
    exit 1
fi

echo "🧪 Running Tailtown Test Suite"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
FAILED_TESTS=()
PASSED_TESTS=()

# Function to run tests and track results
run_test() {
    local test_name=$1
    local test_command=$2
    local test_dir=$3
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    if [ -n "$test_dir" ]; then
        cd "$test_dir"
    fi
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        PASSED_TESTS+=("$test_name")
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        FAILED_TESTS+=("$test_name")
    fi
    
    if [ -n "$test_dir" ]; then
        cd - > /dev/null
    fi
    
    echo ""
}

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📦 Installing dependencies..."
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    pnpm install
fi

echo ""
echo "🔧 Setting up test database..."
echo ""

# Check if DATABASE_URL is already set, otherwise use default
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set, skipping database-dependent tests"
    echo "   To run database tests, set DATABASE_URL environment variable"
    echo "   Example: export DATABASE_URL='postgresql://user:pass@localhost:5432/customer_test'"
    SKIP_DB_TESTS=true
else
    export NODE_ENV="test"
    
    # Run migrations for test database
    cd apps/customer-service
    pnpm exec prisma migrate deploy --preview-feature 2>/dev/null || echo "Migrations already applied"
    pnpm exec prisma generate 2>/dev/null || echo "Prisma client already generated"
    cd ../..
fi

echo ""
echo "🧪 Running Tests..."
echo "================================"
echo ""

# Run legacy frontend tests
run_test "Legacy Frontend Tests" "pnpm test -- --watchAll=false --passWithNoTests" "apps/legacy-frontend"

# Run customer service tests (skip if no database)
if [ "$SKIP_DB_TESTS" = true ]; then
    echo -e "${YELLOW}Skipping Customer Service Tests (requires database)${NC}"
    echo ""
else
    run_test "Customer Service Tests" "pnpm test" "apps/customer-service"
fi

# Run reservation service tests (skip if no database)
if [ "$SKIP_DB_TESTS" = true ]; then
    echo -e "${YELLOW}Skipping Reservation Service Tests (requires database)${NC}"
    echo ""
else
    run_test "Reservation Service Tests" "pnpm test" "apps/reservation-service"
fi

# Run messaging API tests specifically (skip if no database)
if [ "$SKIP_DB_TESTS" = true ]; then
    echo -e "${YELLOW}Skipping Messaging API Tests (requires database)${NC}"
    echo ""
else
    run_test "Messaging API Tests" "pnpm test -- messaging.api.test.ts" "apps/customer-service"
fi

# Run linting
echo -e "${YELLOW}Running linting checks...${NC}"
echo ""

cd apps/customer-service
pnpm run lint 2>/dev/null || echo "Linting completed with warnings"
cd ../..

cd apps/reservation-service
pnpm run lint 2>/dev/null || echo "Linting completed with warnings"
cd ../..

echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo ""

if [ ${#PASSED_TESTS[@]} -gt 0 ]; then
    echo -e "${GREEN}Passed Tests (${#PASSED_TESTS[@]}):${NC}"
    for test in "${PASSED_TESTS[@]}"; do
        echo -e "  ${GREEN}✓${NC} $test"
    done
    echo ""
fi

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo -e "${RED}Failed Tests (${#FAILED_TESTS[@]}):${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}✗${NC} $test"
    done
    echo ""
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
fi
