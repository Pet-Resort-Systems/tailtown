# Documentation Consumption Report

**Project:** Tailtown Pet Resort Management System  
**Scope:** Analysis of repo-authored Markdown documentation and recommended consumption strategy across the development lifecycle  
**Generated:** March 9, 2026

## Executive Summary

This repository contains a large Markdown corpus with a usable active set and a substantial historical layer.

- Total Markdown files found before filtering: `5,939`
- Repo-authored Markdown after excluding vendored/generated directories like `node_modules` and `playwright-report`: `420`
- Highest concentration of docs:
  - `docs/archive/` - 130 files
  - `docs/features/` - 52 files
  - `docs/changelog/` - 32 files
  - `docs/development/` - 22 files
  - `docs/architecture/` - 18 files
  - `docs/operations/` - 16 files
  - `docs/testing/` - 15 files

The documentation strategy is directionally sound: concise human-facing docs for execution, deeper AI/context and archive docs for implementation history and rationale. In practice, the best consumption model is selective rather than exhaustive.

## Key Findings

### 1. The repo already has a usable documentation hierarchy

The intended structure is visible in:

- [README.md](README.md)
- [docs/README.md](docs/README.md)
- [docs/DOCUMENTATION-STRATEGY.md](docs/DOCUMENTATION-STRATEGY.md)
- [docs/CRITICAL-DOCS-REGISTRY.md](docs/CRITICAL-DOCS-REGISTRY.md)

That structure breaks down into these functional layers:

- **Human quick guides**: fast onboarding and daily execution
- **Core current-state docs**: architecture, roadmap, features, testing, operations, security
- **Service-local docs**: implementation details per service
- **Historical/context docs**: archive, changelog, AI context, session summaries

### 2. Not all docs should be treated as equal sources of truth

The highest-trust docs for active engineering work are:

- [`docs/human/`](docs/human)
- [docs/CURRENT-SYSTEM-ARCHITECTURE.md](docs/CURRENT-SYSTEM-ARCHITECTURE.md)
- [`docs/development/`](docs/development)
- [`docs/testing/`](docs/testing)
- [`docs/security/`](docs/security)
- [`docs/operations/`](docs/operations)
- [`deployment/`](deployment)
- [`services/customer/docs/`](services/customer/docs)
- [`services/reservation-service/docs/`](services/reservation-service/docs)

Lower-trust but still useful docs:

- [`docs/features/`](docs/features) for product intent and domain framing
- [`docs/changelog/`](docs/changelog) for recent shipped behavior
- [`docs/completed/`](docs/completed) for milestone snapshots

Historical/reference-only by default:

- [`docs/archive/`](docs/archive)
- [`docs/ai-context/`](docs/ai-context)
- [`docs/sessions/`](docs/sessions)

### 3. Documentation hygiene is mixed

The documentation set is broad, but link integrity is weak.

- Broken local Markdown links detected during analysis: `378`
- Examples include stale references from [README.md](README.md)
- [docs/reference/DOCUMENTATION-INDEX.md](docs/reference/DOCUMENTATION-INDEX.md) appears to describe an older structure and should not be treated as a reliable navigation hub

This means the safe reading strategy is:

`curated current docs -> service docs -> code -> archives only if needed`

## Recommended Consumption Model

### Read First

Use these as the default working set:

- [README.md](README.md)
- [docs/README.md](docs/README.md)
- [docs/human/QUICK-START.md](docs/human/QUICK-START.md)
- [docs/human/COMMON-TASKS.md](docs/human/COMMON-TASKS.md)
- [docs/human/BEST-PRACTICES.md](docs/human/BEST-PRACTICES.md)
- [docs/CURRENT-SYSTEM-ARCHITECTURE.md](docs/CURRENT-SYSTEM-ARCHITECTURE.md)
- [`docs/development/`](docs/development)
- [`docs/testing/`](docs/testing)
- [`docs/security/`](docs/security)
- [`docs/operations/`](docs/operations)
- [`deployment/`](deployment)
- [`services/customer/docs/`](services/customer/docs)
- [`services/reservation-service/docs/`](services/reservation-service/docs)
- [docs/CRITICAL-DOCS-REGISTRY.md](docs/CRITICAL-DOCS-REGISTRY.md)

### Read On Demand

Use these when the task needs domain depth:

- [`docs/features/`](docs/features)
- [`docs/architecture/`](docs/architecture)
- [`docs/api/`](docs/api)
- [`docs/completed/`](docs/completed)
- [`docs/help-center/`](docs/help-center)
- [`docs/issues/`](docs/issues)
- [`docs/gingr/`](docs/gingr)
- [`load-tests/`](load-tests)
- [`monitoring/`](monitoring)
- [`performance/`](performance)

### Historical Only

Use these for archaeology, migrations, rationale, and prior attempts:

- [`docs/archive/`](docs/archive)
- [`docs/ai-context/`](docs/ai-context)
- [`docs/changelog/`](docs/changelog)
- [`docs/sessions/`](docs/sessions)

## Development Lifecycle Recommendations

### 1. Onboarding

Start with the human-oriented path:

1. `README.md`
2. [docs/README.md](docs/README.md)
3. [docs/human/QUICK-START.md](docs/human/QUICK-START.md)
4. [docs/human/COMMON-TASKS.md](docs/human/COMMON-TASKS.md)
5. [docs/human/BEST-PRACTICES.md](docs/human/BEST-PRACTICES.md)

This gets a developer productive faster than reading feature specs or archive material.

### 2. Product and Scope Discovery

Use:

1. [docs/SYSTEM-FEATURES-OVERVIEW.md](docs/SYSTEM-FEATURES-OVERVIEW.md)
2. [docs/ROADMAP.md](docs/ROADMAP.md)
3. Relevant file in [`docs/features/`](docs/features)

This works well for understanding what the system is supposed to do and what is still planned.

### 3. Architecture and Design Alignment

Use:

1. [docs/CURRENT-SYSTEM-ARCHITECTURE.md](docs/CURRENT-SYSTEM-ARCHITECTURE.md)
2. Relevant docs in [`docs/architecture/`](docs/architecture)
3. Service-local docs in [`services/customer/docs/`](services/customer/docs) or [`services/reservation-service/docs/`](services/reservation-service/docs)

This is the right sequence before changing a cross-cutting flow, service boundary, schema, or deployment surface.

### 4. Active Implementation

Use:

1. Relevant feature doc, if one exists in [`docs/features/`](docs/features)
2. Relevant docs under [`docs/development/`](docs/development)
3. Service docs under [`services/customer/docs/`](services/customer/docs) or [`services/reservation-service/docs/`](services/reservation-service/docs)
4. Code

The code should win over documentation where there is a conflict.

### 5. Testing and Hardening

Use:

1. [docs/testing/TESTING.md](docs/testing/TESTING.md)
2. [docs/testing/TESTING-STRATEGY.md](docs/testing/TESTING-STRATEGY.md)
3. Service-local test READMEs
4. [`docs/ai-context/testing/`](docs/ai-context/testing) only for deep failure analysis

### 6. Security Review

Use:

1. [docs/security/SECURITY-CHECKLIST.md](docs/security/SECURITY-CHECKLIST.md)
2. [docs/human/SECURITY.md](docs/human/SECURITY.md)
3. [`docs/security/`](docs/security)
4. [`docs/ai-context/security/`](docs/ai-context/security) only when you need implementation history

### 7. Deployment and Operations

Use:

1. [deployment/DEPLOYMENT-GUIDE.md](deployment/DEPLOYMENT-GUIDE.md)
2. [deployment/PRE-DEPLOY-CHECKLIST.md](deployment/PRE-DEPLOY-CHECKLIST.md)
3. [`docs/deployment/`](docs/deployment)
4. [`docs/operations/`](docs/operations)
5. [`docs/troubleshooting/`](docs/troubleshooting) when issues appear

### 8. Historical Investigation

Use:

1. [`docs/changelog/`](docs/changelog)
2. [`docs/archive/`](docs/archive)
3. [`docs/ai-context/`](docs/ai-context)
4. [`docs/sessions/`](docs/sessions)

This stage is useful for recovering rationale, migration history, and prior failed approaches.

## Doc-Consumption Matrix

| Development stage | Goal | Read first | Read if needed | Avoid by default | Notes |
| --- | --- | --- | --- | --- | --- |
| Onboarding | Get productive fast | [README.md](README.md), [docs/README.md](docs/README.md), [docs/human/QUICK-START.md](docs/human/QUICK-START.md), [docs/human/COMMON-TASKS.md](docs/human/COMMON-TASKS.md), [docs/human/BEST-PRACTICES.md](docs/human/BEST-PRACTICES.md) | [docs/operations/SETUP.md](docs/operations/SETUP.md), [docs/troubleshooting/SERVICE-STARTUP-GUIDE.md](docs/troubleshooting/SERVICE-STARTUP-GUIDE.md) | [`docs/archive/`](docs/archive), [`docs/ai-context/`](docs/ai-context) | Human docs are the best entrypoint. |
| Product discovery | Understand what the system does | [docs/SYSTEM-FEATURES-OVERVIEW.md](docs/SYSTEM-FEATURES-OVERVIEW.md), [docs/ROADMAP.md](docs/ROADMAP.md) | [`docs/features/`](docs/features), [`docs/completed/`](docs/completed), [docs/changelog/CHANGELOG.md](docs/changelog/CHANGELOG.md) | [`docs/archive/`](docs/archive) | Use features for intent; use changelog/completed for shipped behavior. |
| Architecture alignment | Understand boundaries and flows | [docs/CURRENT-SYSTEM-ARCHITECTURE.md](docs/CURRENT-SYSTEM-ARCHITECTURE.md), [docs/architecture/README.md](docs/architecture/README.md) | [`docs/architecture/`](docs/architecture), [services/customer/docs/README.md](services/customer/docs/README.md), [services/reservation-service/docs/README.md](services/reservation-service/docs/README.md) | [`docs/features/`](docs/features) as sole source of truth | Start broad, then drill into the service being changed. |
| Feature design | Plan a change in one domain | matching file in [`docs/features/`](docs/features) | [`docs/issues/`](docs/issues), related entries in [`docs/changelog/`](docs/changelog), relevant [`docs/architecture/`](docs/architecture) | [`docs/archive/`](docs/archive) unless current docs are unclear | Good stage for comparing intent vs implementation. |
| Active implementation | Write code with local conventions | [docs/development/WORKFLOW.md](docs/development/WORKFLOW.md), [docs/development/DEVELOPMENT-BEST-PRACTICES.md](docs/development/DEVELOPMENT-BEST-PRACTICES.md), relevant service docs | topic docs in [`docs/development/`](docs/development), service-specific guides in [`services/customer/docs/`](services/customer/docs) and [`services/reservation-service/docs/`](services/reservation-service/docs) | [docs/reference/DOCUMENTATION-INDEX.md](docs/reference/DOCUMENTATION-INDEX.md) | This is the highest-value working set for daily coding. |
| Testing | Validate behavior | [docs/testing/TESTING.md](docs/testing/TESTING.md), [docs/testing/TESTING-STRATEGY.md](docs/testing/TESTING-STRATEGY.md), service/local test READMEs | [`docs/testing/`](docs/testing), [docs/development/TESTING-GUIDE.md](docs/development/TESTING-GUIDE.md), [`docs/ai-context/testing/`](docs/ai-context/testing) | archive testing summaries | AI-context testing docs are useful only for stubborn failures or historical context. |
| Security review | Check controls before merge/deploy | [docs/security/SECURITY-CHECKLIST.md](docs/security/SECURITY-CHECKLIST.md), [docs/human/SECURITY.md](docs/human/SECURITY.md) | [`docs/security/`](docs/security), [`docs/ai-context/security/`](docs/ai-context/security) | old security summaries in archive | Checklist first, deep implementation notes second. |
| Deployment prep | Ship safely | [deployment/DEPLOYMENT-GUIDE.md](deployment/DEPLOYMENT-GUIDE.md), [deployment/PRE-DEPLOY-CHECKLIST.md](deployment/PRE-DEPLOY-CHECKLIST.md), [docs/deployment/PRODUCTION-DEPLOYMENT.md](docs/deployment/PRODUCTION-DEPLOYMENT.md) | [`docs/deployment/`](docs/deployment), [`docs/troubleshooting/`](docs/troubleshooting) | archived deployment runbooks unless investigating prior incidents | Prefer root `deployment/` first. |
| Operations and support | Run and maintain the system | [docs/operations/SETUP.md](docs/operations/SETUP.md), [docs/operations/DevOps.md](docs/operations/DevOps.md), [docs/operations/MONITORING-GUIDE.md](docs/operations/MONITORING-GUIDE.md) | other docs in [`docs/operations/`](docs/operations), [monitoring/README.md](monitoring/README.md), [performance/README.md](performance/README.md) | feature specs | Useful after the product is running, not before. |
| Incident/debugging | Resolve regressions and production issues | relevant file in [`docs/troubleshooting/`](docs/troubleshooting), recent entries in [`docs/changelog/`](docs/changelog) | service docs, testing docs, archive summaries if the problem has history | broad feature docs | Changelog is often the fastest way to find similar prior fixes. |
| Historical research | Recover rationale or prior attempts | [`docs/changelog/`](docs/changelog), [`docs/archive/`](docs/archive), [`docs/ai-context/`](docs/ai-context) | [`docs/gingr/`](docs/gingr), session notes | human quick-start docs | High value for migrations, edge cases, and archaeology; low value for routine work. |
| Documentation maintenance | Keep docs aligned with code | [docs/CRITICAL-DOCS-REGISTRY.md](docs/CRITICAL-DOCS-REGISTRY.md), [docs/DOCUMENTATION-STRATEGY.md](docs/DOCUMENTATION-STRATEGY.md), [docs/README.md](docs/README.md) | service READMEs, root README | archive unless archiving work itself | This is the governance layer. |

## Trust Hierarchy

When documents disagree, use this order:

1. Current code
2. Current core docs
3. Service-local docs
4. Feature docs
5. Changelog/completed docs
6. Archive and AI-context docs

## Suggested Team Practice

For routine development, do not attempt to read all Markdown in the repo. Use a stage-based reading strategy:

- **New engineer:** human docs first
- **New feature:** features -> architecture -> development -> service docs -> code
- **Bug fix:** troubleshooting -> changelog -> service docs -> code
- **Refactor:** architecture -> service docs -> testing -> code
- **Release:** security -> deployment -> operations -> troubleshooting

## Final Recommendation

The best approach is not full-document traversal. The best approach is **progressive disclosure**:

- Start with the smallest current document set that matches the task
- Expand only into service docs or technical deep dives as needed
- Use archive and AI-context docs only when current docs are insufficient
- Verify against code whenever a document appears stale, cross-links are broken, or structure references no longer match the repo
