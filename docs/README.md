# Tailtown Documentation

This directory contains all project-wide documentation for the Tailtown Pet Resort Management System. We follow a standardized documentation structure to ensure consistency and ease of navigation.

## Documentation Structure

### Project-wide Documentation

- **Main Documentation** (root `/docs/` directory)

  - [Current State](./CURRENT_STATE.md) - Overview of the current system state and features
  - [Roadmap](./ROADMAP.md) - Future development plans
  - [Home](./Home.md) - Project introduction and overview
  - [Quick Start](./QUICK-START.md) - 5-minute setup guide

- **Architecture Documentation** (`/docs/architecture/`)

  - [Architecture Overview](./architecture/Architecture.md) - System architecture overview
  - [API Gateway](./architecture/API-GATEWAY.md) - API Gateway implementation (rate limiting, versioning, analytics) ✅ NEW
  - [API Service Layer](./architecture/API-SERVICE-LAYER.md) - API service layer design
  - [SaaS Implementation Progress](./architecture/SaaS-Implementation-Progress.md) - Progress on SaaS implementation
  - [Service Architecture](./architecture/SERVICE-ARCHITECTURE.md) - Microservice architecture documentation

- **Development Guidelines** (`/docs/development/`)

  - [Schema Alignment Strategy](./development/SchemaAlignmentStrategy.md) - Database schema management
  - [Express Route Ordering](./development/ExpressRouteOrderingBestPractices.md) - Best practices for Express.js routes
  - [Form Guidelines](./development/FormGuidelines.md) - UI form standards and patterns
  - [Staff Scheduling Implementation](./development/StaffSchedulingImplementation.md) - Staff scheduling features

- **Feature Documentation** (`/docs/features/`)

  - [Kennel Calendar](./features/KennelCalendar.md) - Kennel calendar implementation
  - [Reservations](./features/Reservations.md) - Reservation system details
  - [Add-On System](./features/AddOnSystem.md) - Service add-on implementation
  - [Checkout Process](./features/CheckoutProcess.md) - End-to-end checkout workflow
  - [Pet Report Cards](./REPORT-CARD-DESIGN.md) - Photo-rich report card system (NEW - v1.2.0)
  - [Report Card Deployment](./REPORT-CARD-DEPLOYMENT.md) - Deployment guide for report cards

- **Operations** (`/docs/operations/`)

  - [Environment Variables](./operations/Environment-Variables.md) - Documentation of environment variables
  - [DevOps](./operations/DevOps.md) - Deployment and operations guide
  - [Setup Guide](./operations/SETUP.md) - Comprehensive setup instructions for development

- **Developer Tools** (`/mcp-server/`)

  - [MCP RAG Server](../mcp-server/README.md) - AI-enhanced code search with semantic indexing

- **Changelog** (`/docs/changelog/`)
  - [Changelog](./changelog/CHANGELOG.md) - Comprehensive release notes and change history
  - [Kennel Selection Fix](./changelog/2025-05-11-kennel-selection-fix.md) - Specific fix documentation

### Service-specific Documentation

Service-specific documentation is located in each service's own docs directory:

- **Reservation Service** (`/services/reservation-service/docs/`)

  - [Testing Guide](../services/reservation-service/docs/TESTING-GUIDE.md) - Testing patterns and best practices
  - [TypeScript Fixes](../services/reservation-service/docs/TYPESCRIPT-FIXES.md) - TypeScript improvements
  - [Date Conflict Validation](../services/reservation-service/docs/DATE-CONFLICT-VALIDATION.md) - Reservation conflict detection

- **Customer Service** (`/services/customer/docs/`)
  - Service-specific documentation for the customer service

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
