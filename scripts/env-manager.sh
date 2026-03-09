#!/bin/bash

# Tailtown Environment Manager
# Safely switch between development and production configurations

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#############################################
# Environment Configurations
#############################################

# Development (localhost)
DEV_FRONTEND_API_URL="http://localhost:4004"
DEV_FRONTEND_RESERVATION_API_URL="http://localhost:4003"
DEV_BACKEND_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/customer"
DEV_CUSTOMER_PORT="4004"
DEV_RESERVATION_PORT="4003"
DEV_NODE_ENV="development"

# Production (Digital Ocean)
PROD_FRONTEND_API_URL="http://129.212.178.244:4004"
PROD_FRONTEND_RESERVATION_API_URL="http://129.212.178.244:4003"
PROD_BACKEND_DATABASE_URL="postgresql://postgres:TailtownSecure2025ProductionDB@localhost:5432/customer"
PROD_CUSTOMER_PORT="4004"
PROD_RESERVATION_PORT="4003"
PROD_NODE_ENV="production"

# Common settings
TENANT_ID="dev"

#############################################
# Helper Functions
#############################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

detect_current_env() {
    if [ -f "$PROJECT_ROOT/apps/frontend/.env" ]; then
        local api_url=$(grep "REACT_APP_API_URL" "$PROJECT_ROOT/apps/frontend/.env" | cut -d'=' -f2)
        if [[ "$api_url" == *"localhost"* ]]; then
            echo "development"
        elif [[ "$api_url" == *"129.212.178.244"* ]]; then
            echo "production"
        else
            echo "unknown"
        fi
    else
        echo "none"
    fi
}

show_status() {
    print_header "Environment Status"
    
    local current_env=$(detect_current_env)
    
    echo -e "${CYAN}Current Environment:${NC}"
    case $current_env in
        development)
            echo -e "  ${GREEN}✓ Development (localhost)${NC}"
            ;;
        production)
            echo -e "  ${YELLOW}⚠ Production (Digital Ocean)${NC}"
            ;;
        unknown)
            echo -e "  ${RED}✗ Unknown configuration${NC}"
            ;;
        none)
            echo -e "  ${RED}✗ No configuration found${NC}"
            ;;
    esac
    echo ""
    
    echo -e "${CYAN}Configuration Files:${NC}"
    
    # Frontend
    if [ -f "$PROJECT_ROOT/apps/frontend/.env" ]; then
        echo -e "  ${GREEN}✓${NC} apps/frontend/.env"
        echo "    API URL: $(grep REACT_APP_API_URL apps/frontend/.env | cut -d'=' -f2)"
        echo "    Reservation API: $(grep REACT_APP_RESERVATION_API_URL apps/frontend/.env | cut -d'=' -f2 2>/dev/null || echo 'not set')"
    else
        echo -e "  ${RED}✗${NC} apps/frontend/.env (missing)"
    fi
    
    # Customer Service
    if [ -f "$PROJECT_ROOT/apps/customer-service/.env" ]; then
        echo -e "  ${GREEN}✓${NC} apps/customer-service/.env"
        echo "    Port: $(grep ^PORT apps/customer-service/.env | cut -d'=' -f2)"
        echo "    Node Env: $(grep NODE_ENV apps/customer-service/.env | cut -d'=' -f2)"
    else
        echo -e "  ${RED}✗${NC} apps/customer-service/.env (missing)"
    fi
    
    # Reservation Service
    if [ -f "$PROJECT_ROOT/apps/reservation-service/.env" ]; then
        echo -e "  ${GREEN}✓${NC} apps/reservation-service/.env"
        echo "    Port: $(grep ^PORT apps/reservation-service/.env | cut -d'=' -f2)"
        echo "    Node Env: $(grep NODE_ENV apps/reservation-service/.env | cut -d'=' -f2)"
    else
        echo -e "  ${RED}✗${NC} apps/reservation-service/.env (missing)"
    fi
    
    echo ""
    
    # Check if services are running
    echo -e "${CYAN}Running Services:${NC}"
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Frontend (port 3000)"
    else
        echo -e "  ${YELLOW}○${NC} Frontend (not running)"
    fi
    
    if lsof -Pi :4004 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Customer Service (port 4004)"
    else
        echo -e "  ${YELLOW}○${NC} Customer Service (not running)"
    fi
    
    if lsof -Pi :4003 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Reservation Service (port 4003)"
    else
        echo -e "  ${YELLOW}○${NC} Reservation Service (not running)"
    fi
    
    echo ""
}

backup_env_files() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$PROJECT_ROOT/.env-backups"
    
    mkdir -p "$backup_dir"
    
    echo -e "${CYAN}Creating backup...${NC}"
    
    if [ -f "$PROJECT_ROOT/apps/frontend/.env" ]; then
        cp "$PROJECT_ROOT/apps/frontend/.env" "$backup_dir/apps/frontend.env.$timestamp"
        echo -e "  ${GREEN}✓${NC} Backed up apps/frontend/.env"
    fi
    
    if [ -f "$PROJECT_ROOT/apps/customer-service/.env" ]; then
        cp "$PROJECT_ROOT/apps/customer-service/.env" "$backup_dir/customer.env.$timestamp"
        echo -e "  ${GREEN}✓${NC} Backed up apps/customer-service/.env"
    fi
    
    if [ -f "$PROJECT_ROOT/apps/reservation-service/.env" ]; then
        cp "$PROJECT_ROOT/apps/reservation-service/.env" "$backup_dir/reservation.env.$timestamp"
        echo -e "  ${GREEN}✓${NC} Backed up apps/reservation-service/.env"
    fi
    
    echo ""
}

write_frontend_env() {
    local env=$1
    local api_url=$2
    local reservation_api_url=$3
    
    cat > "$PROJECT_ROOT/apps/frontend/.env" << EOF
REACT_APP_TENANT_ID=$TENANT_ID
REACT_APP_API_URL=$api_url
REACT_APP_RESERVATION_API_URL=$reservation_api_url
EOF
}

write_backend_env() {
    local service_path=$1
    local env=$2
    local database_url=$3
    local port=$4
    local node_env=$5
    
    cat > "$service_path/.env" << EOF
DATABASE_URL="$database_url"
PORT=$port
NODE_ENV=$node_env
CUSTOMER_SERVICE_URL="http://localhost:4004/health"
EOF
}

switch_to_dev() {
    print_header "Switching to Development Environment"
    
    local current_env=$(detect_current_env)
    
    if [ "$current_env" = "development" ]; then
        echo -e "${YELLOW}Already in development environment${NC}"
        echo ""
        show_status
        return 0
    fi
    
    # Backup current configuration
    backup_env_files
    
    # Write new configuration
    echo -e "${CYAN}Writing development configuration...${NC}"
    
    write_frontend_env "development" "$DEV_FRONTEND_API_URL" "$DEV_FRONTEND_RESERVATION_API_URL"
    echo -e "  ${GREEN}✓${NC} Updated apps/frontend/.env"
    
    write_backend_env "$PROJECT_ROOT/apps/customer-service" "development" "$DEV_BACKEND_DATABASE_URL" "$DEV_CUSTOMER_PORT" "$DEV_NODE_ENV"
    echo -e "  ${GREEN}✓${NC} Updated apps/customer-service/.env"
    
    write_backend_env "$PROJECT_ROOT/apps/reservation-service" "development" "$DEV_BACKEND_DATABASE_URL" "$DEV_RESERVATION_PORT" "$DEV_NODE_ENV"
    echo -e "  ${GREEN}✓${NC} Updated apps/reservation-service/.env"
    
    echo ""
    echo -e "${GREEN}✅ Switched to development environment${NC}"
    echo ""
    
    # Check if services are running
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 || \
       lsof -Pi :4004 -sTCP:LISTEN -t >/dev/null 2>&1 || \
       lsof -Pi :4003 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Services are currently running${NC}"
        echo -e "${YELLOW}  You should restart them to apply the new configuration:${NC}"
        echo ""
        echo -e "  ${CYAN}pnpm run dev:restart${NC}"
        echo ""
    fi
    
    show_status
}

switch_to_prod() {
    print_header "Switching to Production Environment"
    
    local current_env=$(detect_current_env)
    
    if [ "$current_env" = "production" ]; then
        echo -e "${YELLOW}Already in production environment${NC}"
        echo ""
        show_status
        return 0
    fi
    
    # Warning
    echo -e "${RED}⚠️  WARNING: Switching to PRODUCTION configuration${NC}"
    echo -e "${YELLOW}This will point your local environment to the production server.${NC}"
    echo ""
    echo -e "Production server: ${CYAN}129.212.178.244${NC}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        return 1
    fi
    
    echo ""
    
    # Backup current configuration
    backup_env_files
    
    # Write new configuration
    echo -e "${CYAN}Writing production configuration...${NC}"
    
    write_frontend_env "production" "$PROD_FRONTEND_API_URL" "$PROD_FRONTEND_RESERVATION_API_URL"
    echo -e "  ${GREEN}✓${NC} Updated apps/frontend/.env"
    
    write_backend_env "$PROJECT_ROOT/apps/customer-service" "production" "$PROD_BACKEND_DATABASE_URL" "$PROD_CUSTOMER_PORT" "$PROD_NODE_ENV"
    echo -e "  ${GREEN}✓${NC} Updated apps/customer-service/.env"
    
    write_backend_env "$PROJECT_ROOT/apps/reservation-service" "production" "$PROD_BACKEND_DATABASE_URL" "$PROD_RESERVATION_PORT" "$PROD_NODE_ENV"
    echo -e "  ${GREEN}✓${NC} Updated apps/reservation-service/.env"
    
    echo ""
    echo -e "${GREEN}✅ Switched to production environment${NC}"
    echo ""
    
    # Check if services are running
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 || \
       lsof -Pi :4004 -sTCP:LISTEN -t >/dev/null 2>&1 || \
       lsof -Pi :4003 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Services are currently running${NC}"
        echo -e "${YELLOW}  You should restart them to apply the new configuration:${NC}"
        echo ""
        echo -e "  ${CYAN}pnpm run dev:restart${NC}"
        echo ""
    fi
    
    show_status
}

list_backups() {
    print_header "Environment Backups"
    
    local backup_dir="$PROJECT_ROOT/.env-backups"
    
    if [ ! -d "$backup_dir" ]; then
        echo -e "${YELLOW}No backups found${NC}"
        return 0
    fi
    
    local backup_count=$(ls -1 "$backup_dir" 2>/dev/null | wc -l)
    
    if [ "$backup_count" -eq 0 ]; then
        echo -e "${YELLOW}No backups found${NC}"
        return 0
    fi
    
    echo -e "${CYAN}Found $backup_count backup file(s):${NC}"
    echo ""
    
    ls -lht "$backup_dir" | tail -n +2 | while read -r line; do
        local file=$(echo "$line" | awk '{print $9}')
        local date=$(echo "$line" | awk '{print $6, $7, $8}')
        echo "  $file ($date)"
    done
    
    echo ""
    echo -e "${CYAN}Backup location:${NC} $backup_dir"
    echo ""
}

#############################################
# Main
#############################################

case "${1:-}" in
    dev|development)
        switch_to_dev
        ;;
    prod|production)
        switch_to_prod
        ;;
    status)
        show_status
        ;;
    backups)
        list_backups
        ;;
    *)
        echo "Tailtown Environment Manager"
        echo ""
        echo "Usage: $0 {dev|prod|status|backups}"
        echo ""
        echo "Commands:"
        echo "  dev, development  - Switch to development environment (localhost)"
        echo "  prod, production  - Switch to production environment (Digital Ocean)"
        echo "  status           - Show current environment configuration"
        echo "  backups          - List environment backups"
        echo ""
        echo "npm shortcuts:"
        echo "  pnpm run env:dev"
        echo "  pnpm run env:prod"
        echo "  pnpm run env:status"
        echo "  pnpm run env:backups"
        echo ""
        echo "Current environment: $(detect_current_env)"
        exit 1
        ;;
esac
