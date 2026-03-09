#!/bin/bash

# Teardown Test Database Script
# Drops the test database

set -e

echo "🧹 Tearing down test database..."

# Database configuration
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="customer_test"

echo "📊 Database: ${DB_NAME}"

# Drop test database
echo "🗑️  Dropping test database..."
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true

echo "✅ Test database teardown complete!"
