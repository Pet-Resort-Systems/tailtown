#!/bin/bash

# Setup shell integration for automatic cleanup
# Adds cleanup on terminal exit and helpful aliases

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHELL_RC="$HOME/.zshrc"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up shell integration for Tailtown${NC}"
echo ""

# Check if already installed
if grep -q "# Tailtown Auto-Cleanup" "$SHELL_RC" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Shell integration already installed${NC}"
    echo "To reinstall, remove the Tailtown section from $SHELL_RC"
    exit 0
fi

# Create backup
cp "$SHELL_RC" "${SHELL_RC}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Created backup of $SHELL_RC${NC}"

# Add to shell rc
cat >> "$SHELL_RC" << 'EOF'

# ============================================
# Tailtown Auto-Cleanup Integration
# ============================================

# Cleanup Tailtown processes on terminal exit
tailtown_cleanup_on_exit() {
    local zombie_count=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')
    
    if [ "$zombie_count" -gt 3 ]; then
        echo "🧹 Cleaning up Tailtown processes..."
        pkill -9 -f "ts-node-dev" 2>/dev/null || true
        pkill -9 -f "react-scripts" 2>/dev/null || true
    fi
}

# Register cleanup on exit (optional - uncomment to enable)
# trap tailtown_cleanup_on_exit EXIT

# Tailtown aliases
alias tt-health='node ~/CascadeProjects/tailtown/scripts/health-check.js'
alias tt-start='cd ~/CascadeProjects/tailtown && pnpm run dev:start'
alias tt-stop='cd ~/CascadeProjects/tailtown && pnpm run dev:stop'
alias tt-restart='cd ~/CascadeProjects/tailtown && pnpm run dev:restart'
alias tt-status='cd ~/CascadeProjects/tailtown && pnpm run dev:status'
alias tt-cleanup='cd ~/CascadeProjects/tailtown && pnpm run dev:cleanup'
alias tt-logs='cd ~/CascadeProjects/tailtown && pnpm run dev:logs'
alias tt-zombies='ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l'

# Quick check function
tt-check() {
    echo "🔍 Tailtown Status Check"
    echo ""
    
    local zombie_count=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')
    
    echo "Zombie processes: $zombie_count"
    
    if [ "$zombie_count" -eq 0 ]; then
        echo "✅ No processes running"
    elif [ "$zombie_count" -le 6 ]; then
        echo "✅ Normal (3-6 expected when running)"
    elif [ "$zombie_count" -le 10 ]; then
        echo "⚠️  Warning - consider cleanup"
    else
        echo "🚨 Critical - cleanup needed!"
        echo "   Run: tt-cleanup"
    fi
    
    echo ""
    echo "Ports in use:"
    lsof -i :3000 -i :4003 -i :4004 2>/dev/null | grep LISTEN || echo "  None"
}

# Auto-check on cd to tailtown directory
tailtown_auto_check() {
    if [[ "$PWD" == *"tailtown"* ]]; then
        local zombie_count=$(ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l | tr -d ' ')
        
        if [ "$zombie_count" -gt 10 ]; then
            echo "⚠️  Warning: $zombie_count zombie processes detected"
            echo "   Run: tt-cleanup"
        fi
    fi
}

# Hook into cd (optional - uncomment to enable)
# chpwd_functions+=(tailtown_auto_check)

echo "✅ Tailtown shell integration loaded"
echo "   Type 'tt-check' to check status"
echo "   Type 'tt-' and press TAB to see all commands"

# ============================================
# End Tailtown Integration
# ============================================
EOF

echo -e "${GREEN}✓ Added Tailtown integration to $SHELL_RC${NC}"
echo ""

echo -e "${GREEN}✅ Shell integration installed!${NC}"
echo ""
echo "New commands available:"
echo "  ${BLUE}tt-health${NC}    - Run health check"
echo "  ${BLUE}tt-start${NC}     - Start all servers"
echo "  ${BLUE}tt-stop${NC}      - Stop all servers"
echo "  ${BLUE}tt-restart${NC}   - Restart servers"
echo "  ${BLUE}tt-status${NC}    - Check status"
echo "  ${BLUE}tt-cleanup${NC}   - Clean up zombies"
echo "  ${BLUE}tt-logs${NC}      - View logs"
echo "  ${BLUE}tt-check${NC}     - Quick status check"
echo "  ${BLUE}tt-zombies${NC}   - Count zombie processes"
echo ""
echo "Optional features (commented out by default):"
echo "  • Cleanup on terminal exit"
echo "  • Auto-check when entering tailtown directory"
echo ""
echo "To enable, edit $SHELL_RC and uncomment the trap/chpwd lines"
echo ""
echo -e "${YELLOW}⚠️  Restart your terminal or run: source $SHELL_RC${NC}"
