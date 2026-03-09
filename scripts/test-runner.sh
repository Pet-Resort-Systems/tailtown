#!/bin/bash

# Tailtown Test Runner
# Comprehensive testing automation for development workflow

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_ROOT/.test-results"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"
CUSTOMER_SERVICE_DIR="$PROJECT_ROOT/apps/customer-service"
RESERVATION_SERVICE_DIR="$PROJECT_ROOT/apps/reservation-service"

#############################################
# Helper Functions
#############################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}▶ $1${NC}"
    echo ""
}

create_results_dir() {
    mkdir -p "$TEST_RESULTS_DIR"
}

#############################################
# Test Runners
#############################################

run_frontend_tests() {
    print_section "Frontend Tests"
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        echo -e "${YELLOW}Frontend directory not found${NC}"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    if [ ! -f "package.json" ]; then
        echo -e "${YELLOW}No package.json found${NC}"
        return 1
    fi
    
    # Check if test script exists
    if ! grep -q '"test"' package.json; then
        echo -e "${YELLOW}No test script configured${NC}"
        return 0
    fi
    
    echo "Running apps/frontend tests..."
    pnpm test -- --watchAll=false --passWithNoTests 2>&1 | tee "$TEST_RESULTS_DIR/apps/frontend.log"
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Frontend tests failed${NC}"
        return 1
    fi
}

run_customer_service_tests() {
    print_section "Customer Service Tests"
    
    if [ ! -d "$CUSTOMER_SERVICE_DIR" ]; then
        echo -e "${YELLOW}Customer service directory not found${NC}"
        return 1
    fi
    
    cd "$CUSTOMER_SERVICE_DIR"
    
    echo "Running customer service tests..."
    pnpm test 2>&1 | tee "$TEST_RESULTS_DIR/customer-service.log"
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Customer service tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Customer service tests failed${NC}"
        return 1
    fi
}

run_reservation_service_tests() {
    print_section "Reservation Service Tests"
    
    if [ ! -d "$RESERVATION_SERVICE_DIR" ]; then
        echo -e "${YELLOW}Reservation service directory not found${NC}"
        return 1
    fi
    
    cd "$RESERVATION_SERVICE_DIR"
    
    echo "Running reservation service tests..."
    pnpm test 2>&1 | tee "$TEST_RESULTS_DIR/reservation-service.log"
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Reservation service tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Reservation service tests failed${NC}"
        return 1
    fi
}

run_integration_tests() {
    print_section "Integration Tests"
    
    cd "$PROJECT_ROOT"
    
    if [ ! -d "tests/integration" ]; then
        echo -e "${YELLOW}No integration tests found${NC}"
        return 0
    fi
    
    echo "Running integration tests..."
    pnpm run test:integration 2>&1 | tee "$TEST_RESULTS_DIR/integration.log"
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Integration tests failed${NC}"
        return 1
    fi
}

#############################################
# Test Suites
#############################################

run_all_tests() {
    print_header "Running All Tests"
    
    create_results_dir
    
    local failed=0
    
    # Run each test suite
    run_frontend_tests || failed=$((failed + 1))
    run_customer_service_tests || failed=$((failed + 1))
    run_reservation_service_tests || failed=$((failed + 1))
    run_integration_tests || failed=$((failed + 1))
    
    # Summary
    echo ""
    print_header "Test Summary"
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ $failed test suite(s) failed${NC}"
        echo ""
        echo "Check logs in: $TEST_RESULTS_DIR"
        return 1
    fi
}

run_quick_tests() {
    print_header "Running Quick Tests (Unit Only)"
    
    create_results_dir
    
    local failed=0
    
    # Ensure database environment variables are set
    export DATABASE_URL="${DATABASE_URL:-postgresql://root:postgres@localhost:5433/customer}"
    export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://root:postgres@localhost:5433/customer}"
    export PGUSER="${PGUSER:-root}"
    export PGPASSWORD="${PGPASSWORD:-postgres}"
    export PGDATABASE="${PGDATABASE:-customer}"
    export PGHOST="${PGHOST:-localhost}"
    export PGPORT="${PGPORT:-5433}"
    
    echo "Database configuration:"
    echo "  DATABASE_URL: $DATABASE_URL"
    echo "  PGUSER: $PGUSER"
    echo "  PGHOST: $PGHOST:$PGPORT"
    echo ""
    
    # Run unit tests only (faster)
    print_section "Frontend Unit Tests"
    cd "$FRONTEND_DIR"
    pnpm test -- --watchAll=false --passWithNoTests --testPathIgnorePatterns=integration 2>&1 | tee "$TEST_RESULTS_DIR/apps/frontend-quick.log" || failed=$((failed + 1))
    
    print_section "Customer Service Unit Tests"
    cd "$CUSTOMER_SERVICE_DIR"
    pnpm test -- --passWithNoTests 2>&1 | tee "$TEST_RESULTS_DIR/customer-quick.log" || failed=$((failed + 1))
    
    print_section "Reservation Service Unit Tests"
    cd "$RESERVATION_SERVICE_DIR"
    pnpm test -- --passWithNoTests 2>&1 | tee "$TEST_RESULTS_DIR/reservation-quick.log" || failed=$((failed + 1))
    
    # Summary
    echo ""
    print_header "Quick Test Summary"
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✅ All quick tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ $failed test suite(s) failed${NC}"
        return 1
    fi
}

run_changed_tests() {
    print_header "Running Tests for Changed Files"
    
    # Get changed files
    local changed_files=$(git diff --name-only HEAD)
    
    if [ -z "$changed_files" ]; then
        echo -e "${YELLOW}No changed files detected${NC}"
        echo "Running quick tests instead..."
        run_quick_tests
        return $?
    fi
    
    echo "Changed files:"
    echo "$changed_files" | while read file; do
        echo "  - $file"
    done
    echo ""
    
    # Determine which tests to run based on changed files
    local run_frontend=false
    local run_customer=false
    local run_reservation=false
    
    while IFS= read -r file; do
        if [[ "$file" == apps/frontend/* ]]; then
            run_frontend=true
        elif [[ "$file" == apps/customer-service/* ]]; then
            run_customer=true
        elif [[ "$file" == apps/reservation-service/* ]]; then
            run_reservation=true
        fi
    done <<< "$changed_files"
    
    create_results_dir
    local failed=0
    
    if [ "$run_frontend" = true ]; then
        run_frontend_tests || failed=$((failed + 1))
    fi
    
    if [ "$run_customer" = true ]; then
        run_customer_service_tests || failed=$((failed + 1))
    fi
    
    if [ "$run_reservation" = true ]; then
        run_reservation_service_tests || failed=$((failed + 1))
    fi
    
    if [ "$run_frontend" = false ] && [ "$run_customer" = false ] && [ "$run_reservation" = false ]; then
        echo -e "${YELLOW}No test-related changes detected${NC}"
        return 0
    fi
    
    # Summary
    echo ""
    print_header "Changed Files Test Summary"
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✅ All tests for changed files passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ $failed test suite(s) failed${NC}"
        return 1
    fi
}

run_watch_mode() {
    print_header "Test Watch Mode"
    
    echo "Select service to watch:"
    echo "  1) Frontend"
    echo "  2) Customer Service"
    echo "  3) Reservation Service"
    read -p "Select (1-3): " choice
    
    case $choice in
        1)
            echo ""
            echo "Starting apps/frontend tests in watch mode..."
            cd "$FRONTEND_DIR"
            pnpm test
            ;;
        2)
            echo ""
            echo "Starting customer service tests in watch mode..."
            cd "$CUSTOMER_SERVICE_DIR"
            pnpm run test:watch
            ;;
        3)
            echo ""
            echo "Starting reservation service tests in watch mode..."
            cd "$RESERVATION_SERVICE_DIR"
            pnpm run test:watch
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
}

run_coverage() {
    print_header "Running Tests with Coverage"
    
    create_results_dir
    
    print_section "Frontend Coverage"
    cd "$FRONTEND_DIR"
    pnpm test -- --coverage --watchAll=false --passWithNoTests
    
    print_section "Customer Service Coverage"
    cd "$CUSTOMER_SERVICE_DIR"
    pnpm run test:coverage
    
    print_section "Reservation Service Coverage"
    cd "$RESERVATION_SERVICE_DIR"
    pnpm run test:coverage
    
    echo ""
    echo -e "${GREEN}✅ Coverage reports generated${NC}"
    echo ""
    echo "View coverage reports:"
    echo "  Frontend: $FRONTEND_DIR/coverage/lcov-report/index.html"
    echo "  Customer: $CUSTOMER_SERVICE_DIR/coverage/lcov-report/index.html"
    echo "  Reservation: $RESERVATION_SERVICE_DIR/coverage/lcov-report/index.html"
    echo ""
}

show_test_status() {
    print_header "Test Status"
    
    echo -e "${CYAN}Test Files:${NC}"
    
    # Count test files
    local frontend_tests=$(find "$FRONTEND_DIR/src" -name "*.test.ts*" 2>/dev/null | wc -l)
    local customer_tests=$(find "$CUSTOMER_SERVICE_DIR/src" -name "*.test.ts" 2>/dev/null | wc -l)
    local reservation_tests=$(find "$RESERVATION_SERVICE_DIR/src" -name "*.test.ts" 2>/dev/null | wc -l)
    
    echo "  Frontend: $frontend_tests test files"
    echo "  Customer Service: $customer_tests test files"
    echo "  Reservation Service: $reservation_tests test files"
    echo ""
    
    # Check for recent test results
    if [ -d "$TEST_RESULTS_DIR" ]; then
        echo -e "${CYAN}Recent Test Results:${NC}"
        ls -lt "$TEST_RESULTS_DIR" | tail -n +2 | head -5 | while read -r line; do
            local file=$(echo "$line" | awk '{print $9}')
            local date=$(echo "$line" | awk '{print $6, $7, $8}')
            echo "  $file ($date)"
        done
        echo ""
    fi
    
    echo -e "${CYAN}Available Commands:${NC}"
    echo "  pnpm run test:all      - Run all tests"
    echo "  pnpm run test:quick    - Run unit tests only"
    echo "  pnpm run test:changed  - Test changed files"
    echo "  pnpm run test:watch    - Watch mode"
    echo "  pnpm run test:coverage - Generate coverage"
    echo ""
}

#############################################
# Main
#############################################

case "${1:-}" in
    all)
        run_all_tests
        ;;
    quick)
        run_quick_tests
        ;;
    changed)
        run_changed_tests
        ;;
    watch)
        run_watch_mode
        ;;
    coverage)
        run_coverage
        ;;
    frontend)
        run_frontend_tests
        ;;
    customer)
        run_customer_service_tests
        ;;
    reservation)
        run_reservation_service_tests
        ;;
    integration)
        run_integration_tests
        ;;
    status)
        show_test_status
        ;;
    *)
        echo "Tailtown Test Runner"
        echo ""
        echo "Usage: $0 {command}"
        echo ""
        echo "Commands:"
        echo "  all          - Run all tests (unit + integration)"
        echo "  quick        - Run unit tests only (faster)"
        echo "  changed      - Run tests for changed files"
        echo "  watch        - Run tests in watch mode"
        echo "  coverage     - Generate coverage reports"
        echo "  apps/frontend     - Run apps/frontend tests only"
        echo "  customer     - Run customer service tests only"
        echo "  reservation  - Run reservation service tests only"
        echo "  integration  - Run integration tests only"
        echo "  status       - Show test status"
        echo ""
        echo "npm shortcuts:"
        echo "  pnpm run test:all"
        echo "  pnpm run test:quick"
        echo "  pnpm run test:changed"
        echo "  pnpm run test:watch"
        echo "  pnpm run test:coverage"
        echo ""
        echo "Pre-commit:"
        echo "  Tests automatically run on git commit (quick tests)"
        exit 1
        ;;
esac
