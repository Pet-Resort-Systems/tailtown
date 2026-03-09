#!/bin/bash

# Setup Git hooks for automatic cleanup
# Runs cleanup before commits and when switching branches

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up Git hooks for automatic cleanup${NC}"
echo ""

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook: Check for zombie processes before committing

PROJECT_ROOT="$(git rev-parse --show-toplevel)"

echo "🔍 Checking for zombie processes..."

zombie_count=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')

if [ "$zombie_count" -gt 5 ]; then
    echo "⚠️  Warning: Found $zombie_count zombie processes"
    echo "   Running cleanup before commit..."
    
    pkill -9 -f "ts-node-dev" 2>/dev/null || true
    pkill -9 -f "react-scripts" 2>/dev/null || true
    
    sleep 2
    
    new_count=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')
    echo "✅ Cleanup complete. Remaining processes: $new_count"
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo -e "${GREEN}✓ Created pre-commit hook${NC}"

# Create post-checkout hook
cat > "$HOOKS_DIR/post-checkout" << 'EOF'
#!/bin/bash

# Post-checkout hook: Clean up when switching branches

PROJECT_ROOT="$(git rev-parse --show-toplevel)"

echo "🔍 Checking for zombie processes after checkout..."

zombie_count=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')

if [ "$zombie_count" -gt 3 ]; then
    echo "⚠️  Found $zombie_count processes - cleaning up..."
    
    pkill -9 -f "ts-node-dev" 2>/dev/null || true
    pkill -9 -f "react-scripts" 2>/dev/null || true
    
    echo "✅ Cleanup complete"
    echo "   Remember to restart servers: pnpm run dev:start"
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/post-checkout"
echo -e "${GREEN}✓ Created post-checkout hook${NC}"

# Create post-merge hook
cat > "$HOOKS_DIR/post-merge" << 'EOF'
#!/bin/bash

# Post-merge hook: Clean up after merging

PROJECT_ROOT="$(git rev-parse --show-toplevel)"

echo "🔍 Checking for zombie processes after merge..."

zombie_count=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')

if [ "$zombie_count" -gt 3 ]; then
    echo "⚠️  Found $zombie_count processes - cleaning up..."
    
    pkill -9 -f "ts-node-dev" 2>/dev/null || true
    pkill -9 -f "react-scripts" 2>/dev/null || true
    
    echo "✅ Cleanup complete"
    echo "   Remember to restart servers: pnpm run dev:start"
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/post-merge"
echo -e "${GREEN}✓ Created post-merge hook${NC}"

echo ""
echo -e "${GREEN}✅ Git hooks installed!${NC}"
echo ""
echo "Hooks will automatically:"
echo "  • Check for zombies before commits"
echo "  • Clean up when switching branches"
echo "  • Clean up after merging"
echo ""
echo "To disable a hook, remove or rename:"
echo "  $HOOKS_DIR/pre-commit"
echo "  $HOOKS_DIR/post-checkout"
echo "  $HOOKS_DIR/post-merge"
