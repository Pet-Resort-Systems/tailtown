#!/bin/bash

# Tailtown Database Manager
# Comprehensive database management for development and operations

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/database"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Database configuration
DB_CONTAINER="tailtown-postgres"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="customer"
DB_PORT="5433"

#############################################
# Helper Functions
#############################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not found${NC}"
        echo "Please install Docker to use database management tools"
        exit 1
    fi
}

check_container() {
    if ! docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
        echo -e "${RED}✗ Database container '$DB_CONTAINER' is not running${NC}"
        echo ""
        echo "Start the database with:"
        echo "  docker-compose up -d"
        exit 1
    fi
}

#############################################
# Database Status
#############################################

show_status() {
    print_header "Database Status"
    
    check_docker
    
    # Check containers
    echo -e "${CYAN}PostgreSQL Containers:${NC}"
    if docker ps --filter "name=tailtown" --format "{{.Names}}" | grep -q "tailtown"; then
        docker ps --filter "name=tailtown" --format "  ${GREEN}✓${NC} {{.Names}} - {{.Status}} - {{.Ports}}"
    else
        echo -e "  ${RED}✗ No containers running${NC}"
        echo ""
        echo "Start with: docker-compose up -d"
        return 1
    fi
    echo ""
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
        return 0
    fi
    
    # Database info
    echo -e "${CYAN}Database Information:${NC}"
    echo "  Container: $DB_CONTAINER"
    echo "  Database: $DB_NAME"
    echo "  Port: $DB_PORT"
    echo "  User: $DB_USER"
    echo ""
    
    # Database size
    echo -e "${CYAN}Database Size:${NC}"
    local size=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)
    if [ -n "$size" ]; then
        echo "  $size"
    else
        echo "  Unable to determine size"
    fi
    echo ""
    
    # Table counts
    echo -e "${CYAN}Table Row Counts:${NC}"
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "
        SELECT 
            schemaname || '.' || tablename as table,
            n_live_tup as rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
        LIMIT 10;
    " 2>/dev/null | while read line; do
        if [ -n "$line" ]; then
            echo "  $line"
        fi
    done
    echo ""
    
    # Recent backups
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l)
        echo -e "${CYAN}Backups:${NC}"
        echo "  Location: $BACKUP_DIR"
        echo "  Count: $backup_count"
        if [ $backup_count -gt 0 ]; then
            echo "  Latest: $(ls -t "$BACKUP_DIR" | head -1)"
        fi
    fi
    echo ""
}

#############################################
# Backup Operations
#############################################

create_backup() {
    print_header "Creating Database Backup"
    
    check_docker
    check_container
    
    mkdir -p "$BACKUP_DIR"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/tailtown_${timestamp}.sql"
    
    echo -e "${CYAN}Backing up database...${NC}"
    echo "  Database: $DB_NAME"
    echo "  File: $backup_file"
    echo ""
    
    # Create backup
    docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > "$backup_file"
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        echo -e "${GREEN}✅ Backup created successfully${NC}"
        echo "  Size: $size"
        echo "  Location: $backup_file"
        echo ""
        
        # Compress backup
        echo -e "${CYAN}Compressing backup...${NC}"
        gzip "$backup_file"
        local compressed_size=$(du -h "${backup_file}.gz" | cut -f1)
        echo -e "${GREEN}✓ Compressed${NC}"
        echo "  Size: $compressed_size"
        echo "  File: ${backup_file}.gz"
    else
        echo -e "${RED}✗ Backup failed${NC}"
        exit 1
    fi
    
    echo ""
}

list_backups() {
    print_header "Database Backups"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${YELLOW}No backups directory found${NC}"
        echo "Location: $BACKUP_DIR"
        return 0
    fi
    
    local backup_count=$(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l)
    
    if [ $backup_count -eq 0 ]; then
        echo -e "${YELLOW}No backups found${NC}"
        echo "Location: $BACKUP_DIR"
        echo ""
        echo "Create a backup with:"
        echo "  pnpm run db:backup"
        return 0
    fi
    
    echo -e "${CYAN}Found $backup_count backup(s):${NC}"
    echo ""
    
    ls -lht "$BACKUP_DIR" | tail -n +2 | while read -r line; do
        local size=$(echo "$line" | awk '{print $5}')
        local date=$(echo "$line" | awk '{print $6, $7, $8}')
        local file=$(echo "$line" | awk '{print $9}')
        echo "  $file"
        echo "    Size: $size"
        echo "    Date: $date"
        echo ""
    done
    
    echo -e "${CYAN}Location:${NC} $BACKUP_DIR"
    echo ""
}

restore_backup() {
    local backup_file=$1
    
    print_header "Restoring Database Backup"
    
    check_docker
    check_container
    
    if [ -z "$backup_file" ]; then
        echo -e "${RED}✗ No backup file specified${NC}"
        echo ""
        echo "Usage: $0 restore <backup-file>"
        echo ""
        echo "Available backups:"
        list_backups
        exit 1
    fi
    
    # Handle relative paths
    if [[ ! "$backup_file" = /* ]]; then
        backup_file="$BACKUP_DIR/$backup_file"
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}✗ Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${RED}⚠️  WARNING: This will REPLACE all data in the database${NC}"
    echo -e "${YELLOW}Database: $DB_NAME${NC}"
    echo -e "${YELLOW}Backup: $backup_file${NC}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${CYAN}Restoring database...${NC}"
    
    # Check if file is gzipped
    if [[ "$backup_file" == *.gz ]]; then
        echo "  Decompressing..."
        gunzip -c "$backup_file" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
    else
        docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Database restored successfully${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  You should restart services to pick up the changes:${NC}"
        echo "  pnpm run dev:restart"
    else
        echo -e "${RED}✗ Restore failed${NC}"
        exit 1
    fi
    
    echo ""
}

#############################################
# Database Reset & Seed
#############################################

reset_database() {
    print_header "Reset Database"
    
    check_docker
    check_container
    
    echo -e "${RED}⚠️  WARNING: This will DELETE all data${NC}"
    echo -e "${YELLOW}Database: $DB_NAME${NC}"
    echo ""
    echo "This will:"
    echo "  1. Drop all tables"
    echo "  2. Run Prisma migrations"
    echo "  3. Optionally seed with sample data"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${CYAN}Creating backup before reset...${NC}"
    create_backup
    
    echo -e "${CYAN}Resetting database...${NC}"
    
    # Reset customer service database
    echo "  Resetting customer service..."
    cd "$PROJECT_ROOT/apps/customer-service"
    pnpm exec prisma migrate reset --force --skip-seed
    
    # Reset reservation service database
    echo "  Resetting reservation service..."
    cd "$PROJECT_ROOT/apps/reservation-service"
    pnpm exec prisma migrate reset --force --skip-seed
    
    echo ""
    echo -e "${GREEN}✅ Database reset complete${NC}"
    echo ""
    
    # Ask about seeding
    read -p "Would you like to seed with sample data? (yes/no): " seed_confirm
    
    if [ "$seed_confirm" = "yes" ]; then
        seed_database
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  Restart services to pick up changes:${NC}"
    echo "  pnpm run dev:restart"
    echo ""
}

seed_database() {
    echo -e "${CYAN}Seeding database with sample data...${NC}"
    
    # Check for seed scripts
    if [ -f "$PROJECT_ROOT/apps/customer-service/prisma/seed.ts" ]; then
        echo "  Running customer service seed..."
        cd "$PROJECT_ROOT/apps/customer-service"
        pnpm exec prisma db seed
    fi
    
    if [ -f "$PROJECT_ROOT/apps/reservation-service/prisma/seed.ts" ]; then
        echo "  Running reservation service seed..."
        cd "$PROJECT_ROOT/apps/reservation-service"
        pnpm exec prisma db seed
    fi
    
    echo -e "${GREEN}✓ Seeding complete${NC}"
}

#############################################
# Migration Operations
#############################################

run_migrations() {
    print_header "Running Database Migrations"
    
    check_docker
    check_container
    
    echo -e "${CYAN}Running migrations...${NC}"
    echo ""
    
    # Customer service migrations
    echo "Customer Service:"
    cd "$PROJECT_ROOT/apps/customer-service"
    pnpm exec prisma migrate deploy
    pnpm exec prisma generate
    echo ""
    
    # Reservation service migrations
    echo "Reservation Service:"
    cd "$PROJECT_ROOT/apps/reservation-service"
    pnpm exec prisma migrate deploy
    pnpm exec prisma generate
    echo ""
    
    echo -e "${GREEN}✅ Migrations complete${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Restart services to pick up changes:${NC}"
    echo "  pnpm run dev:restart"
    echo ""
}

create_migration() {
    local migration_name=$1
    
    if [ -z "$migration_name" ]; then
        echo -e "${RED}✗ Migration name required${NC}"
        echo ""
        echo "Usage: $0 migrate:create <name>"
        echo "Example: $0 migrate:create add_user_table"
        exit 1
    fi
    
    print_header "Creating Migration: $migration_name"
    
    check_docker
    check_container
    
    echo "Which service?"
    echo "  1) Customer Service"
    echo "  2) Reservation Service"
    echo "  3) Both"
    read -p "Select (1-3): " service_choice
    
    echo ""
    
    case $service_choice in
        1)
            echo -e "${CYAN}Creating migration for customer service...${NC}"
            cd "$PROJECT_ROOT/apps/customer-service"
            pnpm exec prisma migrate dev --name "$migration_name"
            ;;
        2)
            echo -e "${CYAN}Creating migration for reservation service...${NC}"
            cd "$PROJECT_ROOT/apps/reservation-service"
            pnpm exec prisma migrate dev --name "$migration_name"
            ;;
        3)
            echo -e "${CYAN}Creating migration for customer service...${NC}"
            cd "$PROJECT_ROOT/apps/customer-service"
            pnpm exec prisma migrate dev --name "$migration_name"
            echo ""
            echo -e "${CYAN}Creating migration for reservation service...${NC}"
            cd "$PROJECT_ROOT/apps/reservation-service"
            pnpm exec prisma migrate dev --name "$migration_name"
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}✅ Migration created${NC}"
    echo ""
}

#############################################
# Database Console
#############################################

open_console() {
    print_header "Database Console"
    
    check_docker
    check_container
    
    echo -e "${CYAN}Opening PostgreSQL console...${NC}"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo ""
    echo -e "${YELLOW}Type 'exit' or press Ctrl+D to exit${NC}"
    echo ""
    
    docker exec -it $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
}

#############################################
# Main
#############################################

case "${1:-}" in
    status)
        show_status
        ;;
    backup)
        create_backup
        ;;
    backups|list)
        list_backups
        ;;
    restore)
        restore_backup "$2"
        ;;
    reset)
        reset_database
        ;;
    seed)
        seed_database
        ;;
    migrate)
        run_migrations
        ;;
    migrate:create)
        create_migration "$2"
        ;;
    console|psql)
        open_console
        ;;
    *)
        echo "Tailtown Database Manager"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  status           - Show database status and statistics"
        echo "  backup           - Create a database backup"
        echo "  backups, list    - List all backups"
        echo "  restore <file>   - Restore from backup"
        echo "  reset            - Reset database (drops all data)"
        echo "  seed             - Seed database with sample data"
        echo "  migrate          - Run pending migrations"
        echo "  migrate:create   - Create a new migration"
        echo "  console, psql    - Open PostgreSQL console"
        echo ""
        echo "npm shortcuts:"
        echo "  pnpm run db:status"
        echo "  pnpm run db:backup"
        echo "  pnpm run db:restore"
        echo "  pnpm run db:reset"
        echo "  pnpm run db:migrate"
        echo "  pnpm run db:console"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 backup"
        echo "  $0 restore tailtown_20251103_130000.sql.gz"
        echo "  $0 migrate:create add_new_field"
        exit 1
        ;;
esac
