# Tailtown Documentation

Project-wide documentation for the Tailtown Pet Resort Management System.

## Quick Links

| Document                                                | Description              |
| ------------------------------------------------------- | ------------------------ |
| [Quick Start](./QUICK-START.md)                         | Get running in 5 minutes |
| [System Architecture](./CURRENT-SYSTEM-ARCHITECTURE.md) | Current system design    |
| [Features Overview](./SYSTEM-FEATURES-OVERVIEW.md)      | Complete feature list    |
| [Roadmap](./ROADMAP.md)                                 | Future development plans |

## Directory Structure

```
docs/
├── README.md                      # This file
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
│   ├── QUICK-START.md
│   └── COMMON-TASKS.md
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

Each service has its own `/docs/` directory:

- **Customer Service**: `/services/customer/docs/`
- **Reservation Service**: `/services/reservation-service/docs/`

## Documentation Guidelines

1. **File Naming Conventions**

   - Use UPPERCASE for main documentation files (e.g., README.md, SETUP.md)
   - Use kebab-case for specific topic documentation (e.g., api-authentication.md)
   - Use descriptive, consistent prefixes for related documents

2. **Documentation Location**

   - Project-wide documentation belongs in `/docs/` and its subdirectories
   - Service-specific documentation belongs in `/services/{service-name}/docs/`
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
3. Update this README.md file if adding a new major document
4. Update the main project README.md if the document should be featured there
