# Database Migration for Reservation Service

This directory contains migration scripts to create the critical tables required by the reservation service.

## Overview

As part of our schema alignment strategy, we've created SQL migration scripts to ensure that all required tables exist in the database. This approach complements our defensive programming techniques by:

1. Creating the necessary tables if they don't exist
2. Ensuring proper indexes for performance and multi-tenant isolation
3. Setting up appropriate constraints and relationships

## Migration Files

- `create_critical_tables.sql`: SQL script to create all critical tables identified by our schema validation
- `apply_migrations.js`: Node.js script to apply the SQL migrations

## Critical Tables

The migration creates the following critical tables:

- `Customer`: Customer profiles with contact information
- `Pet`: Pet profiles linked to customers
- `Resource`: Resources like kennels or other facility resources
- `Reservation`: Reservation records with dates, status, and relationships
- `Service`: Service definitions (boarding, daycare, etc.)
- `AddOnService`: Add-on services that can be added to reservations
- `ReservationAddOn`: Junction table for reservation add-ons

## Running Migrations

Before running migrations, ensure your database connection is properly configured in the `.env` file:

```
DATABASE_URL=postgresql://username:password@localhost:5432/tailtown
```

To apply the migrations:

```bash
cd services/reservation-service
node prisma/migrations/apply_migrations.js
```

## Schema Alignment Strategy

These migrations are part of our broader schema alignment strategy, which includes:

1. Defensive programming in controllers
2. Safe query execution with fallbacks
3. Runtime schema validation
4. Database migrations for critical tables

By combining these approaches, we ensure that our API remains stable even when the schema differs between environments or evolves over time.

## Troubleshooting

If you encounter database connection issues:

1. Verify the `DATABASE_URL` in your `.env` file
2. Ensure PostgreSQL is running and accessible
3. Check that the database user has sufficient privileges

For schema-related issues, refer to our [Schema Alignment Strategy](../../docs/README-SCHEMA-ALIGNMENT.md) and the project-wide [Schema Alignment Strategy](../../../../docs/development/SchemaAlignmentStrategy.md) documentation.
