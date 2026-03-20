#!/bin/bash
# Server Fix Script
# Run this AFTER reviewing diagnostics to fix common issues

echo "================================"
echo "🔧 Fixing Tailtown Server"
echo "================================"
echo ""

# 1. Stop all services
echo "⏹️  Stopping all services..."
pm2 delete all || true
echo ""

# 2. Regenerate Prisma clients
echo "🔄 Regenerating Prisma clients..."
cd /opt/tailtown/apps/customer-service
pnpm exec prisma generate
echo "✅ Customer service Prisma client regenerated"
echo ""

cd /opt/tailtown/apps/reservation-service
pnpm exec prisma generate
echo "✅ Reservation service Prisma client regenerated"
echo ""

# 3. Start services fresh
echo "🚀 Starting services..."
cd /opt/tailtown
pm2 start ecosystem.config.js --only customer-service
pm2 start ecosystem.config.js --only reservation-service
pm2 start ecosystem.config.js --only apps/frontend
pm2 save
echo ""

# 4. Wait for services to stabilize
echo "⏳ Waiting for services to stabilize..."
sleep 5
echo ""

# 5. Check status
echo "📊 Final Status:"
pm2 list
echo ""

# 6. Test endpoints
echo "🧪 Testing endpoints..."
echo "Customer service:"
curl -s http://localhost:4004/health | head -c 200
echo ""
echo ""
echo "Reservation service:"
curl -s http://localhost:4003/health | head -c 200
echo ""
echo ""

echo "================================"
echo "✅ Fix Complete"
echo "================================"
echo ""
echo "If services are still errored, check logs with:"
echo "  pm2 logs customer-service --lines 50"
