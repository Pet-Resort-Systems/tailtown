# Troubleshooting Service Persistence Issues

## Quick Diagnostic Checklist

### 1. Verify Database Connection
```bash
# Check which PostgreSQL containers are running
docker ps | grep postgres

# Expected output should show tailtown-postgres on port 5433
# CONTAINER ID   IMAGE         PORTS                    NAMES
# xxxxxxxxxx     postgres:14   0.0.0.0:5433->5432/tcp   tailtown-postgres

# Verify DATABASE_URL in .env
cat apps/customer-service/.env | grep DATABASE_URL
# Should be: postgresql://postgres:postgres@localhost:5433/customer
```

### 2. Check Service Count in Database
```bash
# Count all services
docker exec tailtown-postgres psql -U postgres customer -c \
  "SELECT COUNT(*) FROM services;"

# Count by category and tenant
docker exec tailtown-postgres psql -U postgres customer -c \
  "SELECT \"tenantId\", \"serviceCategory\", COUNT(*) 
   FROM services 
   GROUP BY \"tenantId\", \"serviceCategory\" 
   ORDER BY \"tenantId\", \"serviceCategory\";"
```

### 3. Verify Schema Columns Exist
```bash
# Check for tenantId column
docker exec tailtown-postgres psql -U postgres customer -c \
  "SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'services' 
   AND column_name IN ('tenantId', 'createdAt', 'updatedAt');"
```

### 4. Test Service Creation
```bash
# Watch backend logs while creating a service
# You should see:
# [createService] Creating service: { name: '...', tenantId: 'dev', serviceCategory: 'GROOMING' }
# [createService] Service created: <uuid>
# [createService] Returning service: <uuid>
```

## Common Issues and Solutions

### Issue: "No services available" in dropdown

**Symptoms:**
- Services page shows services exist
- Grooming calendar shows "No services available"
- API returns 200 but empty array

**Diagnosis:**
```bash
# Check if services exist with correct category
docker exec tailtown-postgres psql -U postgres customer -c \
  "SELECT id, name, \"serviceCategory\", \"tenantId\" 
   FROM services 
   WHERE \"serviceCategory\" = 'GROOMING' 
   AND \"tenantId\" = 'dev';"
```

**Solutions:**
1. **Pagination Issue**: Frontend not requesting enough services
   - Check: `serviceManagement.getAllServices()` is called with `{ limit: 100 }`
   - Fix: Update Services.tsx to pass limit parameter

2. **Category Filter Not Applied**: Frontend filtering client-side instead of server-side
   - Check: API call includes `?category=GROOMING` parameter
   - Fix: Update component to pass category parameter

3. **Wrong Tenant**: Services created with different tenantId
   - Check: Verify tenantId in database matches frontend tenant
   - Fix: Ensure tenant middleware is setting correct tenantId

### Issue: Service creation returns 201 but service doesn't exist

**Symptoms:**
- POST /api/services returns 201 Created
- Service doesn't appear in database
- No error messages in logs

**Diagnosis:**
```bash
# Check backend logs for transaction errors
# Look for: [createService] logs

# Verify database schema
docker exec tailtown-postgres psql -U postgres customer -c "\d services"
```

**Solutions:**
1. **Missing Database Column**: tenantId column doesn't exist
   ```sql
   ALTER TABLE services ADD COLUMN "tenantId" VARCHAR(255) DEFAULT 'dev';
   ```

2. **Missing Default Value**: updatedAt or createdAt missing defaults
   ```sql
   ALTER TABLE services ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
   ALTER TABLE services ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
   ```

3. **Silent Transaction Rollback**: Check for database constraints
   ```bash
   docker exec tailtown-postgres psql -U postgres customer -c \
     "SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'services'::regclass;"
   ```

4. **Wrong Database**: Querying different database than Prisma is using
   - Verify: Check DATABASE_URL matches the container you're querying
   - Fix: Always use `tailtown-postgres` container name

### Issue: Services appear in one category but not another

**Symptoms:**
- BOARDING tab shows services
- GROOMING tab shows "No services found"
- Database has GROOMING services

**Diagnosis:**
```bash
# Count services by category
docker exec tailtown-postgres psql -U postgres customer -c \
  "SELECT \"serviceCategory\", COUNT(*) 
   FROM services 
   WHERE \"tenantId\" = 'dev' 
   GROUP BY \"serviceCategory\";"
```

**Solutions:**
1. **Pagination Hiding Services**: First 10 services are all BOARDING
   - Fix: Increase limit parameter to 100 or more
   - Fix: Use category filter on API call

2. **Client-Side Filtering**: Frontend filtering after fetch
   - Fix: Pass category parameter to API instead of filtering client-side

### Issue: Port 4004 already in use

**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::4004`
- Cannot start customer service

**Diagnosis:**
```bash
# Find process using port 4004
lsof -i:4004

# Output shows:
# COMMAND   PID    USER   FD   TYPE   DEVICE SIZE/OFF NODE NAME
# node      12345  user   25u  IPv6   ...      TCP *:pxc-roid (LISTEN)
```

**Solutions:**
```bash
# Kill the process
kill -9 <PID>

# Or kill all node processes on that port
lsof -ti:4004 | xargs kill -9

# Then restart
pnpm run dev
```

## Prevention Best Practices

### 1. Always Use Prisma Migrations
```bash
# After changing schema.prisma
cd apps/customer-service
pnpm exec prisma migrate dev --name add_new_field

# Never manually ALTER TABLE unless in emergency
```

### 2. Run Integration Tests
```bash
# Run service persistence tests
cd apps/customer-service
pnpm test -- service-persistence.test.ts
```

### 3. Verify After Deployment
```bash
# After deploying, verify schema
docker exec <container> psql -U postgres <database> -c "\d services"

# Verify service counts
docker exec <container> psql -U postgres <database> -c \
  "SELECT \"serviceCategory\", COUNT(*) FROM services GROUP BY \"serviceCategory\";"
```

### 4. Monitor Backend Logs
Watch for these log patterns:
- `[createService] Creating service:` - Service creation started
- `[createService] Service created:` - Service created successfully
- `[createService] Returning service:` - Service returned to client
- `[getAllServices] Found services: X` - Services retrieved

### 5. Use Correct Database Container
Always use the container name from `docker ps`:
```bash
# CORRECT
docker exec tailtown-postgres psql -U postgres customer -c "..."

# WRONG (unless you specifically need this container)
docker exec tailtown-customer-db-1 psql -U postgres customer -c "..."
```

## Emergency Recovery

If services are completely broken:

1. **Backup Current Data**:
```bash
docker exec tailtown-postgres pg_dump -U postgres customer > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Verify Schema**:
```bash
docker exec tailtown-postgres psql -U postgres customer -c "\d services"
```

3. **Add Missing Columns** (if needed):
```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS "tenantId" VARCHAR(255) DEFAULT 'dev';
ALTER TABLE services ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE services ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
```

4. **Update Existing Services** (if needed):
```sql
UPDATE services SET "tenantId" = 'dev' WHERE "tenantId" IS NULL;
```

5. **Restart Services**:
```bash
cd apps/customer-service
lsof -ti:4004 | xargs kill -9
pnpm run dev
```

6. **Test**:
   - Create a new service via UI
   - Verify it appears in database
   - Verify it appears in UI
   - Verify it's selectable in dropdowns

## Related Documentation
- [Service Persistence Fix Details](./SERVICE-PERSISTENCE-FIX.md)
- [Database Management](./DATABASE-MANAGEMENT.md)
- [Multi-Tenancy Implementation](./MULTI-TENANCY.md)
