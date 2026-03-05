#!/bin/bash
#
# Deploy Incremental Sync to Production
#
# This script deploys the incremental sync system to production.
#

set -e

echo "🚀 Deploying Incremental Sync to Production"
echo ""

# Configuration
SERVER="root@<YOUR_SERVER_IP>"  # Update this with your server IP
REMOTE_DIR="/opt/tailtown/services/customer"

# Check if server is configured
if [[ "$SERVER" == *"<YOUR_SERVER_IP>"* ]]; then
    echo "❌ Error: Please update SERVER variable in this script with your production server IP"
    exit 1
fi

echo "📦 Building customer service..."
npm run build

echo ""
echo "📤 Deploying files to $SERVER..."

# Deploy dist folder (compiled TypeScript)
echo "  → Deploying dist folder..."
scp -r dist "$SERVER:$REMOTE_DIR/"

# Deploy scripts
echo "  → Deploying scripts..."
scp scripts/incremental-gingr-sync.js "$SERVER:$REMOTE_DIR/scripts/"
scp scripts/setup-hourly-sync-cron.sh "$SERVER:$REMOTE_DIR/scripts/"

echo ""
echo "🔄 Restarting customer service..."
ssh "$SERVER" "cd $REMOTE_DIR && pm2 restart customer-service"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. SSH into production: ssh $SERVER"
echo "  2. Setup cron: cd $REMOTE_DIR/scripts && chmod +x setup-hourly-sync-cron.sh && ./setup-hourly-sync-cron.sh"
echo "  3. Test sync: cd $REMOTE_DIR && node scripts/incremental-gingr-sync.js"
echo "  4. Monitor logs: tail -f /var/log/gingr-sync.log"
