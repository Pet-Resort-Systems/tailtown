#!/bin/bash

# Documentation Cleanup Script
# Organizes documentation by moving outdated/session docs to archive
# Run from project root: ./scripts/cleanup-docs.sh

echo "🧹 Tailtown Documentation Cleanup"
echo "=================================="
echo ""

# Create archive subdirectories
mkdir -p docs/archive/sessions
mkdir -p docs/archive/deployments
mkdir -p docs/archive/summaries
mkdir -p docs/archive/console-log-cleanup

MOVED=0

# Function to move file if it exists
move_if_exists() {
  local src="$1"
  local dest="$2"
  if [ -f "$src" ]; then
    echo "  📦 $(basename "$src")"
    mv "$src" "$dest"
    MOVED=$((MOVED + 1))
  fi
}

# ============================================
# 1. SESSION SUMMARIES -> archive/sessions
# ============================================
echo "📁 Moving session summaries..."
move_if_exists "docs/SESSION-SUMMARY-NOV-8-2025.md" "docs/archive/sessions/"
move_if_exists "docs/TODO-NOV-8-2025.md" "docs/archive/sessions/"
move_if_exists "docs/IMPLEMENTATION-SUMMARY-NOV-7-2025.md" "docs/archive/sessions/"

# ============================================
# 2. ONE-TIME DEPLOYMENT DOCS -> archive/deployments
# ============================================
echo ""
echo "📁 Moving deployment docs (features already deployed)..."
move_if_exists "docs/WAITLIST-DEPLOYMENT.md" "docs/archive/deployments/"
move_if_exists "docs/REPORT-CARD-DEPLOYMENT.md" "docs/archive/deployments/"
move_if_exists "docs/PET_NOTES_SYNC_DEPLOYMENT.md" "docs/archive/deployments/"
move_if_exists "docs/ANNOUNCEMENTS-DEPLOYMENT-LESSONS.md" "docs/archive/deployments/"

# ============================================
# 3. CONSOLE LOG CLEANUP DOCS -> archive/console-log-cleanup
# ============================================
echo ""
echo "📁 Moving console log cleanup docs..."
move_if_exists "docs/CONSOLE-LOG-COMPLETE-SUMMARY.md" "docs/archive/console-log-cleanup/"
move_if_exists "docs/CONSOLE-LOG-PHASE2-SUMMARY.md" "docs/archive/console-log-cleanup/"
move_if_exists "docs/CONSOLE-LOG-REMOVAL-SUMMARY.md" "docs/archive/console-log-cleanup/"

# ============================================
# 4. IMPLEMENTATION SUMMARIES -> archive/summaries
# ============================================
echo ""
echo "📁 Moving implementation summaries..."
move_if_exists "docs/INFRASTRUCTURE-IMPROVEMENTS-SUMMARY.md" "docs/archive/summaries/"
move_if_exists "docs/TENANT-ISOLATION-CI-CD-SUMMARY.md" "docs/archive/summaries/"
move_if_exists "docs/TENANT-ISOLATION-IMPLEMENTATION-SUMMARY.md" "docs/archive/summaries/"
move_if_exists "docs/SERVICE-TO-SERVICE-API-COMPLETE.md" "docs/archive/summaries/"
move_if_exists "docs/SERVICE-TO-SERVICE-API-STATUS.md" "docs/archive/summaries/"
move_if_exists "docs/SERVICE-COMMUNICATION-IMPLEMENTATION.md" "docs/archive/summaries/"

# ============================================
# 5. FIX DOCS (one-time fixes) -> archive/summaries
# ============================================
echo ""
echo "📁 Moving one-time fix docs..."
move_if_exists "docs/AI_REFERENCE_OVERNIGHT_FIX.md" "docs/archive/summaries/"
move_if_exists "docs/ANNOUNCEMENT-DISMISS-FIX.md" "docs/archive/summaries/"
move_if_exists "docs/OVERNIGHT_RESERVATION_FIX_2025-11-19.md" "docs/archive/summaries/"
move_if_exists "docs/FRONTEND-TEST-FIXES.md" "docs/archive/summaries/"

# ============================================
# 6. REDIS/CACHING PHASE DOCS -> archive/summaries
# ============================================
echo ""
echo "📁 Moving caching implementation docs..."
move_if_exists "docs/REDIS-CACHING-IMPLEMENTATION.md" "docs/archive/summaries/"
move_if_exists "docs/REDIS-CACHING-PHASE2.md" "docs/archive/summaries/"

# ============================================
# 7. OLD ROADMAP -> archive
# ============================================
echo ""
echo "📁 Moving old roadmap..."
move_if_exists "docs/ROADMAP-OLD.md" "docs/archive/"

# ============================================
# 8. DUPLICATE/REDUNDANT DOCS
# ============================================
echo ""
echo "📁 Moving redundant docs..."
move_if_exists "docs/DOCUMENTATION-MAINTENANCE.md" "docs/archive/"  # Covered by DOCUMENTATION-STRATEGY.md
move_if_exists "docs/DOCUMENTATION-GUIDE.md" "docs/archive/"  # Covered by README.md

# ============================================
# SUMMARY
# ============================================
echo ""
echo "============================================"
echo "✅ Cleanup complete!"
echo "   Moved $MOVED files to docs/archive/"
echo ""
echo "📋 Remaining in /docs/ root:"
echo "   - Core docs (README, ROADMAP, QUICK-START)"
echo "   - Architecture docs (CURRENT-SYSTEM-ARCHITECTURE)"
echo "   - Active guides (TESTING, SECURITY, DEPLOYMENT)"
echo "   - Feature designs (REPORT-CARD-DESIGN, WAITLIST-DESIGN)"
echo ""
echo "📁 Organized archive structure:"
echo "   docs/archive/sessions/     - Session summaries"
echo "   docs/archive/deployments/  - Deployment docs"
echo "   docs/archive/summaries/    - Implementation summaries"
echo "============================================"

# ============================================
# PHASE 2: Organize remaining docs into subdirs
# ============================================

echo ""
echo "📁 Phase 2: Organizing into subdirectories..."

# Move architecture docs
move_if_exists "docs/API-GATEWAY-DESIGN.md" "docs/architecture/"
move_if_exists "docs/DATABASE-SPLIT-PLAN.md" "docs/architecture/"
move_if_exists "docs/DATABASE-INDEX-ANALYSIS.md" "docs/architecture/"
move_if_exists "docs/CONNECTION-POOLING.md" "docs/architecture/"
move_if_exists "docs/NGINX-ROUTING.md" "docs/architecture/"

# Move testing docs
move_if_exists "docs/TEST-SETUP.md" "docs/testing/"
move_if_exists "docs/TESTING.md" "docs/testing/"
move_if_exists "docs/TESTING-STRATEGY.md" "docs/testing/"
move_if_exists "docs/AUTOMATED-DEPLOYMENT-TESTS.md" "docs/testing/"

# Move deployment/operations docs
move_if_exists "docs/DEPLOYMENT-TROUBLESHOOTING.md" "docs/deployment/"
move_if_exists "docs/STAGING-ENVIRONMENT.md" "docs/deployment/"
move_if_exists "docs/GITHUB-AUTOMATION-SETUP.md" "docs/deployment/"
move_if_exists "docs/AUTO-MERGE-GUIDE.md" "docs/deployment/"

# Move security docs
move_if_exists "docs/SECURITY-CHECKLIST.md" "docs/security/"
move_if_exists "docs/AUDIT-LOGGING-GUIDE.md" "docs/security/"

# Move development docs
move_if_exists "docs/DEVELOPMENT-BEST-PRACTICES.md" "docs/development/"
move_if_exists "docs/URL-REFERENCE-GUIDE.md" "docs/development/"
move_if_exists "docs/LOCALHOST-REFERENCES.md" "docs/development/"

# Move feature docs
move_if_exists "docs/REPORT-CARD-DESIGN.md" "docs/features/"
move_if_exists "docs/WAITLIST-DESIGN.md" "docs/features/"
move_if_exists "docs/VACCINE_DATA_STANDARDS.md" "docs/features/"
move_if_exists "docs/MOBILE-APP-MESSAGING-UPDATE.md" "docs/features/"

# Move operations docs
move_if_exists "docs/MONITORING-GUIDE.md" "docs/operations/"
move_if_exists "docs/SCALING-PLAN.md" "docs/operations/"
move_if_exists "docs/SCALING-ACTION-PLAN.md" "docs/operations/"
move_if_exists "docs/TWILIO-SENDGRID-SETUP.md" "docs/operations/"
move_if_exists "docs/TWILIO-SENDGRID-QUICKSTART.md" "docs/operations/"

# Move tenant isolation docs to one place
mkdir -p docs/architecture/tenant-isolation
move_if_exists "docs/TENANT-ISOLATION-QUICK-REFERENCE.md" "docs/architecture/tenant-isolation/"
move_if_exists "docs/TENANT-ISOLATION-TESTING.md" "docs/architecture/tenant-isolation/"
move_if_exists "docs/TENANT-ISOLATION-TROUBLESHOOTING.md" "docs/architecture/tenant-isolation/"

# Archive review/analysis docs (one-time use)
move_if_exists "docs/ARCHITECTURAL-REVIEW-2025.md" "docs/archive/"
move_if_exists "docs/SENIOR-DEV-REVIEW.md" "docs/archive/"
move_if_exists "docs/ORDERING-PROCESS-REVIEW.md" "docs/archive/"
move_if_exists "docs/ROOM-SIZE-REFACTORING.md" "docs/archive/"

echo ""
echo "============================================"
echo "✅ Phase 2 complete!"
echo "   Total moved: $MOVED files"
echo "============================================"
