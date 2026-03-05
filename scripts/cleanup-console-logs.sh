#!/bin/bash

# Script to clean up excessive console.logs in apps/frontend code
# This script will:
# 1. Remove debug console.logs
# 2. Keep error console.errors (will be converted to logger.error later)
# 3. Keep warning console.warns (will be converted to logger.warn later)

echo "🧹 Starting console.log cleanup..."

# Files to clean (top offenders)
FILES=(
  "apps/frontend/src/pages/Dashboard.tsx"
  "apps/frontend/src/components/reservations/ReservationForm.tsx"
  "apps/frontend/src/components/calendar/Calendar.tsx"
  "apps/frontend/src/pages/orders/OrderEntry.tsx"
  "apps/frontend/src/pages/kennels/PrintKennelCards.tsx"
)

# Backup directory
BACKUP_DIR="./console-log-backups-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Create backup
    cp "$file" "$BACKUP_DIR/$(basename $file).bak"
    
    # Count console.logs before
    before=$(grep -c "console\.log" "$file" || echo "0")
    
    # Remove common debug console.logs (keep console.error and console.warn)
    # This is a safe first pass - removes obvious debug logs
    sed -i.tmp '/console\.log.*RENDER/d' "$file"
    sed -i.tmp '/console\.log.*Loading/d' "$file"
    sed -i.tmp '/console\.log.*loaded/d' "$file"
    sed -i.tmp '/console\.log.*filter/d' "$file"
    sed -i.tmp '/console\.log.*Filtering/d' "$file"
    sed -i.tmp '/console\.log.*API calls/d' "$file"
    sed -i.tmp '/console\.log.*response/d' "$file"
    sed -i.tmp '/console\.log.*Response/d' "$file"
    sed -i.tmp '/console\.log.*Data/d' "$file"
    sed -i.tmp '/console\.log.*Using/d' "$file"
    sed -i.tmp '/console\.log.*version/d' "$file"
    sed -i.tmp '/console\.log.*VERSION/d' "$file"
    
    # Remove .tmp files created by sed
    rm -f "$file.tmp"
    
    # Count console.logs after
    after=$(grep -c "console\.log" "$file" || echo "0")
    
    echo "  Removed $((before - after)) console.logs from $file"
  else
    echo "  ⚠️  File not found: $file"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo "📁 Backups saved to: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. Add logger imports where needed"
echo "3. Convert remaining console.error/warn to logger.error/warn"
echo "4. Test the application"
