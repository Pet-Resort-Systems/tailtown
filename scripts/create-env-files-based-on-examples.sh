#!/bin/bash

# Make sure to check the root `package.json` file.
# There's a script to run this file using `pnpm`.

# Script to copy .env.example files to .env files in apps and packages directories
# Usage: ./setup-env-files.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔍 Searching for .env.example files in apps and packages directories..."
echo ""

# Counter for tracking operations
COPIED=0
SKIPPED=0
FAILED=0

# Function to process .env.example files
process_env_files() {
    local search_dir="$1"
    local dir_name="$2"
    
    if [ ! -d "$search_dir" ]; then
        echo "⚠️  Directory not found: $search_dir"
        return
    fi
    
    echo "📂 Processing $dir_name directory..."
    
    # Find all .env.example files recursively
    while IFS= read -r env_example_file; do
        env_file="${env_example_file%.example}"
        env_dir="$(dirname "$env_example_file")"
        
        if [ -f "$env_file" ]; then
            echo "  ⏭️  Skipped: $env_file (already exists)"
            ((SKIPPED++))
        else
            if cp "$env_example_file" "$env_file"; then
                echo "  ✅ Copied: $env_example_file into:" 
                echo "    → $env_file"
                ((COPIED++))
            else
                echo "  ❌ Failed: Could not copy $env_example_file"
                ((FAILED++))
            fi
        fi
        echo ""
    done < <(find "$search_dir" -name ".env.example" -type f)
}

# Process apps directory
process_env_files "$PROJECT_ROOT/apps" "apps"
echo ""

# Process packages directory
process_env_files "$PROJECT_ROOT/packages" "packages"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "  ✅ Copied:  $COPIED"
echo "  ⏭️  Skipped: $SKIPPED"
echo "  ❌ Failed:  $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -gt 0 ]; then
    exit 1
fi

exit 0