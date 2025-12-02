# Documentation Maintenance Strategy

**How to keep critical docs up-to-date automatically**

---

## 🎯 The Problem

Critical docs (like disaster recovery, architecture, security) get outdated when:
- Code changes but docs don't
- New features are added
- Architecture evolves
- Security features are implemented

**Solution:** Automated triggers + AI assistance + regular reviews

---

## 🤖 Automated Documentation Updates

### 1. Git Hooks (Automatic Reminders)

Create a pre-commit hook that checks for doc updates:

**File:** `.git/hooks/pre-commit-docs`
```bash
#!/bin/bash

# Check if critical files changed
CRITICAL_CHANGES=$(git diff --cached --name-only | grep -E "(prisma/schema|middleware|security|auth)")

if [ ! -z "$CRITICAL_CHANGES" ]; then
    echo "⚠️  Critical files changed. Consider updating:"
    echo "   - docs/operations/DISASTER-RECOVERY-PLAN.md"
    echo "   - docs/CURRENT-SYSTEM-ARCHITECTURE.md"
    echo "   - docs/security/SECURITY-IMPLEMENTATION.md"
    echo ""
    echo "Continue? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

### 2. GitHub Actions (Automated Checks)

**File:** `.github/workflows/doc-check.yml`
```yaml
name: Documentation Check

on:
  pull_request:
    paths:
      - 'services/customer/prisma/schema.prisma'
      - 'services/**/src/middleware/**'
      - 'services/**/src/utils/jwt.ts'
      - '.env.example'

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check if docs updated
        run: |
          # Check if critical docs were modified in this PR
          DOCS_CHANGED=$(git diff --name-only origin/main | grep -E "docs/(operations|security)" || true)
          
          if [ -z "$DOCS_CHANGED" ]; then
            echo "::warning::Critical code changed but docs not updated"
            echo "Consider updating:"
            echo "- docs/operations/DISASTER-RECOVERY-PLAN.md"
            echo "- docs/CURRENT-SYSTEM-ARCHITECTURE.md"
          fi
```

### 3. AI-Assisted Updates (Use Cascade/AI)

When making changes, ask AI to update docs:

**Prompt Template:**
```
I just [made this change]. Please update the following docs:
1. docs/operations/DISASTER-RECOVERY-PLAN.md
2. docs/CURRENT-SYSTEM-ARCHITECTURE.md
3. docs/security/SECURITY-IMPLEMENTATION.md

Focus on sections related to [the change].
```

---

## 📋 Critical Docs Checklist

### Tier 1: Update Immediately (Breaking Changes)
- `DISASTER-RECOVERY-PLAN.md` - When DB schema, auth, or architecture changes
- `CURRENT-SYSTEM-ARCHITECTURE.md` - When services, ports, or structure changes
- `SECURITY-IMPLEMENTATION.md` - When security features added/changed
- `.env.example` files - When new env vars added

### Tier 2: Update Weekly (Feature Changes)
- Feature docs in `/docs/features/`
- API documentation
- Testing guides

### Tier 3: Update Monthly (General Updates)
- Roadmap
- System features overview
- Best practices

---

## 🔄 Automated Update Triggers

### Trigger Matrix

| Code Change | Docs to Update | Auto-Check |
|-------------|----------------|------------|
| `prisma/schema.prisma` | Disaster Recovery, Architecture | ✅ Git Hook |
| `middleware/*.ts` | Security Implementation, Architecture | ✅ Git Hook |
| `utils/jwt.ts` | Disaster Recovery, Security | ✅ Git Hook |
| `.env.example` | Disaster Recovery, Deployment | ✅ Git Hook |
| New service | Architecture, Disaster Recovery | ⚠️ Manual |
| New feature | Feature docs, Roadmap | ⚠️ Manual |
| Security feature | Security docs, Disaster Recovery | ✅ Git Hook |

---

## 🛠️ Implementation Plan

### Phase 1: Create Tracking File (Now)

**File:** `docs/CRITICAL-DOCS-REGISTRY.md`
```markdown
# Critical Documentation Registry

## Last Updated Tracking

| Document | Last Updated | Last Reviewed | Trigger |
|----------|--------------|---------------|---------|
| DISASTER-RECOVERY-PLAN.md | 2025-11-07 | 2025-11-07 | Schema change |
| CURRENT-SYSTEM-ARCHITECTURE.md | 2025-11-01 | 2025-11-01 | Service update |
| SECURITY-IMPLEMENTATION.md | 2025-11-07 | 2025-11-07 | Security feature |

## Update Rules

### When to Update DISASTER-RECOVERY-PLAN.md
- ✅ Database schema changes (new tables, fields)
- ✅ Authentication/authorization changes
- ✅ New environment variables
- ✅ Service configuration changes
- ✅ Security feature additions

### When to Update CURRENT-SYSTEM-ARCHITECTURE.md
- ✅ New services added
- ✅ Port changes
- ✅ Database architecture changes
- ✅ New dependencies
- ✅ Deployment changes
```

### Phase 2: Add Git Hook (5 minutes)

```bash
# Create the hook
cat > .git/hooks/pre-commit-docs << 'EOF'
#!/bin/bash

# Files that trigger doc updates
CRITICAL_FILES="prisma/schema|middleware|jwt.ts|.env.example"

# Check if any critical files changed
CHANGED=$(git diff --cached --name-only | grep -E "$CRITICAL_FILES")

if [ ! -z "$CHANGED" ]; then
    echo ""
    echo "⚠️  DOCUMENTATION UPDATE REMINDER"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Critical files changed:"
    echo "$CHANGED" | sed 's/^/  • /'
    echo ""
    echo "Consider updating:"
    echo "  📄 docs/operations/DISASTER-RECOVERY-PLAN.md"
    echo "  📄 docs/CURRENT-SYSTEM-ARCHITECTURE.md"
    echo "  📄 docs/security/SECURITY-IMPLEMENTATION.md"
    echo ""
    echo "Press Enter to continue or Ctrl+C to cancel..."
    read
fi
EOF

chmod +x .git/hooks/pre-commit-docs
```

### Phase 3: Add to PR Template (10 minutes)

**File:** `.github/PULL_REQUEST_TEMPLATE.md`
```markdown
## Documentation Checklist

- [ ] Updated relevant docs in `/docs/`
- [ ] Updated `.env.example` if new env vars added
- [ ] Updated DISASTER-RECOVERY-PLAN.md if schema/auth changed
- [ ] Updated architecture docs if services changed
- [ ] Updated security docs if security features added

## Critical Changes (check if applicable)

- [ ] Database schema changed → Update DISASTER-RECOVERY-PLAN.md
- [ ] Authentication changed → Update DISASTER-RECOVERY-PLAN.md
- [ ] New service added → Update CURRENT-SYSTEM-ARCHITECTURE.md
- [ ] Security feature added → Update SECURITY-IMPLEMENTATION.md
- [ ] Environment variables added → Update all .env.example files
```

### Phase 4: Calendar Reminders (Quarterly Reviews)

Set calendar reminders for:
- **Monthly:** Review Tier 2 docs (features, API)
- **Quarterly:** Review all critical docs
- **After major releases:** Full doc audit

---

## 🤖 AI-Assisted Workflow

### When Making Changes

1. **Make code changes**
2. **Ask AI to update docs:**
   ```
   I just added [feature]. Update these docs:
   - DISASTER-RECOVERY-PLAN.md (add verification step)
   - SECURITY-IMPLEMENTATION.md (add feature details)
   ```
3. **AI updates docs automatically**
4. **Review and commit together**

### Example Prompts

**For schema changes:**
```
I added a new table "RefreshToken" to the Prisma schema. 
Please update DISASTER-RECOVERY-PLAN.md to include:
1. Verification step for RefreshToken table
2. Critical tables list
3. Recovery checklist
```

**For security features:**
```
I implemented rate limiting. Please update:
1. DISASTER-RECOVERY-PLAN.md - Add rate limiting verification
2. SECURITY-IMPLEMENTATION.md - Document rate limiting config
3. CURRENT-SYSTEM-ARCHITECTURE.md - Add middleware info
```

---

## 📊 Tracking & Metrics

### Doc Freshness Dashboard

Create a simple script to check doc age:

**File:** `scripts/check-doc-freshness.sh`
```bash
#!/bin/bash

echo "📚 Documentation Freshness Report"
echo "=================================="
echo ""

CRITICAL_DOCS=(
    "docs/operations/DISASTER-RECOVERY-PLAN.md"
    "docs/CURRENT-SYSTEM-ARCHITECTURE.md"
    "docs/security/SECURITY-IMPLEMENTATION.md"
)

for doc in "${CRITICAL_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        LAST_MODIFIED=$(git log -1 --format="%ar" -- "$doc")
        echo "📄 $(basename $doc)"
        echo "   Last updated: $LAST_MODIFIED"
        echo ""
    fi
done
```

Run monthly: `./scripts/check-doc-freshness.sh`

---

## ✅ Best Practices

### 1. Update Docs in Same PR
- Don't create separate "doc update" PRs
- Update docs alongside code changes
- Makes review easier and keeps things in sync

### 2. Use AI Assistance
- Ask AI to update docs when making changes
- AI knows the context and can update accurately
- Faster than manual updates

### 3. Link Code to Docs
Add comments in critical code:
```typescript
// IMPORTANT: If you change this, update:
// - docs/operations/DISASTER-RECOVERY-PLAN.md
// - docs/security/SECURITY-IMPLEMENTATION.md
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
```

### 4. Version Critical Docs
Add version numbers and last updated dates:
```markdown
**Last Updated:** November 7, 2025  
**Version:** 2.0  
**Next Review:** February 7, 2026
```

### 5. Create Memory
When you update a critical doc, create a memory:
```
"Updated DISASTER-RECOVERY-PLAN.md for multi-tenancy on Nov 7, 2025.
Next update needed when: schema changes, auth changes, or new services added."
```

---

## 🎯 Quick Reference

### When You Change...

**Database Schema** → Update:
- ✅ DISASTER-RECOVERY-PLAN.md
- ✅ CURRENT-SYSTEM-ARCHITECTURE.md

**Authentication/Security** → Update:
- ✅ DISASTER-RECOVERY-PLAN.md
- ✅ SECURITY-IMPLEMENTATION.md
- ✅ SECURITY-CHECKLIST.md

**Services/Architecture** → Update:
- ✅ CURRENT-SYSTEM-ARCHITECTURE.md
- ✅ DISASTER-RECOVERY-PLAN.md

**Environment Variables** → Update:
- ✅ All .env.example files
- ✅ DISASTER-RECOVERY-PLAN.md

**Features** → Update:
- ✅ Feature docs in /docs/features/
- ✅ ROADMAP.md (if planned feature)

---

## 🚀 Implementation Checklist

- [ ] Create CRITICAL-DOCS-REGISTRY.md
- [ ] Add git hook for doc reminders
- [ ] Create PR template with doc checklist
- [ ] Add doc freshness check script
- [ ] Set calendar reminders for quarterly reviews
- [ ] Create memory about doc maintenance strategy
- [ ] Add comments in critical code linking to docs

---

**Remember:** The best documentation is the documentation that stays current. 
Use automation + AI + regular reviews to keep docs fresh! 🎯
