#!/bin/bash

# One-command setup for all automation
# Run this to set up everything at once

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║   Tailtown Automation Setup                ║"
echo "║   Zombie Process Prevention                ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Step 1: Make scripts executable
echo -e "${BLUE}[1/4]${NC} Making scripts executable..."
chmod +x "$PROJECT_ROOT/scripts"/*.sh
chmod +x "$PROJECT_ROOT/scripts/health-check.js"
echo -e "${GREEN}✓ Scripts are now executable${NC}"
echo ""

# Step 2: Install LaunchAgent
echo -e "${BLUE}[2/4]${NC} Installing macOS LaunchAgent..."
"$PROJECT_ROOT/scripts/install-launchd.sh"
echo ""

# Step 3: Setup Git hooks
echo -e "${BLUE}[3/4]${NC} Setting up Git hooks..."
"$PROJECT_ROOT/scripts/setup-git-hooks.sh"
echo ""

# Step 4: Setup shell integration
echo -e "${BLUE}[4/4]${NC} Setting up shell integration..."
"$PROJECT_ROOT/scripts/setup-shell-integration.sh"
echo ""

# Summary
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║   ✅ Automation Setup Complete!            ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "What was installed:"
echo "  ✅ Background cleanup daemon (runs every 5 min)"
echo "  ✅ macOS LaunchAgent (starts on login)"
echo "  ✅ Git hooks (cleanup on commit/checkout/merge)"
echo "  ✅ Shell commands (tt-* aliases)"
echo ""
echo "Next steps:"
echo "  1. Restart your terminal or run: ${BLUE}source ~/.zshrc${NC}"
echo "  2. Test with: ${BLUE}tt-check${NC}"
echo "  3. View status: ${BLUE}pnpm run daemon:status${NC}"
echo ""
echo "Available commands:"
echo "  ${BLUE}tt-start${NC}      Start all servers"
echo "  ${BLUE}tt-stop${NC}       Stop all servers"
echo "  ${BLUE}tt-status${NC}     Check status"
echo "  ${BLUE}tt-cleanup${NC}    Clean up zombies"
echo "  ${BLUE}tt-check${NC}      Quick health check"
echo ""
echo "Documentation:"
echo "  ${BLUE}docs/AUTOMATION-SETUP.md${NC}         Full automation guide"
echo "  ${BLUE}README-ZOMBIE-PREVENTION.md${NC}     Quick start guide"
echo "  ${BLUE}docs/ZOMBIE-PROCESS-PREVENTION.md${NC} Detailed guide"
echo ""
echo -e "${YELLOW}⚠️  Remember to restart your terminal!${NC}"
