#!/bin/bash
# Automated Deployment Script - November 6, 2025
# Multi-Tenancy Bug Fix Deployment (No confirmations required)

set -e  # Exit on error

echo "🚀 Starting AUTOMATED deployment of multi-tenancy fix..."
echo ""

# Configuration
REMOTE_HOST="129.212.178.244"
REMOTE_USER="root"
SSH_KEY="$HOME/ttkey"
REMOTE_PATH="/opt/tailtown"

echo "📋 Pre-flight checks..."
echo "- Remote host: $REMOTE_HOST"
echo "- Remote path: $REMOTE_PATH"
echo "- Mode: AUTOMATED (no confirmations)"
echo ""

# Step 1: Backup remote database
echo "🗄️  Step 1: Creating remote database backup..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  echo "Creating backup..."
  docker exec tailtown-postgres pg_dump -U postgres customer > ~/customer_backup_$(date +%Y%m%d_%H%M%S).sql
  echo "Backup created:"
  ls -lh ~/customer_backup_*.sql | tail -1
ENDSSH

echo ""
echo "✅ Backup created successfully"

# Step 2: Pull latest code
echo ""
echo "📥 Step 2: Pulling latest code on remote server..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  cd /opt/tailtown
  echo "Current branch:"
  git branch
  echo ""
  echo "Pulling latest changes..."
  git pull origin fix/invoice-tenant-id
  echo ""
  echo "Latest commit:"
  git log -1 --oneline
ENDSSH

# Step 3: Install dependencies and generate Prisma client
echo ""
echo "📦 Step 3: Installing dependencies and generating Prisma client..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  cd /opt/tailtown
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
  echo ""
  echo "Generating Prisma client..."
  cd apps/customer-service
  pnpm exec prisma generate
ENDSSH

# Step 4: Run database migration
echo ""
echo "🗃️  Step 4: Running database migration..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  cd /opt/tailtown/apps/customer-service
  echo "Running migration..."
  docker exec -i tailtown-postgres psql -U postgres -d customer < prisma/migrations/20251106_add_missing_schema_fields/migration.sql
  echo ""
  echo "Verifying migration..."
  docker exec tailtown-postgres psql -U postgres -d customer -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'grooming_skills';"
ENDSSH

echo ""
echo "✅ Migration completed successfully"

# Step 5: Build application
echo ""
echo "🔨 Step 5: Building application..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  cd /opt/tailtown/apps/customer-service
  echo "Building..."
  pnpm run build
  echo "Build complete!"
ENDSSH

# Step 6: Restart PM2 service
echo ""
echo "🔄 Step 6: Restarting customer service..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  echo "Restarting PM2 process..."
  pm2 restart customer-service
  echo ""
  echo "PM2 Status:"
  pm2 status customer-service
  echo ""
  echo "Recent logs:"
  pm2 logs customer-service --lines 20 --nostream
ENDSSH

# Step 7: Health check
echo ""
echo "🏥 Step 7: Running health check..."
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  echo "Checking service health..."
  sleep 3
  curl -s http://localhost:4004/health | jq '.' || echo "Health check endpoint not responding"
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "1. Visit https://dev.canicloud.com to verify dashboard"
echo "2. Check customer count (should be ~1,157, not 23,628)"
echo "3. Verify revenue numbers are tenant-specific"
echo "4. Monitor logs: ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST 'pm2 logs customer-service'"
echo ""
echo "🔄 Rollback command (if needed):"
echo "ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST 'cd /opt/tailtown && git checkout HEAD~1 && cd apps/customer-service && pnpm run build && pm2 restart customer-service'"
echo ""
