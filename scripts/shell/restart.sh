#!/bin/bash
# Simple restart script for Tailtown

echo "=== Tailtown Service Restart ==="

# Get NVM
source ~/.nvm/nvm.sh

# Directories
ROOT_DIR="$(pwd)"
RESERVATION_DIR="$ROOT_DIR/apps/reservation-service"
CUSTOMER_DIR="$ROOT_DIR/apps/customer-service"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up environment...${NC}"
# Kill processes (optional - uncomment if needed)
# echo "Killing processes on ports 3000, 4003, 4004..."
# kill -9 $(lsof -ti tcp:3000) 2>/dev/null || echo "No process on port 3000"
# kill -9 $(lsof -ti tcp:4003) 2>/dev/null || echo "No process on port 4003"
# kill -9 $(lsof -ti tcp:4004) 2>/dev/null || echo "No process on port 4004"

echo -e "${GREEN}Opening terminal for reservation service (port 4003)${NC}"
echo "cd $RESERVATION_DIR && source ~/.nvm/nvm.sh && pnpm run dev"

echo -e "${GREEN}Opening terminal for customer service (port 4004)${NC}"
echo "cd $CUSTOMER_DIR && source ~/.nvm/nvm.sh && pnpm run dev"

echo -e "${GREEN}Opening terminal for apps/frontend (port 3000)${NC}"
echo "cd $FRONTEND_DIR && source ~/.nvm/nvm.sh && pnpm start"

echo
echo -e "${RED}IMPORTANT: Remember to check that tenant ID is set in browser:${NC}"
echo "localStorage.setItem('tailtown_tenant_id', 'dev')"
echo 
echo -e "This can now be done automatically with the new initTenant.js"
echo -e "Just make sure to refresh the page after services start."
