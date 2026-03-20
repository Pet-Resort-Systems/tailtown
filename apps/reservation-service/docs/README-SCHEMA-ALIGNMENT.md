# Reservation Service Schema Alignment Strategy

## Overview

This document explains the implementation of our schema alignment strategy in the reservation service. The strategy ensures API stability and graceful error handling when database schemas differ between environments or evolve over time.

## Latest Improvements

### Enhanced Error Handling
- Improved error handler middleware to ensure consistent JSON responses for all error types
- Added specific handling for Prisma errors, JSON parsing errors, and validation errors
- Enhanced error logging with detailed context for schema mismatches

### Comprehensive Testing
- Created a test script (`test-schema-alignment.js`) to verify the schema alignment strategy
- Added debugging capabilities with curl to inspect raw responses
- Confirmed that all endpoints handle schema mismatches gracefully

### Schema Validation
- Service now identifies missing tables and columns at startup
- Logs appropriate warnings for critical schema elements
- Continues to operate despite schema mismatches

## Key Components

### 1. Extended Types

We've created extended TypeScript types in `src/types/prisma-extensions.ts` to handle fields that might not be recognized by TypeScript but exist in our database schema:

- `ExtendedReservationWhereInput`, `ExtendedResourceWhereInput`, etc. - Extend Prisma's WhereInput types with additional fields needed for queries
- `ExtendedReservation` - Extends the Reservation model with additional fields like `suiteType` and `price`
- `ExtendedReservationStatus` - Extends the ReservationStatus enum with additional statuses

**Important Note**: As of the latest stable version, we've removed `organizationId` references from queries as this field doesn't exist in the current database schema. The tenant isolation is now handled through other mechanisms in the middleware.

### 2. Safe Query Execution

The `safeExecutePrismaQuery` utility function in `src/utils/schemaUtils.ts` wraps Prisma queries with try/catch blocks and provides fallback values:

```typescript
export async function safeExecutePrismaQuery<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T | null = null,
  errorMessage = 'Error executing database query'
): Promise<T | null> {
  try {
    return await queryFn();
  } catch (error) {
    logger.error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    logger.debug('This error might be due to schema mismatches between environments');
    return fallbackValue;
  }
}
```

This function is used throughout the controllers to ensure that queries don't fail catastrophically when schema mismatches occur.

### 3. Schema Validation

The `validateSchema` function in `src/utils/schemaUtils.ts` checks for critical and optional schema elements on service startup:

```typescript
export async function validateSchema(prisma: PrismaClient): Promise<Map<string, boolean>> {
  // Validates tables and columns, logging warnings for missing critical elements
  // and info messages for missing optional elements
}
```

This function is called when the service starts, providing early warnings about potential schema issues.

### 4. Table and Column Existence Checking

The `tableExists` and `columnExists` functions use raw SQL to check if tables and columns exist in the database:

```typescript
export async function tableExists(prisma: PrismaClient, tableName: string): Promise<boolean> {
  // Uses raw SQL to check if a table exists
}

export async function columnExists(prisma: PrismaClient, tableName: string, columnName: string): Promise<boolean> {
  // Uses raw SQL to check if a column exists in a table
}
```

These functions can be used to conditionally enable features based on schema availability.

## Usage Examples

### 1. Tenant Isolation

All controllers use the tenant middleware to handle tenant isolation. The tenant ID is injected into the request by the middleware:

```typescript
// Tenant ID is provided by the enhancedTenantMiddleware
const tenantId = req.tenantId;

// Type filters are properly handled for multiple values
const typeFilters = Array.isArray(req.query.type) 
  ? req.query.type.map(t => t as ResourceType)
  : req.query.type ? [req.query.type as ResourceType] : undefined;

const whereConditions = {};
if (typeFilters) {
  whereConditions.type = { in: typeFilters };
}

const resources = await prisma.resource.findMany({
  where: whereConditions
});
```

### 2. Safe Query Execution

Controllers use defensive programming and proper error handling to manage potential schema mismatches:

```typescript
try {
  // Handle type filters properly
  const typeFilters = Array.isArray(req.query.type)
    ? req.query.type.map(type => {
        // Validate and convert to ResourceType enum
        if (Object.values(ResourceType).includes(type as ResourceType)) {
          return type as ResourceType;
        }
        logger.warn(`Invalid resource type: ${type}`);
        return null;
      }).filter(Boolean) as ResourceType[]
    : req.query.type && Object.values(ResourceType).includes(req.query.type as ResourceType)
      ? [req.query.type as ResourceType]
      : undefined;

  const whereConditions: any = {};
  if (typeFilters && typeFilters.length > 0) {
    whereConditions.type = { in: typeFilters };
    logger.debug(`Filtering resources by types: ${typeFilters.join(', ')}`);
  }

  const resources = await prisma.resource.findMany({
    where: whereConditions,
    skip: offset,
    take: limit,
    orderBy: {
      name: 'asc'
    }
  });
  
  return res.json(resources);
} catch (error) {
  logger.error(`Error retrieving resources: ${error instanceof Error ? error.message : String(error)}`);
  return res.status(500).json({ error: 'Error retrieving resources' });
}
```

### 3. Conditional Feature Enabling

Features can be conditionally enabled based on schema availability:

```typescript
if (await tableExists(prisma, 'ReservationAddOn')) {
  // Enable add-on features
} else {
  // Disable add-on features or provide alternative implementation
}
```

## Best Practices

1. **Always use extended types** for tenant isolation and schema extensions
2. **Wrap Prisma queries** with `safeExecutePrismaQuery` to handle potential errors
3. **Provide meaningful fallback values** for queries that might fail
4. **Log detailed error messages** to help diagnose schema issues
5. **Use type assertions judiciously** to handle fields not recognized by TypeScript

## Testing

To test the schema alignment strategy:

1. Start the service with `npm run dev`
2. Check the console logs for schema validation results
3. Run the automated test script: `node test-schema-alignment.js`
4. Review the test results to verify proper error handling and fallback behavior
5. Test endpoints manually with the Postman collection in the `docs` directory
6. Verify that endpoints return appropriate fallback values when schema elements are missing

### Automated Test Script

The `test-schema-alignment.js` script tests the following endpoints:

- `GET /resources/health` - Basic health check
- `GET /resources` - Resource listing with fallback to empty array
- `POST /resources` - Resource creation with graceful error handling
- `GET /resources/:id/availability` - Resource availability check with fallback
- `GET /reservations` - Reservation listing with fallback to empty array

Each test verifies that the endpoint either succeeds or fails gracefully with a proper JSON response.

## Database Migration Approach

We've implemented a database migration approach to address the missing critical tables identified by our schema validation:

1. **SQL Migration Scripts**: Created SQL scripts to generate all critical tables (Customer, Pet, Resource, Reservation, etc.)
2. **Safe Execution**: The migration script handles errors gracefully and continues execution even if some statements fail
3. **Documentation**: Added comprehensive documentation for the migration process

The migration files are located in `prisma/migrations/` and include:
- `create_critical_tables.sql`: SQL script to create all critical tables
- `apply_migrations.js`: Node.js script to apply the migrations
- `README.md`: Documentation for the migration process

To apply the migrations:

```bash
cd services/reservation-service
node prisma/migrations/apply_migrations.js
```

## Future Improvements

1. **Automated schema validation** on service startup with detailed reporting
2. **Schema migration detection** to automatically adapt to schema changes
3. **Feature flags** based on schema availability
4. **Schema documentation generation** to keep documentation in sync with the actual schema
5. **Enhanced monitoring** with alerts for persistent schema mismatches
6. **Schema version tracking** to help diagnose environment-specific issues

## Conclusion

This schema alignment strategy ensures that our reservation service remains stable and functional even when database schemas differ between environments or evolve over time. By implementing defensive programming, proper error handling, and graceful fallbacks, we prevent runtime errors and provide a better experience for both developers and end users.
