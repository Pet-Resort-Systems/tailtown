#!/bin/bash
#
# Setup Nightly Full Gingr Sync Cron Job
#
# This script sets up a cron job to run the full Gingr sync nightly at 8:00 PM Mountain Time.
# Mountain Time is UTC-7 (MST) or UTC-6 (MDT), so 8:00 PM MT = 3:00 AM UTC (next day)
#

set -e

echo "🌙 Setting up nightly full Gingr sync cron job..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CUSTOMER_SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Path to the full sync script
SYNC_SCRIPT="$CUSTOMER_SERVICE_DIR/scripts/full-gingr-sync.js"

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
# 0 3 * * * = Every day at 3:00 AM UTC (8:00 PM Mountain Time)
CRON_ENTRY="0 3 * * * cd $CUSTOMER_SERVICE_DIR && $NODE_PATH $SYNC_SCRIPT >> /var/log/gingr-full-sync.log 2>&1"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "full-gingr-sync.js"; then
    echo "⚠️  Nightly sync cron job already exists. Updating..."
    # Remove old entry
    crontab -l 2>/dev/null | grep -v "full-gingr-sync.js" | crontab -
fi

# Add new cron entry
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Nightly sync cron job installed successfully!"
echo ""
echo "Schedule: Every night at 8:00 PM Mountain Time (3:00 AM UTC)"
echo "Log file: /var/log/gingr-full-sync.log"
echo ""
echo "Current cron jobs:"
crontab -l | grep gingr
echo ""
echo "To view sync logs:"
echo "  tail -f /var/log/gingr-full-sync.log"
echo ""
echo "To manually run the nightly sync:"
echo "  cd $CUSTOMER_SERVICE_DIR && node $SYNC_SCRIPT"
echo ""
echo "Note: This syncs customers, pets, reservations, and invoices."
echo "      The hourly incremental sync (reservations only) will continue to run."
