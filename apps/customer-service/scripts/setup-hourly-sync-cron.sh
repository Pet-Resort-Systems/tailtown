#!/bin/bash
#
# Setup Hourly Gingr Sync Cron Job
#
# This script sets up a cron job to run the incremental Gingr sync every hour.
# The incremental sync is lightweight and safe to run frequently.
#

set -e

echo "🔧 Setting up hourly Gingr sync cron job..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CUSTOMER_SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Path to the incremental sync script
SYNC_SCRIPT="$CUSTOMER_SERVICE_DIR/scripts/incremental-gingr-sync.js"

# Check if script exists
if [ ! -f "$SYNC_SCRIPT" ]; then
    echo "❌ Error: Sync script not found at $SYNC_SCRIPT"
    exit 1
fi

echo "✓ Found sync script: $SYNC_SCRIPT"

# Get node path (assuming nvm is used)
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
fi

NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo "❌ Error: Node.js not found. Please install Node.js or source nvm."
    exit 1
fi

echo "✓ Found Node.js: $NODE_PATH"

# Create cron entry
CRON_ENTRY="0 * * * * cd $CUSTOMER_SERVICE_DIR && $NODE_PATH $SYNC_SCRIPT >> /var/log/gingr-sync.log 2>&1"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "incremental-gingr-sync.js"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove old entry
    crontab -l 2>/dev/null | grep -v "incremental-gingr-sync.js" | crontab -
fi

# Add new cron entry
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job installed successfully!"
echo ""
echo "Cron schedule: Every hour at minute 0"
echo "Log file: /var/log/gingr-sync.log"
echo ""
echo "To view the cron job:"
echo "  crontab -l | grep gingr"
echo ""
echo "To view sync logs:"
echo "  tail -f /var/log/gingr-sync.log"
echo ""
echo "To manually run the sync:"
echo "  cd $CUSTOMER_SERVICE_DIR && node $SYNC_SCRIPT"
