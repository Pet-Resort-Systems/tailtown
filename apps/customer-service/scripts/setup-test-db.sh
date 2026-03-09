#!/bin/bash

# Setup Test Database Script
# Creates a test database and runs migrations

set -e

echo "🔧 Setting up test database..."

# Database configuration
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="customer_test"

# Set the test database URL
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "📊 Database: ${DB_NAME}"
echo "🔌 Host: ${DB_HOST}:${DB_PORT}"

# Check if PostgreSQL is running (try Docker first, then native)
if docker ps | grep -q "tailtown-postgres"; then
  echo "✅ PostgreSQL is running (Docker)"
  PGPASSWORD=${DB_PASSWORD} docker exec tailtown-postgres psql -U ${DB_USER} -c '\q' > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to PostgreSQL"
    exit 1
  fi
elif command -v pg_isready &> /dev/null; then
  if ! pg_isready -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on ${DB_HOST}:${DB_PORT}"
    echo "   Please start PostgreSQL first"
    exit 1
  fi
  echo "✅ PostgreSQL is running"
else
  echo "⚠️  Cannot verify PostgreSQL status (pg_isready not found)"
  echo "   Attempting to continue..."
fi

# Drop existing test database if it exists
echo "🗑️  Dropping existing test database (if exists)..."
if docker ps | grep -q "tailtown-postgres"; then
  docker exec tailtown-postgres psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
else
  PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
fi

# Create test database
echo "📦 Creating test database..."
if docker ps | grep -q "tailtown-postgres"; then
  docker exec tailtown-postgres psql -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"
else
  PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"
fi

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate

echo "✅ Test database setup complete!"
echo ""
echo "To run tests:"
echo "  npm test"
echo ""
echo "To run specific test:"
echo "  npm test -- staff-schedule-overlap.test.ts"
