#!/bin/bash

# Script to verify that logger utilities are synchronized across services
# This ensures code consistency and prevents drift between duplicate files

echo "🔍 Checking logger synchronization..."

FILE1="apps/customer-service/src/utils/logger.ts"
FILE2="apps/reservation-service/src/utils/logger.ts"

if [ ! -f "$FILE1" ]; then
  echo "❌ Error: $FILE1 not found"
  exit 1
fi

if [ ! -f "$FILE2" ]; then
  echo "❌ Error: $FILE2 not found"
  exit 1
fi

# Compare files (ignoring whitespace differences)
if diff -w "$FILE1" "$FILE2" > /dev/null; then
  echo "✅ Logger files are synchronized"
  exit 0
else
  echo "❌ Logger files are NOT synchronized!"
  echo ""
  echo "Differences found between:"
  echo "  - $FILE1"
  echo "  - $FILE2"
  echo ""
  echo "Please ensure both files have identical content."
  echo "Run: diff $FILE1 $FILE2"
  exit 1
fi
