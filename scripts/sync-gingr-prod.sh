#!/bin/bash

# Gingr Sync Helper Script - Production Version
# Works in both local and Digital Ocean environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_msg() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Detect environment
detect_environment() {
    if [ -f "/.dockerenv" ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
        echo "docker"
    elif command -v docker &> /dev/null && docker ps &> /dev/null; then
        echo "local"
    else
        echo "production"
    fi
}

ENV_TYPE=$(detect_environment)

# Database connection based on environment
get_db_connection() {
    if [ "$ENV_TYPE" = "docker" ]; then
        # Running inside Docker container
        echo "postgresql://\${POSTGRES_USER:-postgres}:\${POSTGRES_PASSWORD}@postgres:5432/customer"
    elif [ "$ENV_TYPE" = "local" ]; then
        # Local development with Docker
        echo "postgresql://postgres:postgres@localhost:5433/customer"
    else
        # Production (use DATABASE_URL from env)
        echo "${DATABASE_URL}"
    fi
}

# Execute SQL based on environment
execute_sql() {
    local sql_file=$1
    
    if [ "$ENV_TYPE" = "local" ]; then
        docker exec -i tailtown-postgres psql -U postgres -d customer < "$sql_file"
    elif [ "$ENV_TYPE" = "docker" ]; then
        psql "${DATABASE_URL}" < "$sql_file"
    else
        # Production - connect to managed database
        psql "${DATABASE_URL}" < "$sql_file"
    fi
}

show_usage() {
    echo "Gingr Sync Helper (Production-Ready)"
    echo ""
    echo "Usage: ./scripts/sync-gingr-prod.sh [command]"
    echo ""
    echo "Commands:"
    echo "  sync          - Sync reservations from Gingr"
    echo "  validate      - Check for overlapping reservations"
    echo "  fix-overlaps  - Fix any overlapping reservations"
    echo "  status        - Show sync status and statistics"
    echo "  help          - Show this help message"
    echo ""
    echo "Environment: $ENV_TYPE"
}

sync_reservations() {
    print_msg "Syncing reservations from Gingr..."
    
    # Load customer-service environment variables if available
    if [ -f "apps/customer-service/.env" ]; then
        export $(grep -v '^#' apps/customer-service/.env | xargs)
    fi
    
    node scripts/sync-gingr-reservations-prod.mjs
    print_success "Reservation sync complete!"
}

validate_overlaps() {
    print_msg "Checking for overlapping reservations..."
    execute_sql scripts/validate-no-overlaps.sql
}

fix_overlaps() {
    print_msg "Fixing overlapping reservations..."
    execute_sql scripts/fix-overlapping-reservations.sql
    print_success "Overlaps fixed!"
    
    print_msg "Validating..."
    validate_overlaps
}

show_status() {
    print_msg "Fetching sync status..."
    echo ""
    
    local db_conn=$(get_db_connection)
    
    if [ "$ENV_TYPE" = "local" ]; then
        docker exec tailtown-postgres psql -U postgres -d customer << 'EOF'
\echo '📊 SYNC STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '📅 Last Sync:'
SELECT 
  MAX("updatedAt") as last_sync_time,
  COUNT(*) as total_synced
FROM reservations
WHERE "externalId" IS NOT NULL;

\echo ''
\echo '📈 By Status:'
SELECT status, COUNT(*) as count
FROM reservations
WHERE "externalId" IS NOT NULL
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '🏠 Suite Distribution:'
SELECT 
  SUBSTRING(res.name, 1, 1) as room_type,
  COUNT(*) as count
FROM reservations r
JOIN resources res ON r."resourceId" = res.id
WHERE r.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
GROUP BY SUBSTRING(res.name, 1, 1)
ORDER BY room_type;

\echo ''
\echo '⚠️  Overlaps:'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No overlaps'
    ELSE '❌ ' || COUNT(*) || ' overlaps found'
  END as status
FROM (
  SELECT r1.id
  FROM reservations r1
  JOIN reservations r2 ON r1."resourceId" = r2."resourceId" AND r1.id < r2.id
  WHERE r1.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
    AND r2.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
    AND r1."startDate" < r2."endDate"
    AND r1."endDate" > r2."startDate"
) overlaps;
EOF
    else
        # Production - use psql with connection string
        psql "${DATABASE_URL}" << 'EOF'
\echo '📊 SYNC STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '📅 Last Sync:'
SELECT 
  MAX("updatedAt") as last_sync_time,
  COUNT(*) as total_synced
FROM reservations
WHERE "externalId" IS NOT NULL;

\echo ''
\echo '📈 By Status:'
SELECT status, COUNT(*) as count
FROM reservations
WHERE "externalId" IS NOT NULL
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '🏠 Suite Distribution:'
SELECT 
  SUBSTRING(res.name, 1, 1) as room_type,
  COUNT(*) as count
FROM reservations r
JOIN resources res ON r."resourceId" = res.id
WHERE r.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
GROUP BY SUBSTRING(res.name, 1, 1)
ORDER BY room_type;

\echo ''
\echo '⚠️  Overlaps:'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No overlaps'
    ELSE '❌ ' || COUNT(*) || ' overlaps found'
  END as status
FROM (
  SELECT r1.id
  FROM reservations r1
  JOIN reservations r2 ON r1."resourceId" = r2."resourceId" AND r1.id < r2.id
  WHERE r1.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
    AND r2.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
    AND r1."startDate" < r2."endDate"
    AND r1."endDate" > r2."startDate"
) overlaps;
EOF
    fi
}

# Main command handler
case "${1:-help}" in
    sync)
        sync_reservations
        ;;
    validate)
        validate_overlaps
        ;;
    fix-overlaps)
        fix_overlaps
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
