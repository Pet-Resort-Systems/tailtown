#!/bin/bash

# Tailtown Development Server Manager
# Prevents zombie processes and provides clean server lifecycle management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# PID file locations
PIDS_DIR="$PROJECT_ROOT/.pids"
CUSTOMER_PID="$PIDS_DIR/customer-service.pid"
RESERVATION_PID="$PIDS_DIR/reservation-service.pid"
FRONTEND_PID="$PIDS_DIR/frontend.pid"
ADMIN_PID="$PIDS_DIR/admin-portal.pid"

# Log file locations
LOGS_DIR="$PROJECT_ROOT/.logs"
CUSTOMER_LOG="$LOGS_DIR/customer-service.log"
RESERVATION_LOG="$LOGS_DIR/reservation-service.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"
ADMIN_LOG="$LOGS_DIR/admin-portal.log"

# Create directories if they don't exist
mkdir -p "$PIDS_DIR" "$LOGS_DIR"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Function to kill zombie processes
kill_zombies() {
    print_info "Checking for zombie processes..."
    
    local zombie_count=0
    
    # Kill ts-node-dev processes
    if pgrep -f "ts-node-dev" > /dev/null; then
        print_warning "Found zombie ts-node-dev processes"
        pkill -9 -f "ts-node-dev" 2>/dev/null || true
        zombie_count=$((zombie_count + $(pgrep -f "ts-node-dev" 2>/dev/null | wc -l)))
    fi
    
    # Kill react-scripts processes
    if pgrep -f "react-scripts" > /dev/null; then
        print_warning "Found zombie react-scripts processes"
        pkill -9 -f "react-scripts" 2>/dev/null || true
        zombie_count=$((zombie_count + $(pgrep -f "react-scripts" 2>/dev/null | wc -l)))
    fi
    
    # Kill node processes on our ports
    for port in 3000 3001 4003 4004; do
        local pid=$(lsof -ti :$port 2>/dev/null || true)
        if [ ! -z "$pid" ]; then
            print_warning "Killing process on port $port (PID: $pid)"
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
    
    # Clean up stale PID files
    rm -f "$PIDS_DIR"/*.pid
    
    if [ $zombie_count -gt 0 ]; then
        print_success "Cleaned up zombie processes"
    else
        print_success "No zombie processes found"
    fi
    
    sleep 2
}

# Function to start a service
start_service() {
    local service_name=$1
    local service_dir=$2
    local pid_file=$3
    local log_file=$4
    local port=$5
    local start_command=$6
    
    if is_running "$pid_file"; then
        print_warning "$service_name is already running (PID: $(cat $pid_file))"
        return 0
    fi
    
    print_info "Starting $service_name on port $port..."
    
    cd "$PROJECT_ROOT/$service_dir"
    
    # Source nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Start the service in background
    PORT=$port nohup $start_command > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    echo $pid > "$pid_file"
    
    # Wait a moment and check if it started
    sleep 3
    
    if is_running "$pid_file"; then
        print_success "$service_name started successfully (PID: $pid)"
        return 0
    else
        print_error "$service_name failed to start. Check $log_file for details."
        return 1
    fi
}

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file=$2
    
    if ! is_running "$pid_file"; then
        print_warning "$service_name is not running"
        rm -f "$pid_file"
        return 0
    fi
    
    local pid=$(cat "$pid_file")
    print_info "Stopping $service_name (PID: $pid)..."
    
    # Try graceful shutdown first
    kill "$pid" 2>/dev/null || true
    
    # Wait up to 10 seconds for graceful shutdown
    for i in {1..10}; do
        if ! ps -p "$pid" > /dev/null 2>&1; then
            print_success "$service_name stopped"
            rm -f "$pid_file"
            return 0
        fi
        sleep 1
    done
    
    # Force kill if still running
    print_warning "Force killing $service_name..."
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$pid_file"
    print_success "$service_name stopped"
}

# Function to show status
show_status() {
    echo ""
    echo "=== Tailtown Development Servers Status ==="
    echo ""
    
    local all_running=true
    
    # Check each service
    if is_running "$CUSTOMER_PID"; then
        print_success "Customer Service (port 4004): RUNNING (PID: $(cat $CUSTOMER_PID))"
    else
        print_error "Customer Service (port 4004): STOPPED"
        all_running=false
    fi
    
    if is_running "$RESERVATION_PID"; then
        print_success "Reservation Service (port 4003): RUNNING (PID: $(cat $RESERVATION_PID))"
    else
        print_error "Reservation Service (port 4003): STOPPED"
        all_running=false
    fi
    
    if is_running "$FRONTEND_PID"; then
        print_success "Frontend (port 3000): RUNNING (PID: $(cat $FRONTEND_PID))"
    else
        print_error "Frontend (port 3000): STOPPED"
        all_running=false
    fi
    
    if is_running "$ADMIN_PID"; then
        print_success "Admin Portal (port 3001): RUNNING (PID: $(cat $ADMIN_PID))"
    else
        print_warning "Admin Portal (port 3001): STOPPED (optional)"
    fi
    
    echo ""
    
    # Check for zombie processes
    local zombie_count=$(pgrep -f "ts-node-dev|react-scripts" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$zombie_count" -gt 0 ]; then
        print_warning "Found $zombie_count potential zombie processes"
        echo "  Run: $0 cleanup"
    fi
    
    echo ""
    
    if $all_running; then
        return 0
    else
        return 1
    fi
}

# Function to start all services
start_all() {
    print_info "Starting all Tailtown development servers..."
    echo ""
    
    # First, clean up any zombies
    kill_zombies
    
    # Start backend services first
    start_service "Customer Service" "apps/customer-service" "$CUSTOMER_PID" "$CUSTOMER_LOG" 4004 "pnpm run dev"
    start_service "Reservation Service" "apps/reservation-service" "$RESERVATION_PID" "$RESERVATION_LOG" 4003 "pnpm run dev"
    
    # Then start apps/frontend
    start_service "Frontend" "apps/frontend" "$FRONTEND_PID" "$FRONTEND_LOG" 3000 "pnpm start"
    
    # Optionally start admin portal
    if [ -d "$PROJECT_ROOT/admin-portal" ]; then
        start_service "Admin Portal" "admin-portal" "$ADMIN_PID" "$ADMIN_LOG" 3001 "pnpm start"
    fi
    
    echo ""
    show_status
}

# Function to stop all services
stop_all() {
    print_info "Stopping all Tailtown development servers..."
    echo ""
    
    stop_service "Admin Portal" "$ADMIN_PID"
    stop_service "Frontend" "$FRONTEND_PID"
    stop_service "Reservation Service" "$RESERVATION_PID"
    stop_service "Customer Service" "$CUSTOMER_PID"
    
    # Final cleanup
    kill_zombies
    
    echo ""
    print_success "All services stopped"
}

# Function to restart all services
restart_all() {
    print_info "Restarting all Tailtown development servers..."
    stop_all
    sleep 2
    start_all
}

# Function to show logs
show_logs() {
    local service=$1
    
    case $service in
        customer)
            tail -f "$CUSTOMER_LOG"
            ;;
        reservation)
            tail -f "$RESERVATION_LOG"
            ;;
        frontend)
            tail -f "$FRONTEND_LOG"
            ;;
        admin)
            tail -f "$ADMIN_LOG"
            ;;
        all)
            tail -f "$CUSTOMER_LOG" "$RESERVATION_LOG" "$FRONTEND_LOG" "$ADMIN_LOG"
            ;;
        *)
            print_error "Unknown service: $service"
            echo "Available services: customer, reservation, frontend, admin, all"
            exit 1
            ;;
    esac
}

# Main command handler
case "${1:-}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        show_status
        ;;
    cleanup)
        kill_zombies
        ;;
    logs)
        show_logs "${2:-all}"
        ;;
    *)
        echo "Tailtown Development Server Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|cleanup|logs}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all development servers"
        echo "  stop     - Stop all development servers"
        echo "  restart  - Restart all development servers"
        echo "  status   - Show status of all servers"
        echo "  cleanup  - Kill zombie processes and clean up"
        echo "  logs     - Show logs (usage: logs [customer|reservation|frontend|admin|all])"
        echo ""
        exit 1
        ;;
esac
