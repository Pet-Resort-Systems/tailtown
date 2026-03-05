# Customer Service Documentation

This directory contains documentation specific to the Customer Service implementation. These documents focus on technical details, implementation patterns, and service-specific guidelines.

## Available Documentation

- [Manual Test Plan](../src/tests/manual-test-plan.md) - Manual testing procedures for the customer service

## Service Overview

The Customer Service is responsible for:

1. Managing customer profiles and contact information
2. Handling pet records and vaccination information
3. Processing customer preferences and settings
4. Managing service catalog and pricing
5. Providing customer and pet data to other services

## Technical Implementation

- **Port**: 3003
- **Database**: PostgreSQL shared with Reservation Service
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma
- **Testing**: Jest

## Related Documentation

For architecture and design decisions that affect multiple services, please refer to the project-wide documentation:

- [Service Architecture](../../../docs/architecture/SERVICE-ARCHITECTURE.md) - Details on service boundaries and communication
- [API Service Layer](../../../docs/architecture/API-SERVICE-LAYER.md) - Shared API patterns and middleware
- [Schema Alignment Strategy](../../../docs/development/SchemaAlignmentStrategy.md) - Project-wide schema alignment approach
