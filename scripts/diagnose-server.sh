#!/bin/bash
# Server Diagnostic Script
# Run this on the production server to diagnose service issues

echo "================================"
echo "🔍 Tailtown Server Diagnostics"
echo "================================"
echo ""

# 1. Check PM2 status
echo "📊 PM2 Status:"
pm2 list
echo ""

# 2. Check PM2 logs for errors
echo "📝 Customer Service Logs (last 30 lines):"
pm2 logs customer-service --lines 30 --nostream
echo ""

echo "📝 Reservation Service Logs (last 30 lines):"
pm2 logs reservation-service --lines 30 --nostream
echo ""

# 3. Check if services can connect to database
echo "🔌 Testing Database Connection:"
cd /opt/tailtown/apps/customer-service
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✅ Customer DB: Connected'); prisma.\$disconnect(); }).catch(e => { console.error('❌ Customer DB Error:', e.message); });"
echo ""

# 4. Check Prisma client version
echo "📦 Prisma Client Info:"
cd /opt/tailtown/apps/customer-service
node -e "try { const pkg = require('@prisma/client/package.json'); console.log('Version:', pkg.version); } catch(e) { console.log('❌ Prisma client not found'); }"
echo ""

# 5. Check if schema file exists
echo "📄 Schema Files:"
ls -lh /opt/tailtown/apps/customer-service/prisma/schema.prisma
ls -lh /opt/tailtown/apps/reservation-service/prisma/schema.prisma
echo ""

# 6. Check environment variables
echo "🔐 Environment Check:"
cd /opt/tailtown/apps/customer-service
if [ -f .env ]; then
  echo "✅ .env file exists"
  echo "DATABASE_URL present: $(grep -q DATABASE_URL .env && echo 'Yes' || echo 'No')"
else
  echo "❌ .env file missing"
fi
echo ""

echo "================================"
echo "✅ Diagnostics Complete"
echo "================================"
