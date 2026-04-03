# Tailtown Documentation

Project-wide documentation for the Tailtown Pet Resort Management System.

## For Developers (Quick Guides)

- **[Quick Start](./QUICK-START.md)** - Get running quickly
- **[Git Setup](./GIT-SETUP.md)** - Git workflow and rules
- **[GitHub Workflows](./github/workflows/README.md)** - CI/CD pipelines, PR checks, and deployment workflows
- **[Development Best Practices](./development/DEVELOPMENT-BEST-PRACTICES.md)** - Code standards and patterns
- **[Security](./security/SECURITY.md)** - Security features and how to use them
- **[Roadmap](./ROADMAP.md)** - What's next for Tailtown

## Folder Indexes

Every docs sub-folder has an `INDEX.md` so you can quickly browse contents.

- **[api/](./api/INDEX.md)**
- **[archive/](./archive/)** *(historical docs; folder indexing intentionally excluded)*
- **[architecture/](./architecture/INDEX.md)**
- **[changelog/](./changelog/INDEX.md)**
- **[completed/](./completed/INDEX.md)**
- **[development/](./development/INDEX.md)**
- **[diagrams/](./diagrams/INDEX.md)**
- **[features/](./features/INDEX.md)**
- **[gingr/](./gingr/INDEX.md)**
- **[help-center/](./help-center/INDEX.md)**
- **[issues/](./issues/INDEX.md)**
- **[operations/](./operations/INDEX.md)**
- **[security/](./security/INDEX.md)**
- **[sessions/](./sessions/INDEX.md)**
- **[testing/](./testing/INDEX.md)**
- **[troubleshooting/](./troubleshooting/INDEX.md)**

## Essential Reading

- **[Current System Architecture](./CURRENT-SYSTEM-ARCHITECTURE.md)** - System architecture overview
- **[System Features Overview](./SYSTEM-FEATURES-OVERVIEW.md)** - Complete feature list
- **[Roadmap](./ROADMAP.md)** - Product roadmap and priorities
- **[Critical Docs Registry](./CRITICAL-DOCS-REGISTRY.md)** - Critical doc maintenance tracking

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
3. Update this `INDEX.md` file if adding a new major document or folder
4. Add or update the folder-level `INDEX.md` for the folder you changed
5. Update the main project `README.md` if the document should be featured there

## Service Documentation

Each app/service has its own `/docs/` directory:

- **Customer Service**: `/apps/customer-service/docs/`
- **Reservation Service**: `/apps/reservation-service/docs/`
