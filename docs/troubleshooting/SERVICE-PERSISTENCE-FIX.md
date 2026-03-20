# Service Persistence Fix - November 2025

## Problem Summary
Grooming services were not persisting to the database despite receiving 201 responses from the API. Services would appear to save successfully but would not be retrievable afterward.

## Root Causes Identified

### 1. Multiple PostgreSQL Database Containers
**Issue**: Three PostgreSQL containers were running simultaneously:
- `tailtown-postgres` (port 5433) - The CORRECT database
- `tailtown-customer-db-1` (port 5435) - Wrong database
- `postgres-reservation` (port 5434) - Reservation service database

**Problem**: 
- Prisma was writing to `tailtown-postgres` (port 5433)
- Manual queries were checking `tailtown-customer-db-1` (port 5435)
- This made it appear that services weren't being saved

**Solution**: Always use the correct container name when querying:
```bash
# CORRECT
docker exec tailtown-postgres psql -U postgres customer -c "SELECT * FROM services;"

# WRONG
docker exec tailtown-customer-db-1 psql -U postgres customer -c "SELECT * FROM services;"
```

### 2. Missing Database Schema Columns
**Issue**: The `services` table in the database was missing the `tenantId` column, even though the Prisma schema defined it.

**Problem**: 
- Prisma schema had `tenantId String @default("dev")`
- Database table did not have the `tenantId` column
- This caused silent transaction failures

**Solution**: Added the column manually via SQL:
```sql
ALTER TABLE services ADD COLUMN "tenantId" VARCHAR(255) DEFAULT 'dev';
```

**Prevention**: Always run Prisma migrations after schema changes:
```bash
cd apps/customer-service
pnpm exec prisma migrate dev --name descriptive_migration_name
```

### 3. Missing Default Value for updatedAt
**Issue**: The `updatedAt` column was marked as `NOT NULL` but had no default value.

**Problem**:
- Prisma's `@updatedAt` directive requires database-level support
- PostgreSQL table was missing the default value
- Transactions were failing silently

**Solution**: Added default value via SQL:
```sql
ALTER TABLE services ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
```

### 4. Pagination Limiting Service Visibility
**Issue**: The API was only returning 10 services by default, and all 10 were BOARDING services.

**Problem**:
- Default `limit = 10` in `getAllServices` controller
- Frontend was fetching all services, then filtering client-side
- GROOMING services existed in the database but weren't in the first 10 results
- This made it appear that no GROOMING services existed

**Solution**: 
- Updated frontend to request `limit: 100` to get all services
- Added support for `category` parameter to filter server-side

## Files Modified

### Backend Changes
1. `/apps/customer-service/src/controllers/service.controller.ts`
   - Added `tenantId` to service creation data
   - Removed problematic `findUnique` query inside transaction
   - Added debug logging for troubleshooting

2. `/apps/customer-service/prisma/schema.prisma`
   - Verified `tenantId` field exists on Service model
   - Confirmed `@updatedAt` directive on updatedAt field

### Frontend Changes
1. `/apps/frontend/src/services/serviceManagement.ts`
   - Updated `getAllServices` to accept `params?: { category?: string; limit?: number; page?: number }`
   - Allows filtering by category and increasing result limit

2. `/apps/frontend/src/pages/services/Services.tsx`
   - Updated to call `getAllServices({ limit: 100 })`
   - Ensures all services are fetched, not just first 10

### Database Changes
1. Added `tenantId` column to services table
2. Added default value for `updatedAt` column

## Testing Verification

### Manual Testing Steps
1. **Verify Database Connection**:
```bash
# Check which containers are running
docker ps | grep postgres

# Verify DATABASE_URL in .env matches the correct container
cat apps/customer-service/.env | grep DATABASE_URL
# Should be: postgresql://postgres:postgres@localhost:5433/customer
```

2. **Test Service Creation**:
```bash
# Create a service via the UI
# Then verify it exists in the database:
docker exec tailtown-postgres psql -U postgres customer -c \
  "SELECT id, name, \"tenantId\", \"serviceCategory\" FROM services WHERE \"serviceCategory\" = 'GROOMING';"
```

3. **Verify Service Counts by Category**:
```bash
docker exec tailtown-postgres psql -U postgres customer -c \
  "SELECT \"tenantId\", \"serviceCategory\", COUNT(*) FROM services GROUP BY \"tenantId\", \"serviceCategory\";"
```

4. **Test Frontend Display**:
   - Navigate to Admin → Services
   - Click on GROOMING tab
   - Verify services appear
   - Navigate to Grooming Calendar
   - Create a reservation
   - Verify grooming services appear in the dropdown

## Prevention Measures

### 1. Always Use Prisma Migrations
Never manually alter the database schema. Always use Prisma migrations:
```bash
# After changing schema.prisma
cd apps/customer-service
pnpm exec prisma migrate dev --name descriptive_name
```

### 2. Verify Database Connection
Add this check to your development workflow:
```bash
# Verify you're using the correct database
docker exec tailtown-postgres psql -U postgres customer -c "SELECT current_database();"
```

### 3. Add Integration Tests
See `SERVICE-PERSISTENCE-TESTS.md` for test implementation details.

### 4. Monitor Transaction Success
The backend now includes logging for service creation:
```
[createService] Creating service: { name: '...', tenantId: 'dev', serviceCategory: 'GROOMING' }
[createService] Service created: <uuid>
[createService] Returning service: <uuid>
```

Watch for these logs to confirm successful creation.

## Common Issues and Solutions

### Issue: "No services found" in GROOMING tab
**Cause**: Pagination limit too low or services have wrong tenantId
**Solution**: 
1. Check database: `SELECT COUNT(*) FROM services WHERE "serviceCategory" = 'GROOMING' AND "tenantId" = 'dev';`
2. Verify frontend is passing `limit: 100`
3. Check that services have correct tenantId

### Issue: Service creation returns 201 but service doesn't exist
**Cause**: Database schema mismatch or transaction rollback
**Solution**:
1. Check backend logs for transaction errors
2. Verify all required columns have default values
3. Run `pnpm exec prisma db push` to sync schema

### Issue: Multiple PostgreSQL containers causing confusion
**Cause**: Docker containers from different development sessions
**Solution**:
1. Document which container is the source of truth
2. Always use container name (not port) when querying
3. Consider consolidating to a single database container

## Related Documentation
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Multi-Tenancy Implementation](./MULTI-TENANCY.md)
- [Database Management](./DATABASE-MANAGEMENT.md)

## Lessons Learned
1. **Always verify which database you're querying** - Multiple containers can cause confusion
2. **Database schema must match Prisma schema** - Run migrations after every schema change
3. **Pagination can hide data** - Always consider default limits when debugging "missing" data
4. **Silent transaction failures are dangerous** - Add comprehensive logging
5. **Test with realistic data volumes** - Issues may only appear when you have more than 10 records
