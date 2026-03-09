#!/bin/bash
# Database setup script for Tailtown Customer Service

echo "Setting up Tailtown Pet Resort database..."

# Define PostgreSQL path
PG_BIN_PATH="/Library/PostgreSQL/14/bin"
PSQLCMD="$PG_BIN_PATH/psql"

# Check if PostgreSQL binaries exist at our specified path
if [ ! -f "$PSQLCMD" ]; then
    echo "PostgreSQL binaries not found at $PG_BIN_PATH. Please install PostgreSQL first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Create database if it doesn't exist
echo "Creating database tailtown_dev if it doesn't exist..."
PGPASSWORD="Kangarooteeth1!" $PSQLCMD -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'tailtown_dev'" | grep -q 1 || PGPASSWORD="Kangarooteeth1!" $PSQLCMD -U postgres -c "CREATE DATABASE tailtown_dev"

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

# Seed test data
echo "Seeding test data..."
npx ts-node src/tests/scripts/seed-services.ts

echo "Database setup complete! You can now start the server with 'npm run dev'"
