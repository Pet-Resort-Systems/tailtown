# Critical Documentation Registry

**Purpose:** Track when critical docs were last updated and when they need review

---

## 📊 Last Updated Tracking

| Document                       | Last Updated | Last Reviewed | Next Review | Trigger                                     |
| ------------------------------ | ------------ | ------------- | ----------- | ------------------------------------------- |
| DISASTER-RECOVERY-PLAN.md      | 2025-11-07   | 2025-11-07    | 2026-02-07  | DigitalOcean backups enabled                |
| CURRENT-SYSTEM-ARCHITECTURE.md | 2025-11-26   | 2025-11-26    | 2026-02-26  | ResourceType enum expansion, calendar fixes |
| SECURITY-CHECKLIST.md          | 2025-11-07   | 2025-11-07    | 2026-02-07  | Security implementation                     |
| DEVELOPMENT-BEST-PRACTICES.md  | 2025-11-07   | 2025-11-07    | 2026-02-07  | Best practices added                        |
| TESTING-STRATEGY.md            | 2025-10-30   | 2025-10-30    | 2026-01-30  | Test updates                                |
| ROADMAP.md                     | 2025-11-26   | 2025-11-26    | 2026-02-26  | Calendar & auto-selection fixes completed   |
| DEPLOYMENT-TROUBLESHOOTING.md  | 2025-11-26   | 2025-11-26    | 2026-02-26  | Added database data quality issues          |

---

## 🎯 Update Rules

### DISASTER-RECOVERY-PLAN.md

**Update when:**

- ✅ Database schema changes (new tables, fields)
- ✅ Authentication/authorization changes
- ✅ New environment variables required
- ✅ Service configuration changes
- ✅ Security feature additions
- ✅ Multi-tenant architecture changes

**Last major changes:**

- Nov 7, 2025: Added multi-tenancy, security features, RefreshToken table

### CURRENT-SYSTEM-ARCHITECTURE.md

**Update when:**

- ✅ New services added
- ✅ Port changes
- ✅ Database architecture changes
- ✅ New dependencies added
- ✅ Deployment process changes
- ✅ Microservice communication changes

**Last major changes:**

- Nov 26, 2025: Added ResourceType enum expansion, calendar fixes, database data quality fix
- Nov 1, 2025: Updated service descriptions

### SECURITY-CHECKLIST.md

**Update when:**

- ✅ New security features implemented
- ✅ Security vulnerabilities fixed
- ✅ Authentication mechanism changes
- ✅ Authorization rules change
- ✅ Security audit findings

**Last major changes:**

- Nov 7, 2025: Added rate limiting, account lockout, refresh tokens

### DEVELOPMENT-BEST-PRACTICES.md

**Update when:**

- ✅ New coding patterns established
- ✅ New tools/libraries adopted
- ✅ Team decides on new standards
- ✅ Common mistakes identified
- ✅ New security practices

**Last major changes:**

- Nov 7, 2025: Created comprehensive best practices guide

### TESTING-STRATEGY.md

**Update when:**

- ✅ New testing tools adopted
- ✅ Testing approach changes
- ✅ Coverage requirements change
- ✅ New test types added

**Last major changes:**

- Oct 30, 2025: Updated test coverage requirements

### ROADMAP.md

**Update when:**

- ✅ Features completed
- ✅ Priorities change
- ✅ New features planned
- ✅ Timeline adjustments

**Last major changes:**

- Nov 26, 2025: Marked calendar resource display & auto-selection as completed
- Nov 7, 2025: Created clean roadmap with v1.1, v1.2, v2.0 plans

### DEPLOYMENT-TROUBLESHOOTING.md

**Update when:**

- ✅ New deployment issues discovered
- ✅ Production fixes implemented
- ✅ PM2 configuration changes
- ✅ Server environment changes
- ✅ New troubleshooting procedures developed

**Last major changes:**

- Nov 26, 2025: Added database data quality issues section (trailing spaces, string matching)
- Nov 18, 2025: Created comprehensive deployment troubleshooting guide based on production IPv6 and node-fetch issues

---

## 🔔 Automated Triggers

### Code Changes That Require Doc Updates

| File/Pattern Changed      | Docs to Update                          | Priority    |
| ------------------------- | --------------------------------------- | ----------- |
| `prisma/schema.prisma`    | DISASTER-RECOVERY-PLAN.md, ARCHITECTURE | 🔴 Critical |
| `middleware/*.ts`         | SECURITY-CHECKLIST.md, ARCHITECTURE     | 🔴 Critical |
| `utils/jwt.ts`            | DISASTER-RECOVERY-PLAN.md, SECURITY     | 🔴 Critical |
| `.env.example`            | DISASTER-RECOVERY-PLAN.md               | 🔴 Critical |
| `routes/*.ts`             | API docs, ARCHITECTURE                  | 🟡 Medium   |
| `controllers/*.ts`        | Feature docs                            | 🟡 Medium   |
| `package.json` (new deps) | ARCHITECTURE, BEST-PRACTICES            | 🟡 Medium   |
| `docker-compose.yml`      | DISASTER-RECOVERY-PLAN.md, DEPLOYMENT   | 🔴 Critical |

---

## 📅 Review Schedule

### Monthly Reviews (1st of each month)

- [ ] Check all Tier 1 docs for accuracy
- [ ] Update feature docs for completed features
- [ ] Review and update ROADMAP.md

### Quarterly Reviews (Jan, Apr, Jul, Oct)

- [ ] Full audit of all critical docs
- [ ] Update version numbers
- [ ] Check all links still work
- [ ] Verify all code examples are current
- [ ] Update "Last Reviewed" dates

### Annual Reviews (January)

- [ ] Complete documentation overhaul
- [ ] Archive outdated docs
- [ ] Reorganize if needed
- [ ] Update all contact information

---

## 🤖 AI-Assisted Update Workflow

### Step 1: Make Code Change

```typescript
// Example: Add new security feature
export const newSecurityFeature = () => {
  // implementation
};
```

### Step 2: Ask AI to Update Docs

```
I just added [feature]. Please update:
1. docs/operations/DISASTER-RECOVERY-PLAN.md
2. docs/security/SECURITY-CHECKLIST.md
3. docs/CURRENT-SYSTEM-ARCHITECTURE.md

Focus on [specific sections].
```

### Step 3: Review AI Updates

- Check accuracy
- Verify completeness
- Ensure consistency

### Step 4: Commit Together

```bash
git add src/new-feature.ts docs/
git commit -m "feat: add new feature + update docs"
```

---

## ✅ Checklist for PR Reviews

When reviewing PRs, check:

- [ ] If schema changed, DISASTER-RECOVERY-PLAN.md updated?
- [ ] If security changed, SECURITY-CHECKLIST.md updated?
- [ ] If architecture changed, CURRENT-SYSTEM-ARCHITECTURE.md updated?
- [ ] If env vars added, .env.example files updated?
- [ ] If new feature, feature docs created/updated?
- [ ] Version numbers incremented if major doc changes?

---

## 🎯 Quick Reference

### "I just changed the database schema"

→ Update: DISASTER-RECOVERY-PLAN.md, CURRENT-SYSTEM-ARCHITECTURE.md

### "I just added a security feature"

→ Update: DISASTER-RECOVERY-PLAN.md, SECURITY-CHECKLIST.md, SECURITY-IMPLEMENTATION.md

### "I just added a new service"

→ Update: CURRENT-SYSTEM-ARCHITECTURE.md, DISASTER-RECOVERY-PLAN.md, DEPLOYMENT docs

### "I just added environment variables"

→ Update: All .env.example files, DISASTER-RECOVERY-PLAN.md

### "I just completed a feature"

→ Update: Feature docs, ROADMAP.md (mark complete)

---

## 📈 Metrics

### Doc Freshness Score

- **Green (< 1 month old):** ✅ Current
- **Yellow (1-3 months old):** ⚠️ Review soon
- **Red (> 3 months old):** 🔴 Update needed

### Current Status

- DISASTER-RECOVERY-PLAN.md: ✅ Green (updated Nov 7, 2025)
- CURRENT-SYSTEM-ARCHITECTURE.md: ✅ Green (updated Nov 26, 2025)
- SECURITY-CHECKLIST.md: ✅ Green (updated Nov 7, 2025)
- DEVELOPMENT-BEST-PRACTICES.md: ✅ Green (updated Nov 7, 2025)
- TESTING-STRATEGY.md: ⚠️ Yellow (updated Oct 30, 2025)
- ROADMAP.md: ✅ Green (updated Nov 26, 2025)
- DEPLOYMENT-TROUBLESHOOTING.md: ✅ Green (updated Nov 26, 2025)

---

**Last Registry Update:** November 26, 2025  
**Next Registry Review:** December 1, 2025
