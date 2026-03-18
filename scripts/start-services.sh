#!/bin/bash

# Tailtown Service Startup Script
# Automatically starts all required services with proper environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🚀 Starting Tailtown Services${NC}"
echo "=================================="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 0
    fi
    return 1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start within expected time${NC}"
    return 1
}

# Function to start service in background
start_service() {
    local service_path=$1
    local service_name=$2
    local port=$3
    local command=$4
    
    echo -e "${BLUE}🔧 Starting $service_name (port $port)...${NC}"
    
    if check_port $port; then
        echo -e "${YELLOW}   $service_name appears to be running already${NC}"
        return 0
    fi
    
    cd "$PROJECT_ROOT/$service_path"
    
    # Load NVM and start service
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        source "$HOME/.nvm/nvm.sh"
    fi
    
    eval "$command" > "$PROJECT_ROOT/logs/$service_name.log" 2>&1 &
    local pid=$!
    
    echo "   Started $service_name with PID: $pid"
    echo $pid > "$PROJECT_ROOT/logs/$service_name.pid"
    
    cd "$PROJECT_ROOT"
    return 0
}

# Create logs directory
mkdir -p logs

# Clean up any existing log files
rm -f logs/*.pid logs/*.log

# 1. Start Customer Service
start_service "apps/customer-service" "Customer Service" 4004 "pnpm run dev"

# 2. Start Reservation Service  
start_service "apps/reservation-service" "Reservation Service" 4003 "pnpm run dev"

# 3. Start Payment Service (optional)
if [ "$1" = "--with-payment" ]; then
    start_service "apps/payment-service" "Payment Service" 4005 "pnpm run dev"
fi

# 4. Start Frontend
start_service "apps/frontend" "Frontend" 3000 "pnpm start"

# 5. Start MCP RAG Server
echo -e "${BLUE}🔧 Starting RAG MCP Server...${NC}"
cd "$PROJECT_ROOT/mcp-server"
PYTHONPATH="$PROJECT_ROOT/mcp-server" TAILTOWN_ROOT="$PROJECT_ROOT" python3 server.py > "$PROJECT_ROOT/logs/mcp-server.log" 2>&1 &
echo $! > "$PROJECT_ROOT/logs/mcp-server.pid"
echo "   Started MCP Server with PID: $!"
cd "$PROJECT_ROOT"

# Wait for services to be ready
echo ""
echo -e "${BLUE}🔍 Checking Service Health...${NC}"

wait_for_service "http://localhost:4004/api/customers" "Customer Service"
wait_for_service "http://localhost:4003/health" "Reservation Service"
wait_for_service "http://localhost:3000" "Frontend"

# Check MCP Server
sleep 5
if pgrep -f "python3.*server.py" > /dev/null; then
    echo -e "${GREEN}✅ MCP Server is running!${NC}"
else
    echo -e "${RED}❌ MCP Server failed to start${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo "📍 Service URLs:"
echo "   Frontend:        http://localhost:3000"
echo "   Customer API:    http://localhost:4004"
echo "   Reservation API: http://localhost:4003"
if [ "$1" = "--with-payment" ]; then
    echo "   Payment API:     http://localhost:4005"
fi
echo ""
echo "📋 Logs:"
echo "   Customer Service:    logs/Customer Service.log"
echo "   Reservation Service: logs/Reservation Service.log"
echo "   Frontend:            logs/Frontend.log"
echo "   MCP Server:          logs/mcp-server.log"
echo ""
echo "🛑 To stop all services: ./scripts/stop-services.sh"
