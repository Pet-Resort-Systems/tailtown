#!/bin/bash

# Script to check for hardcoded localhost URLs in apps/frontend code
# This prevents localhost references from being deployed to production

set -e

echo "🔍 Checking for hardcoded localhost URLs..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Search for localhost URLs in apps/frontend source code
# Exclude node_modules, build, test files, config files, and setupProxy
# Also exclude lines that use environment variables as fallbacks (|| 'http://localhost')
LOCALHOST_MATCHES=$(grep -r "localhost:[0-9]" apps/frontend/src \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=build \
  --exclude-dir=config \
  --exclude="*.test.*" \
  --exclude="*.spec.*" \
  --exclude="setupProxy.js" \
  --exclude="test-api.js" \
  --exclude="development.ts" \
  --exclude="test.ts" \
  | grep -v "process\.env\." \
  | grep -v "|| 'http://localhost" \
  | grep -v ": 'http://localhost" \
  | grep -v "? 'http://localhost" \
  2>/dev/null || true)

if [ -n "$LOCALHOST_MATCHES" ]; then
  echo -e "${RED}❌ Found hardcoded localhost URLs:${NC}"
  echo ""
  echo "$LOCALHOST_MATCHES"
  echo ""
  echo -e "${YELLOW}💡 Fix: Replace hardcoded URLs with environment variables${NC}"
  echo "   Example: const apiUrl = process.env.REACT_APP_API_URL || '';"
  echo "            fetch(\`\${apiUrl}/api/endpoint\`)"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ No hardcoded localhost URLs found${NC}"
  echo ""
fi

# Also check for common variations
echo "Checking for common localhost variations..."

# Check for http://localhost (without port)
LOCALHOST_NO_PORT=$(grep -r "http://localhost[^:]" apps/frontend/src \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=build \
  --exclude="*.test.*" \
  --exclude="*.spec.*" \
  2>/dev/null || true)

if [ -n "$LOCALHOST_NO_PORT" ]; then
  echo -e "${RED}❌ Found localhost URLs without port:${NC}"
  echo ""
  echo "$LOCALHOST_NO_PORT"
  echo ""
  exit 1
fi

# Check for 127.0.0.1
LOCALHOST_IP=$(grep -r "127\.0\.0\.1:[0-9]" apps/frontend/src \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=build \
  --exclude="*.test.*" \
  --exclude="*.spec.*" \
  2>/dev/null || true)

if [ -n "$LOCALHOST_IP" ]; then
  echo -e "${RED}❌ Found hardcoded 127.0.0.1 URLs:${NC}"
  echo ""
  echo "$LOCALHOST_IP"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ No localhost variations found${NC}"
echo ""
echo "========================================"
echo -e "${GREEN}🎉 All checks passed!${NC}"
