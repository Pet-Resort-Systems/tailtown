#!/bin/bash
# Verify that API routing is correctly configured
# Run this after any Nginx or service changes

set -e

echo "🔍 Verifying Service Routing..."
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Test 1: Reservations should return pet data
echo -n "Testing /api/reservations returns pet data... "
PET_NAME=$(curl -s "http://localhost:4004/api/reservations?limit=1" -H "x-tenant-subdomain: tailtown" 2>/dev/null | jq -r ".data[0].pet.name" 2>/dev/null)
if [ "$PET_NAME" != "null" ] && [ -n "$PET_NAME" ]; then
    echo -e "${GREEN}✓ PASS${NC} (pet: $PET_NAME)"
else
    echo -e "${RED}✗ FAIL${NC} - Customer service not returning pet data"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: Check customer service health
echo -n "Testing customer-service (4004) health... "
HEALTH=$(curl -s "http://localhost:4004/health" 2>/dev/null | jq -r ".status" 2>/dev/null)
if [ "$HEALTH" = "up" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} - Customer service not healthy"
    ERRORS=$((ERRORS + 1))
fi

# Test 3: Check reservation service health
echo -n "Testing reservation-service (4003) health... "
HEALTH=$(curl -s "http://localhost:4003/health" 2>/dev/null | jq -r ".status" 2>/dev/null)
if [ "$HEALTH" = "up" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} - Reservation service not healthy"
    ERRORS=$((ERRORS + 1))
fi

# Test 4: Check service agreements route to reservation service
echo -n "Testing /api/service-agreement-templates... "
TEMPLATES=$(curl -s "http://localhost:4003/api/service-agreement-templates" -H "x-tenant-subdomain: tailtown" 2>/dev/null | jq -r ".status" 2>/dev/null)
if [ "$TEMPLATES" = "success" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ WARN${NC} - May need auth token"
fi

# Test 5: Verify Nginx configs match
echo -n "Checking Nginx wildcard-subdomains config... "
if grep -q "proxy_pass http://localhost:4004" /etc/nginx/sites-enabled/wildcard-subdomains 2>/dev/null; then
    RESERVATIONS_PORT=$(grep -A5 "api/reservations" /etc/nginx/sites-enabled/wildcard-subdomains 2>/dev/null | grep "proxy_pass" | grep -o "400[0-9]")
    if [ "$RESERVATIONS_PORT" = "4004" ]; then
        echo -e "${GREEN}✓ PASS${NC} - /api/reservations -> 4004"
    else
        echo -e "${RED}✗ FAIL${NC} - /api/reservations -> $RESERVATIONS_PORT (should be 4004)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} - Not running on production server"
fi

echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All routing checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$ERRORS routing issue(s) found!${NC}"
    echo ""
    echo "📖 See docs/operations/SERVICE-PORTS.md for correct port assignments"
    exit 1
fi
