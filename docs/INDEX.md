# Tailtown Documentation

Project-wide documentation for the Tailtown Pet Resort Management System.

## For Developers (Quick Guides)

- **[Quick Start](./QUICK-START.md)** - Get running in 10 minutes
- **[Git Setup](./GIT-SETUP.md)** - Git workflow and rules
- **[Best Practices](./development/DEVELOPMENT-BEST-PRACTICES.md)** - Code standards and patterns
- **[Security](./security/SECURITY.md)** - Security features and how to use them
- **[Roadmap](./ROADMAP.md)** - What's next for Tailtown

## For Technical Leadership

- **[Senior Dev Review](./archive/SENIOR-DEV-REVIEW.md)** - ⭐ Architecture review & scaling roadmap (4/5 stars)
- **[System Architecture](./CURRENT-SYSTEM-ARCHITECTURE.md)** - Complete architecture overview
- **[Disaster Recovery](./operations/DISASTER-RECOVERY-PLAN.md)** - Backup & recovery procedures

## For AI Assistants (Complete Context)

- **[Security Implementation](./ai-context/security/)** - Complete security details
- **[Testing](./ai-context/testing/)** - Test analysis and maintenance
- **[Documentation Strategy](./DOCUMENTATION-STRATEGY.md)** - How we organize docs

## Reference

- **[Security Checklist](./security/SECURITY-CHECKLIST.md)** - Security verification
- **[Development Best Practices](./development/DEVELOPMENT-BEST-PRACTICES.md)** - Code standards

## Essential Reading

- **[Development Best Practices](./development/DEVELOPMENT-BEST-PRACTICES.md)** - ⭐ Common patterns & pitfalls
- **[Deployment Guide](./deployment/PRODUCTION-DEPLOYMENT.md)** - How to deploy to production
- **[Product Roadmap](./ROADMAP.md)** - Feature roadmap and priorities

## By Audience

- **For Developers:** [Development Guides](./development/)
- **For DevOps:** [Operations Guides](./operations/)
- **For Product:** [Feature Overview](./SYSTEM-FEATURES-OVERVIEW.md)

## Quick Links

| Document                                                | Description              |
| ------------------------------------------------------- | ------------------------ |
| [Quick Start](./QUICK-START.md)                         | Get running in 5 minutes |
| [System Architecture](./CURRENT-SYSTEM-ARCHITECTURE.md) | Current system design    |
| [Features Overview](./SYSTEM-FEATURES-OVERVIEW.md)      | Complete feature list    |
| [Roadmap](./ROADMAP.md)                                 | Future development plans |
| [Git Setup](./GIT-SETUP.md)                             | Git workflow and rules   |

## Directory Structure

```
docs/
├── INDEX.md                       # This file
├── QUICK-START.md                 # 5-minute setup guide
├── ROADMAP.md                     # Future plans
├── CURRENT-SYSTEM-ARCHITECTURE.md # System design
├── SYSTEM-FEATURES-OVERVIEW.md    # Feature documentation
├── CRITICAL-DOCS-REGISTRY.md      # Doc update tracking
├── DOCUMENTATION-STRATEGY.md      # AI vs Human docs strategy
│
├── architecture/                  # System design docs
│   ├── API-GATEWAY-DESIGN.md
│   ├── DATABASE-*.md
│   ├── SERVICE-ARCHITECTURE.md
│   └── tenant-isolation/          # Multi-tenancy docs
│
├── development/                   # Dev guidelines
│   ├── DEVELOPMENT-BEST-PRACTICES.md
│   ├── SchemaAlignmentStrategy.md
│   └── FormGuidelines.md
│
├── features/                      # Feature specs
│   ├── REPORT-CARD-DESIGN.md
│   ├── WAITLIST-DESIGN.md
│   ├── COUPON-SYSTEM.md
│   └── ... (47 feature docs)
│
├── testing/                       # Test documentation
│   ├── TESTING-STRATEGY.md
│   └── TEST-SETUP.md
│
├── deployment/                    # Deploy guides
│   ├── DEPLOYMENT-GUIDE.md
│   └── STAGING-ENVIRONMENT.md
│
├── security/                      # Security docs
│   ├── SECURITY-CHECKLIST.md
│   └── AUDIT-LOGGING-GUIDE.md
│
├── operations/                    # Ops guides
│   ├── MONITORING-GUIDE.md
│   └── SCALING-PLAN.md
│
├── changelog/                     # Release history
│   └── CHANGELOG.md
│
├── human/                         # Human-readable guides
│   └── SECURITY.md
│
├── ai-context/                    # AI assistant context
│   └── security/
│
└── archive/                       # Historical docs
    ├── sessions/                  # Session summaries
    ├── deployments/               # One-time deploy docs
    └── summaries/                 # Implementation summaries
```

## Service Documentation

Each app/service has its own `/docs/` directory:

- **Customer Service**: `/apps/customer-service/docs/`
- **Reservation Service**: `/apps/reservation-service/docs/`

## Documentation Guidelines

1. **File Naming Conventions**
    - Use UPPERCASE for main documentation files (e.g., README.md, SETUP.md)
    - Use kebab-case for specific topic documentation (e.g., api-authentication.md)
    - Use descriptive, consistent prefixes for related documents

2. **Documentation Location**
    - Project-wide documentation belongs in `/docs/` and its subdirectories
    - Service-specific documentation belongs in `/apps/{service-name}/docs/`
    - Implementation details should be in service-specific docs
    - Architecture and design decisions should be in project-wide docs

3. **Cross-referencing**
    - Use relative links when referencing other documentation files
    - Always use the format `[Link Text](./relative/path/to/file.md)`
    - Include section anchors when linking to specific sections: `[Link Text](./file.md#section)`

4. **Keeping Documentation Updated**
    - Update documentation when making significant code changes
    - Add new documentation for new features
    - Review and update existing documentation periodically
    - Mark outdated documentation with a note at the top and create a task to update it

## Contributing to Documentation

When adding new documentation:

1. Place it in the appropriate directory based on its scope and purpose
2. Follow the naming conventions
3. Update this INDEX.md file if adding a new major document
4. Update the main project README.md if the document should be featured there
