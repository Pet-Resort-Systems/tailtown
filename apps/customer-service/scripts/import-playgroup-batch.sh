#!/bin/bash

# Batch Playgroup Import Script
# 
# Imports playgroup assignments from multiple Gingr CSV files
# 
# Usage:
#   ./import-playgroup-batch.sh /path/to/csv/directory/*.csv

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TENANT_ID="${1:-b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05}"

echo "🐕 Batch Playgroup Import"
echo "═══════════════════════════════════════"
echo "Tenant: $TENANT_ID"
echo ""

total_updated=0
total_processed=0
total_skipped=0

# Shift to get CSV files
shift

for csv_file in "$@"; do
  if [ ! -f "$csv_file" ]; then
    echo "⚠️  Skipping: $csv_file (not found)"
    continue
  fi
  
  echo "📄 Processing: $(basename "$csv_file")"
  
  # Run import and capture output
  output=$(node "$SCRIPT_DIR/import-playgroup-from-gingr-csv.js" "$csv_file" "$TENANT_ID" 2>&1)
  
  # Extract counts from output
  updated=$(echo "$output" | grep "Updated:" | awk '{print $2}')
  processed=$(echo "$output" | grep "Total processed:" | awk '{print $3}')
  skipped=$(echo "$output" | grep "Skipped" | awk '{print $4}')
  
  if [ -n "$updated" ]; then
    total_updated=$((total_updated + updated))
    total_processed=$((total_processed + processed))
    total_skipped=$((total_skipped + skipped))
    echo "   ✓ Updated: $updated pets"
  else
    echo "   ✗ Import failed"
  fi
  echo ""
done

echo "═══════════════════════════════════════"
echo "📊 Batch Summary"
echo "═══════════════════════════════════════"
echo "Total CSV files processed: $#"
echo "Total pets processed: $total_processed"
echo "Total pets updated: $total_updated"
echo "Total pets skipped: $total_skipped"
echo ""
echo "✅ Batch import complete"
