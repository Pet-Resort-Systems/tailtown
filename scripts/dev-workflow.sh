#!/bin/bash

# Tailtown Development Workflow Manager
# Comprehensive script for managing development environment

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/.logs"
PIDS_DIR="$PROJECT_ROOT/.pids"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$LOGS_DIR" "$PIDS_DIR"

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

#############################################
# Pre-flight Checks
#############################################

preflight_checks() {
    echo -e "${BLUE}🔍 Running pre-flight checks...${NC}"
    echo ""
    
    local errors=0
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found${NC}"
        errors=$((errors + 1))
    else
        echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
    fi
    
    # Check npm
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}✗ pnpm not found${NC}"
        errors=$((errors + 1))
    else
        echo -e "${GREEN}✓ npm $(npm --version)${NC}"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠ Docker not found (optional)${NC}"
    else
        echo -e "${GREEN}✓ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1)${NC}"
    fi
    
    # Check PostgreSQL containers
    if docker ps --filter "name=tailtown" --format "{{.Names}}" | grep -q "tailtown"; then
        echo -e "${GREEN}✓ PostgreSQL containers running${NC}"
        docker ps --filter "name=tailtown" --format "  - {{.Names}} ({{.Status}})"
    else
        echo -e "${RED}✗ PostgreSQL containers not running${NC}"
        echo -e "${YELLOW}  Run: docker-compose up -d${NC}"
        errors=$((errors + 1))
    fi
    
    # Check .env files
    local env_files=(
        "apps/frontend/.env"
        "apps/customer-service/.env"
        "apps/reservation-service/.env"
    )
    
    for env_file in "${env_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$env_file" ]; then
            echo -e "${GREEN}✓ $env_file exists${NC}"
            
            # Validate apps/frontend .env points to localhost
            if [[ "$env_file" == "apps/frontend/.env" ]]; then
                if grep -Eq "129\.212\.178\.244|canicloud\.com" "$PROJECT_ROOT/$env_file"; then
                    echo -e "${RED}  ✗ Frontend .env points to production IP!${NC}"
                    echo -e "${YELLOW}  Should be: REACT_APP_API_URL=http://localhost:4004${NC}"
                    errors=$((errors + 1))
                fi
            fi
        else
            echo -e "${RED}✗ $env_file missing${NC}"
            errors=$((errors + 1))
        fi
    done
    
    # Check for zombie processes
    local zombie_count=$(ps aux | grep -E '(ts-node-dev|react-scripts)' | grep -v grep | wc -l)
    if [ "$zombie_count" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found $zombie_count existing processes${NC}"
        echo -e "${YELLOW}  Will clean up before starting${NC}"
    else
        echo -e "${GREEN}✓ No zombie processes${NC}"
    fi
    
    echo ""
    
    if [ $errors -gt 0 ]; then
        echo -e "${RED}❌ Pre-flight checks failed with $errors error(s)${NC}"
        return 1
    else
        echo -e "${GREEN}✅ All pre-flight checks passed${NC}"
        return 0
    fi
}

#############################################
# Service Management
#############################################

cleanup_zombies() {
    echo -e "${YELLOW}🧹 Cleaning up zombie processes...${NC}"
    pkill -9 -f "ts-node-dev" 2>/dev/null || true
    pkill -9 -f "react-scripts" 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    echo ""
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=0
    
    echo -n "  Waiting for $name to be ready"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e " ${RED}✗ (timeout)${NC}"
    return 1
}

start_services() {
    echo -e "${BLUE}🚀 Starting Tailtown Development Servers...${NC}"
    echo ""
    
    # Run pre-flight checks
    if ! preflight_checks; then
        echo ""
        echo -e "${RED}Cannot start services due to pre-flight check failures${NC}"
        exit 1
    fi
    
    echo ""
    cleanup_zombies
    
    # Start customer service
    echo -e "${BLUE}Starting Customer Service (port 4004)...${NC}"
    cd "$PROJECT_ROOT/apps/customer-service"
    PORT=4004 pnpm run dev > "$LOGS_DIR/customer-service.log" 2>&1 &
    CUSTOMER_PID=$!
    echo $CUSTOMER_PID > "$PIDS_DIR/customer.pid"
    echo "  PID: $CUSTOMER_PID"
    wait_for_service "Customer Service" "http://localhost:4004/health"
    
    # Start reservation service
    echo -e "${BLUE}Starting Reservation Service (port 4003)...${NC}"
    cd "$PROJECT_ROOT/apps/reservation-service"
    PORT=4003 pnpm run dev > "$LOGS_DIR/reservation-service.log" 2>&1 &
    RESERVATION_PID=$!
    echo $RESERVATION_PID > "$PIDS_DIR/reservation.pid"
    echo "  PID: $RESERVATION_PID"
    wait_for_service "Reservation Service" "http://localhost:4003/health"
    
    # Start apps/frontend
    echo -e "${BLUE}Starting Frontend (port 3000)...${NC}"
    cd "$PROJECT_ROOT/apps/frontend"
    pnpm start > "$LOGS_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PIDS_DIR/frontend.pid"
    echo "  PID: $FRONTEND_PID"
    echo "  (Frontend takes ~15-30 seconds to compile)"
    
    echo ""
    echo -e "${GREEN}✅ All servers started!${NC}"
    echo ""
    echo -e "${BLUE}Services:${NC}"
    echo "  Customer Service:    http://localhost:4004 (PID: $CUSTOMER_PID)"
    echo "  Reservation Service: http://localhost:4003 (PID: $RESERVATION_PID)"
    echo "  Frontend:            http://localhost:3000 (PID: $FRONTEND_PID)"
    echo ""
    echo -e "${BLUE}Logs:${NC}"
    echo "  tail -f $LOGS_DIR/customer-service.log"
    echo "  tail -f $LOGS_DIR/reservation-service.log"
    echo "  tail -f $LOGS_DIR/frontend.log"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  pnpm run dev:stop     - Stop all services"
    echo "  pnpm run dev:status   - Check service status"
    echo "  pnpm run dev:logs     - View all logs"
    echo "  pnpm run health:check - Check service health"
    echo ""
}

stop_services() {
    echo -e "${YELLOW}🛑 Stopping Tailtown Development Servers...${NC}"
    echo ""
    
    local stopped=0
    
    # Stop services using PID files
    for service in customer reservation frontend; do
        if [ -f "$PIDS_DIR/$service.pid" ]; then
            local pid=$(cat "$PIDS_DIR/$service.pid")
            if kill -0 $pid 2>/dev/null; then
                echo "Stopping $service (PID: $pid)..."
                kill $pid 2>/dev/null || true
                stopped=$((stopped + 1))
            fi
            rm -f "$PIDS_DIR/$service.pid"
        fi
    done
    
    # Fallback: kill by process name
    cleanup_zombies
    
    echo ""
    if [ $stopped -gt 0 ]; then
        echo -e "${GREEN}✅ Stopped $stopped service(s)${NC}"
    else
        echo -e "${YELLOW}No services were running${NC}"
    fi
}

status_services() {
    echo -e "${BLUE}📊 Tailtown Service Status${NC}"
    echo ""
    
    # Check each service
    local services=(
        "Customer Service:4004:customer"
        "Reservation Service:4003:reservation"
        "Frontend:3000:apps/frontend"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name port pid_name <<< "$service_info"
        
        echo -n "$name (port $port): "
        
        if check_port $port; then
            echo -e "${GREEN}✓ Running${NC}"
            
            # Show PID if available
            if [ -f "$PIDS_DIR/$pid_name.pid" ]; then
                local pid=$(cat "$PIDS_DIR/$pid_name.pid")
                echo "  PID: $pid"
            fi
            
            # Check health endpoint for backend services
            if [[ "$port" != "3000" ]]; then
                local health_url="http://localhost:$port/health"
                if curl -s "$health_url" > /dev/null 2>&1; then
                    echo -e "  Health: ${GREEN}✓ OK${NC}"
                else
                    echo -e "  Health: ${RED}✗ Failed${NC}"
                fi
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
        fi
        echo ""
    done
    
    # Check databases
    echo "PostgreSQL Databases:"
    if docker ps --filter "name=tailtown" --format "{{.Names}}" | grep -q "tailtown"; then
        docker ps --filter "name=tailtown" --format "  ${GREEN}✓${NC} {{.Names}} ({{.Status}})"
    else
        echo -e "  ${RED}✗ No containers running${NC}"
    fi
    echo ""
}

restart_services() {
    stop_services
    echo ""
    sleep 2
    start_services
}

show_logs() {
    echo -e "${BLUE}📋 Showing logs (Ctrl+C to exit)...${NC}"
    echo ""
    
    if [ -f "$LOGS_DIR/customer-service.log" ] || \
       [ -f "$LOGS_DIR/reservation-service.log" ] || \
       [ -f "$LOGS_DIR/apps/frontend.log" ]; then
        tail -f "$LOGS_DIR"/*.log 2>/dev/null
    else
        echo -e "${YELLOW}No log files found${NC}"
        echo "Logs will be created when services start"
    fi
}

#############################################
# Main
#############################################

case "${1:-}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        status_services
        ;;
    logs)
        show_logs
        ;;
    check|preflight)
        preflight_checks
        ;;
    cleanup)
        cleanup_zombies
        ;;
    *)
        echo "Tailtown Development Workflow Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|check|cleanup}"
        echo ""
        echo "Commands:"
        echo "  start     - Start all development services"
        echo "  stop      - Stop all development services"
        echo "  restart   - Restart all services"
        echo "  status    - Show service status"
        echo "  logs      - Show live logs"
        echo "  check     - Run pre-flight checks"
        echo "  cleanup   - Clean up zombie processes"
        echo ""
        echo "npm shortcuts:"
        echo "  pnpm run dev:start"
        echo "  pnpm run dev:stop"
        echo "  pnpm run dev:restart"
        echo "  pnpm run dev:status"
        echo "  pnpm run dev:logs"
        exit 1
        ;;
esac
