# Database Migration Guide for Reservation Service

This guide explains how to diagnose database connection issues and apply migrations to ensure your database schema is properly aligned with the Reservation Service requirements.

## Overview

The Reservation Service implements a robust schema alignment strategy that allows the API to function even when the database schema is not perfectly aligned with the expected schema. However, for optimal functionality, it's recommended to ensure the database has all the required tables and columns.

## Prerequisites

- Node.js (v14+)
- PostgreSQL database
- Valid DATABASE_URL in your `.env` file

## Step 1: Test Database Connection

Before applying migrations, verify that your database connection is working properly:

```bash
# Navigate to the reservation service directory
cd services/reservation-service

# Run the database connection test script
node scripts/test-db-connection.js
```

This script will:
- Validate your DATABASE_URL format
- Test the connection to your PostgreSQL database
- Show sample tables if the connection is successful
- Provide troubleshooting guidance if the connection fails

### Common Connection Issues

1. **Authentication Failed**:
   - Verify the username and password in your DATABASE_URL
   - Ensure the user has appropriate permissions

2. **Connection Refused**:
   - Check if PostgreSQL is running
   - Verify the host and port in your DATABASE_URL

3. **Database Does Not Exist**:
   - Create the database using PostgreSQL commands:
     ```sql
     CREATE DATABASE tailtown;
     ```

## Step 2: Apply Database Migrations

Once your database connection is working, apply the migrations to create the necessary tables:

```bash
# Navigate to the reservation service directory
cd services/reservation-service

# Run the migration script
node prisma/migrations/apply_migrations.js
```

This will create all the critical tables required by the Reservation Service:
- Customer
- Pet
- Resource
- Reservation
- Service
- AddOnService
- ReservationAddOn

## Step 3: Verify Schema Alignment

After applying migrations, start the Reservation Service to verify that the schema is properly aligned:

```bash
# Navigate to the reservation service directory
cd services/reservation-service

# Start the service
npm start
```

The service will perform schema validation on startup and display the results:
- ✅ Success: All critical tables and columns exist
- ⚠️ Warning: Missing tables or columns with suggestions for fixing

## Schema Alignment Strategy

The Reservation Service implements a comprehensive schema alignment strategy that includes:

1. **Defensive Programming**:
   - Type validation for query parameters (especially for enum values like ResourceType)
   - Graceful error handling for schema mismatches
   - Proper logging of validation issues and schema errors

2. **Runtime Schema Validation**:
   - Optional validation of critical tables and columns on service startup (can be disabled for stability)
   - Detailed reporting of missing schema elements

3. **Shared Schema Approach**:
   - Customer and Reservation services share the same database schema
   - Prisma schema synchronized between services to avoid mismatches
   - Field name consistency enforced (e.g., using 'birthdate' instead of 'age' for Pet model)

4. **Database Migrations**:
   - SQL scripts to create missing tables and columns
   - Safe execution that handles errors gracefully

For more details on the schema alignment strategy, see [README-SCHEMA-ALIGNMENT.md](./README-SCHEMA-ALIGNMENT.md).

## Troubleshooting

### Missing Tables After Migration

If tables are still missing after running migrations:
1. Check the migration script output for errors
2. Verify that your database user has permission to create tables
3. Try running the SQL script directly using a PostgreSQL client

### Schema Validation Warnings

If you see schema validation warnings when starting the service:
1. Check which tables or columns are missing
2. Run the migration script again
3. Verify that the migration completed successfully

### Database User Permissions

The database user needs the following permissions:
- CREATE TABLE
- INSERT, UPDATE, DELETE, SELECT
- CREATE INDEX

You can grant these permissions using:

```sql
GRANT ALL PRIVILEGES ON DATABASE tailtown TO your_user;
```

## Next Steps

After successfully applying migrations and verifying schema alignment:

1. Run the test script to verify API functionality:
   ```bash
   node test-schema-alignment.js
   ```

2. Continue with your development or deployment process

3. Consider setting up automated schema validation and migration as part of your CI/CD pipeline
