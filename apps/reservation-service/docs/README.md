# Reservation Service Documentation

This directory contains documentation specific to the Reservation Service implementation. These documents focus on technical details, implementation patterns, and service-specific guidelines.

## Available Documentation

- [Testing Guide](./TESTING-GUIDE.md) - Comprehensive guide to testing patterns, mocking strategies, and best practices for the reservation service
- [TypeScript Fixes](./TYPESCRIPT-FIXES.md) - Documentation of TypeScript improvements and patterns used in the reservation service
- [Date Conflict Validation](./DATE-CONFLICT-VALIDATION.md) - Technical details of the reservation conflict detection algorithm
- [Database Migration](./DATABASE-MIGRATION.md) - Procedures for database schema migrations
- [Schema Alignment](./README-SCHEMA-ALIGNMENT.md) - Service-specific schema alignment strategy
- [Refactoring Roadmap](./REFACTORING-ROADMAP.md) - Planned refactoring work for the reservation service
- [API Resources](./api-resources.md) - API endpoints and resource documentation

## Service Overview

The Reservation Service is responsible for:

1. Managing reservations for all service types (boarding, daycare, grooming, training)
2. Handling resource allocation and availability
3. Processing reservation add-ons and pricing
4. Detecting and preventing reservation conflicts
5. Providing availability information for resources

## Technical Implementation

- **Port**: 4003
- **Database**: PostgreSQL shared with Customer Service
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma
- **Testing**: Jest with custom mocking patterns
- **Security**: Comprehensive tenant isolation with automated testing (9/9 tests passing)

## Related Documentation

For architecture and design decisions that affect multiple services, please refer to the project-wide documentation:

- [Service Architecture](../../../docs/architecture/SERVICE-ARCHITECTURE.md) - Details on service boundaries and communication
- [API Service Layer](../../../docs/architecture/API-SERVICE-LAYER.md) - Shared API patterns and middleware
- [Schema Alignment Strategy](../../../docs/development/SchemaAlignmentStrategy.md) - Project-wide schema alignment approach
