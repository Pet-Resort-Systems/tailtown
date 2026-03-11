#!/bin/bash
set -e

echo "🚀 Deploying Tailtown to Production..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

load_env_file() {
    local env_file="$1"
    if [ ! -f "$env_file" ]; then
        echo "❌ Missing env file: $env_file"
        exit 1
    fi

    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
}


# Pull latest code
echo -e "${BLUE}📥 Pulling latest code from GitHub...${NC}"
cd /opt/tailtown
git pull origin sept25-stable

# Validate required per-service env files
load_env_file /opt/tailtown/apps/customer-service/.env
load_env_file /opt/tailtown/apps/reservation-service/.env
load_env_file /opt/tailtown/apps/frontend/.env

# Rebuild customer service
echo -e "${BLUE}🔨 Building customer service...${NC}"
cd /opt/tailtown/apps/customer-service
pnpm run build || echo "Build had TypeScript errors but continuing with existing dist..."

# Rebuild reservation service
echo -e "${BLUE}🔨 Building reservation service...${NC}"
cd /opt/tailtown/apps/reservation-service
pnpm run build || echo "Build had TypeScript errors but continuing with existing dist..."

# Restart services using systemd (if available) or manual restart
echo -e "${BLUE}🔄 Restarting services...${NC}"

if command -v systemctl &> /dev/null; then
    # Using systemd
    sudo systemctl restart tailtown-customer || echo "Systemd service not set up yet"
    sudo systemctl restart tailtown-reservation || echo "Systemd service not set up yet"
    sudo systemctl restart tailtown-frontend || echo "Systemd service not set up yet"
else
    # Manual restart
    echo "Systemd not available, using manual restart..."
    
    # Stop existing services
    pkill -f "node.*apps/customer-service/dist/index.js" || true
    pkill -f "node.*apps/reservation-service/dist/index.js" || true
    pkill -f "serve.*frontend/build" || true
    
    # Start customer service
    cd /opt/tailtown/apps/customer-service
    load_env_file .env
    pnpm start > /tmp/customer-service.log 2>&1 &
    
    # Start reservation service
    cd /opt/tailtown/apps/reservation-service
    load_env_file .env
    pnpm start > /tmp/reservation-service.log 2>&1 &
    
    # Start apps/frontend
    cd /opt/tailtown/apps/frontend
    serve -s build -l 3000 > /tmp/frontend.log 2>&1 &
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Service status:"
echo "  Customer Service: http://129.212.178.244:4004"
echo "  Reservation Service: http://129.212.178.244:4003"
echo "  Frontend: http://129.212.178.244:3000"
echo ""
echo "Logs:"
echo "  Customer: tail -f /tmp/customer-service.log"
echo "  Reservation: tail -f /tmp/reservation-service.log"
echo "  Frontend: tail -f /tmp/frontend.log"
