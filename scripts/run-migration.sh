#!/bin/bash

# Run a SQL migration file safely
# Usage: ./scripts/run-migration.sh <migration-file.sql>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <migration-file.sql>"
    exit 1
fi

MIGRATION_FILE="$1"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "🔄 Running migration: $(basename $MIGRATION_FILE)"
echo ""

# Load DATABASE_URL from .env if it exists
if [ -f "apps/customer-service/.env" ]; then
    export $(grep -v '^#' apps/customer-service/.env | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not set"
    echo "Set it in apps/customer-service/.env or as an environment variable"
    exit 1
fi

# Run the migration using Node.js and pg library
node -e "
const fs = require('fs');
const { Client } = require('pg');

const sql = fs.readFileSync('$MIGRATION_FILE', 'utf8');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect()
  .then(() => {
    console.log('✓ Connected to database');
    return client.query(sql);
  })
  .then(() => {
    console.log('✓ Migration completed successfully');
    return client.end();
  })
  .catch(err => {
    console.error('✗ Migration failed:', err.message);
    client.end();
    process.exit(1);
  });
"

echo ""
echo "✅ Migration complete!"
