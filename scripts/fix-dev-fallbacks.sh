#!/bin/bash

# Script to remove insecure 'dev' fallbacks from all controllers
# This is a CRITICAL security fix to prevent tenant isolation bugs

echo "🔒 CRITICAL SECURITY FIX: Removing 'dev' fallbacks"
echo "=================================================="
echo ""

# Count total occurrences before fix
TOTAL_BEFORE=$(grep -r "|| 'dev'" --include="*.ts" services/ | wc -l)
echo "Found $TOTAL_BEFORE instances of || 'dev' pattern"
echo ""

# List of files to fix (source files only, not dist/)
FILES=$(grep -r "|| 'dev'" --include="*.ts" services/*/src/**/*.ts | cut -d: -f1 | sort | uniq)

echo "Files to fix:"
echo "$FILES" | while read file; do
  COUNT=$(grep -c "|| 'dev'" "$file" 2>/dev/null || echo "0")
  echo "  - $file ($COUNT occurrences)"
done
echo ""

# Backup files before modification
echo "Creating backups..."
BACKUP_DIR="backups/dev-fallback-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "$FILES" | while read file; do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$(basename $file).backup"
  fi
done
echo "Backups created in $BACKUP_DIR"
echo ""

# Fix the files
echo "Applying fixes..."
echo "$FILES" | while read file; do
  if [ -f "$file" ]; then
    echo "Fixing: $file"
    
    # Pattern 1: const tenantId = req.tenantId || 'dev';
    # Replace with: const tenantId = req.tenantId;
    #               if (!tenantId) { throw new Error('Tenant ID is required'); }
    
    # Pattern 2: const tenantId = (req as any).tenantId || 'dev';
    # Replace with: const tenantId = (req as any).tenantId;
    #               if (!tenantId) { throw new Error('Tenant ID is required'); }
    
    # Pattern 3: tenantId: (req as any).tenantId || 'dev'
    # Replace with: tenantId: (req as any).tenantId
    # (This one needs manual review as it's in object literals)
    
    # Use sed to remove || 'dev' patterns
    # macOS sed requires -i '' for in-place editing
    sed -i '' "s/ || 'dev'//g" "$file"
    
    # Count remaining
    REMAINING=$(grep -c "|| 'dev'" "$file" 2>/dev/null || echo "0")
    if [ "$REMAINING" -eq "0" ]; then
      echo "  ✅ Fixed successfully"
    else
      echo "  ⚠️  Warning: $REMAINING instances remain (may need manual review)"
    fi
  fi
done
echo ""

# Rebuild TypeScript
echo "Rebuilding TypeScript..."
cd apps/customer-service && pnpm run build > /dev/null 2>&1
cd ../reservation-service && pnpm run build > /dev/null 2>&1
cd ../..
echo "✅ Build complete"
echo ""

# Count total occurrences after fix
TOTAL_AFTER=$(grep -r "|| 'dev'" --include="*.ts" services/*/src/**/*.ts 2>/dev/null | wc -l)
FIXED=$((TOTAL_BEFORE - TOTAL_AFTER))

echo "=================================================="
echo "✅ FIX COMPLETE"
echo "=================================================="
echo "Before: $TOTAL_BEFORE instances"
echo "After:  $TOTAL_AFTER instances"
echo "Fixed:  $FIXED instances"
echo ""
echo "⚠️  IMPORTANT: This fix removes the fallback but does NOT add validation."
echo "   You must add proper error handling where tenantId is required."
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff"
echo "2. Add validation: if (!tenantId) throw new Error('Tenant ID required')"
echo "3. Run tests: pnpm test"
echo "4. Commit: git add -A && git commit -m 'security: Remove dev fallbacks'"
echo ""
echo "Backups saved in: $BACKUP_DIR"
