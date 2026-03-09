#!/bin/bash

# Load Testing Runner Script
# Runs all load tests and generates summary report

set -e

echo "🚀 Starting Tailtown Load Tests"
echo "================================"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed"
    echo "Install with: brew install k6"
    exit 1
fi

# Create results directory
mkdir -p results

# Set API URL (default to localhost)
export API_URL=${API_URL:-http://localhost:4004}
echo "Testing against: $API_URL"
echo ""

# Test 1: Single Tenant Rate Limiting
echo "📊 Test 1: Single Tenant Rate Limiting"
echo "--------------------------------------"
k6 run rate-limiting-single.js
echo ""

# Test 2: Multi-Tenant Rate Limiting
echo "📊 Test 2: Multi-Tenant Rate Limiting"
echo "--------------------------------------"
k6 run rate-limiting-multi.js
echo ""

# Test 3: Connection Pool Stress Test
echo "📊 Test 3: Connection Pool Stress Test"
echo "---------------------------------------"
k6 run connection-pool.js
echo ""

# Generate summary
echo "✅ All tests complete!"
echo ""
echo "Results saved to: load-tests/results/"
echo ""
echo "Next steps:"
echo "1. Review JSON results in load-tests/results/"
echo "2. Check for any failed thresholds"
echo "3. Adjust rate limits or connection pool if needed"
