#!/bin/bash

# Tailtown Service Stop Script
# Gracefully stops all Tailtown services

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

echo -e "${BLUE}🛑 Stopping Tailtown Services${NC}"
echo "================================="

# Function to stop service by PID file
stop_service() {
    local service_name=$1
    local pid_file="$PROJECT_ROOT/logs/$service_name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}⏹️  Stopping $service_name (PID: $pid)...${NC}"
            kill "$pid"
            
            # Wait for graceful shutdown
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                ((count++))
            done
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}   Force killing $service_name...${NC}"
                kill -9 "$pid"
            fi
            
            echo -e "${GREEN}   ✅ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}   ⚠️  $service_name was not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}   ⚠️  No PID file found for $service_name${NC}"
    fi
}

# Function to force kill all related processes
force_cleanup() {
    echo -e "${BLUE}🧹 Force cleaning up any remaining processes...${NC}"
    
    # Kill Node.js processes related to Tailtown
    pkill -f "ts-node-dev.*tailtown" 2>/dev/null || true
    pkill -f "react-scripts.*tailtown" 2>/dev/null || true
    pkill -f "craco.*tailtown" 2>/dev/null || true
    
    
    echo -e "${GREEN}   ✅ Force cleanup completed${NC}"
}

# Stop services gracefully
stop_service "Customer Service"
stop_service "Reservation Service"
stop_service "Payment Service"
stop_service "Frontend"

# Force cleanup any remaining processes
force_cleanup

# Clean up log files
echo -e "${BLUE}🧹 Cleaning up log files...${NC}"
rm -f logs/*.pid
echo -e "${GREEN}   ✅ Log files cleaned${NC}"

echo ""
echo -e "${GREEN}✅ All Tailtown services stopped!${NC}"

# Verify no processes are running
echo ""
echo -e "${BLUE}🔍 Verifying cleanup...${NC}"

remaining_processes=$(ps aux | grep -E "(npm|node)" | grep -E "(tailtown|customer|reservation|payment|admin)" | grep -v grep | wc -l)
if [ "$remaining_processes" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $remaining_processes remaining processes${NC}"
    echo "Run 'ps aux | grep tailtown' to see remaining processes"
else
    echo -e "${GREEN}✅ No remaining Tailtown processes found${NC}"
fi

