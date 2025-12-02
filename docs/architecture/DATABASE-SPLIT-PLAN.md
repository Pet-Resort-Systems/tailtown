# Database Split Implementation Plan

**Status:** 📋 PLANNED - Not Yet Implemented  
**Priority:** MEDIUM (can wait until scaling issues arise)  
**Estimated Time:** 4-6 hours  
**Complexity:** HIGH  
**Risk:** MEDIUM-HIGH

---

## 🎯 Objective

Split the shared PostgreSQL database into two separate databases:
- **Customer Database:** For Customer Service
- **Reservation Database:** For Reservation Service

This enables true microservice independence for deployment, scaling, and schema evolution.

---

## 📊 Current State

```
┌─────────────────┐    ┌──────────────────┐
│ Customer Service│    │Reservation Service│
│   (Port 4004)   │    │   (Port 4003)    │
└────────┬────────┘    └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    │
            ┌───────▼────────┐
            │   PostgreSQL   │
            │    (Shared)    │
            │   Port 5433    │
            └────────────────┘
```

**Problems:**
1. Single point of failure
2. Can't scale databases independently
3. Schema changes affect both services
4. Cross-service queries possible (bad practice)

---

## 🎯 Target State

```
┌─────────────────┐              ┌──────────────────┐
│ Customer Service│              │Reservation Service│
│   (Port 4004)   │              │   (Port 4003)    │
└────────┬────────┘              └────────┬─────────┘
         │                                │
         │ HTTP API                       │
         │ Calls                          │
         │ ◄──────────────────────────────┘
         │
┌────────▼─────────┐            ┌─────────▼─────────┐
│ Customer Database│            │Reservation Database│
│   Port 5433      │            │   Port 5434       │
└──────────────────┘            └───────────────────┘
```

**Benefits:**
1. ✅ Independent database scaling
2. ✅ Independent schema evolution
3. ✅ No cross-service queries
4. ✅ True microservice isolation
5. ✅ Can use different database types if needed

---

## 📋 Implementation Steps

### Phase 1: Planning & Preparation (1 hour)

#### 1.1 Identify Tables
Determine which tables belong to which service:

**Customer Service Tables:**
- `Customer`
- `Pet`
- `Staff`
- `Service`
- `Resource`
- `Suite`
- `Product`
- `ProductCategory`
- `PackageContent`
- `InventoryLog`
- `PriceRule`
- `Coupon`
- `LoyaltyProgram`
- `LoyaltyTransaction`
- `Deposit`
- `MultiPetDiscount`
- `ChecklistTemplate`
- `ChecklistItem`
- `Invoice`
- `InvoiceItem`
- `Payment`
- `Addon`
- `Schedule`
- `GroomerAppointment`
- `TrainingClass`
- `Enrollment`
- `VaccineRequirement`
- `Announcement`
- `BusinessSettings`
- `MessageTemplate`
- `Tenant`
- `CustomIcon`

**Reservation Service Tables:**
- `Reservation`
- `ReservationAddon`
- `ReservationService`

**Shared/Reference Tables (Need Decision):**
- `Tenant` - Keep in Customer Service, reference by ID in Reservation Service
- `User` - Keep in Customer Service (authentication service)

#### 1.2 Identify Foreign Keys
Map all foreign key relationships between services:

**Cross-Service References:**
- `Reservation.customerId` → `Customer.id` (Customer Service)
- `Reservation.petId` → `Pet.id` (Customer Service)
- `Reservation.resourceId` → `Resource.id` (Customer Service)
- `Reservation.serviceId` → `Service.id` (Customer Service)
- `ReservationAddon.addonId` → `Addon.id` (Customer Service)
- `ReservationService.serviceId` → `Service.id` (Customer Service)

**Decision:** Remove foreign key constraints for cross-service references. Use API calls for validation instead.

#### 1.3 Create Backup
```bash
# Backup current database
pg_dump -h localhost -p 5433 -U postgres customer > backup-before-split-$(date +%Y%m%d).sql
```

---

### Phase 2: Create New Database (30 minutes)

#### 2.1 Create Reservation Database
```bash
# Connect to PostgreSQL
psql -h localhost -p 5433 -U postgres

# Create new database
CREATE DATABASE reservation;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE reservation TO postgres;
```

#### 2.2 Update Environment Variables

**Reservation Service `.env`:**
```bash
# OLD
DATABASE_URL="postgresql://postgres:password@localhost:5433/customer?schema=public"

# NEW
DATABASE_URL="postgresql://postgres:password@localhost:5433/reservation?schema=public"
```

**Customer Service `.env`:**
```bash
# No change needed
DATABASE_URL="postgresql://postgres:password@localhost:5433/customer?schema=public"
```

---

### Phase 3: Update Prisma Schemas (1 hour)

#### 3.1 Split Prisma Schema

**Customer Service** (`services/customer/prisma/schema.prisma`):
- Keep all customer-related models
- Remove `Reservation`, `ReservationAddon`, `ReservationService` models

**Reservation Service** (`services/reservation-service/prisma/schema.prisma`):
- Keep only `Reservation`, `ReservationAddon`, `ReservationService` models
- Remove foreign key constraints to Customer Service tables
- Add comments explaining cross-service references

Example:
```prisma
model Reservation {
  id         String   @id @default(uuid())
  tenantId   String
  
  // Cross-service reference (validated via API)
  // References Customer.id in Customer Service
  customerId String
  
  // Cross-service reference (validated via API)
  // References Pet.id in Customer Service
  petId      String
  
  // ... other fields
}
```

#### 3.2 Generate Prisma Clients
```bash
# Customer Service
cd services/customer
npx prisma generate

# Reservation Service
cd services/reservation-service
npx prisma generate
```

---

### Phase 4: Data Migration (1-2 hours)

#### 4.1 Export Reservation Data
```sql
-- Export reservation tables
COPY (SELECT * FROM "Reservation") TO '/tmp/reservations.csv' CSV HEADER;
COPY (SELECT * FROM "ReservationAddon") TO '/tmp/reservation_addons.csv' CSV HEADER;
COPY (SELECT * FROM "ReservationService") TO '/tmp/reservation_services.csv' CSV HEADER;
```

#### 4.2 Create Schema in Reservation Database
```bash
cd services/reservation-service
npx prisma migrate dev --name init
```

#### 4.3 Import Data
```sql
-- Connect to reservation database
psql -h localhost -p 5433 -U postgres -d reservation

-- Import data
COPY "Reservation" FROM '/tmp/reservations.csv' CSV HEADER;
COPY "ReservationAddon" FROM '/tmp/reservation_addons.csv' CSV HEADER;
COPY "ReservationService" FROM '/tmp/reservation_services.csv' CSV HEADER;
```

#### 4.4 Verify Data
```sql
-- Check row counts match
SELECT COUNT(*) FROM "Reservation";
SELECT COUNT(*) FROM "ReservationAddon";
SELECT COUNT(*) FROM "ReservationService";
```

---

### Phase 5: Update Application Code (1 hour)

#### 5.1 Remove Cross-Service Queries

**Already Done!** ✅
- We already replaced direct database calls with API calls
- Reservation Service calls Customer Service API for customer/pet verification
- No code changes needed!

#### 5.2 Update Tests

**Customer Service:**
- Remove reservation-related tests (if any)

**Reservation Service:**
- Tests already updated to mock API calls
- No changes needed!

---

### Phase 6: Testing (1 hour)

#### 6.1 Unit Tests
```bash
# Customer Service
cd services/customer
npm test

# Reservation Service
cd services/reservation-service
npm test
```

#### 6.2 Integration Tests
```bash
# Start both services
npm run dev:start

# Test customer creation
curl -X POST http://localhost:4004/api/customers \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: dev" \
  -d '{...}'

# Test reservation creation (calls Customer Service API)
curl -X POST http://localhost:4003/api/reservations \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: dev" \
  -d '{...}'
```

#### 6.3 Verify Service Communication
- Create reservation with valid customer → Should succeed
- Create reservation with invalid customer → Should fail with 404
- Update reservation → Should validate customer via API
- Get customer reservations → Should work

---

### Phase 7: Cleanup (30 minutes)

#### 7.1 Drop Old Tables from Customer Database
```sql
-- Connect to customer database
psql -h localhost -p 5433 -U postgres -d customer

-- Drop reservation tables (AFTER verifying everything works!)
DROP TABLE "ReservationService";
DROP TABLE "ReservationAddon";
DROP TABLE "Reservation";
```

#### 7.2 Update Documentation
- Update architecture diagrams
- Update database schema docs
- Update deployment docs

---

## 🚨 Risks & Mitigation

### Risk 1: Data Loss
**Mitigation:**
- Full database backup before starting
- Export data to CSV before migration
- Verify row counts after migration
- Test thoroughly before dropping old tables

### Risk 2: Downtime
**Mitigation:**
- Do migration during low-traffic period
- Have rollback plan ready
- Keep old tables until verified

### Risk 3: Broken References
**Mitigation:**
- Already using API calls (not foreign keys)
- Test cross-service communication thoroughly
- Monitor error logs after deployment

### Risk 4: Performance Issues
**Mitigation:**
- API calls already have retry logic
- Caching reduces API call frequency
- Monitor response times

---

## 📝 Rollback Plan

If something goes wrong:

### Step 1: Stop Services
```bash
pm2 stop all
```

### Step 2: Restore Database
```bash
# Drop new reservation database
psql -h localhost -p 5433 -U postgres -c "DROP DATABASE reservation;"

# Restore from backup
psql -h localhost -p 5433 -U postgres customer < backup-before-split-YYYYMMDD.sql
```

### Step 3: Revert Code
```bash
git revert <commit-hash>
```

### Step 4: Restart Services
```bash
npm run dev:start
```

---

## ✅ Success Criteria

- [ ] Both services start without errors
- [ ] Customer Service can create/read/update/delete customers
- [ ] Reservation Service can create/read/update/delete reservations
- [ ] Reservation creation validates customer via API
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No errors in logs
- [ ] Response times acceptable
- [ ] Data integrity verified

---

## 📊 When to Implement

**Implement when:**
- You have 1,000+ tenants
- Database is becoming a bottleneck
- You need independent database scaling
- You have 4-6 hours for implementation + testing

**Don't implement yet if:**
- Current setup works fine
- Less than 100 tenants
- No performance issues
- Limited time for testing

**Current Recommendation:** Wait until you hit scaling issues. The current architecture with API communication is already good enough for most use cases.

---

## 💰 Cost Impact

**Before:**
- 1 PostgreSQL database: $25-50/month

**After:**
- 2 PostgreSQL databases: $50-100/month

**Additional Costs:**
- Increased network traffic between services (minimal)
- Slightly higher latency for cross-service queries (1-5ms)

---

## 📚 References

- [Microservices Database Patterns](https://microservices.io/patterns/data/database-per-service.html)
- [Prisma Multi-Schema](https://www.prisma.io/docs/concepts/components/prisma-schema/data-sources)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/replication.html)

---

## 🎯 Summary

**Database splitting is the final piece of true microservice architecture.**

However, it's:
- Complex (4-6 hours)
- Risky (data migration)
- Not urgent (current setup works)

**Recommendation:** Implement when you actually need it (1,000+ tenants or performance issues).

For now, you have:
- ✅ Service-to-service API communication
- ✅ Independent deployment capability
- ✅ Retry logic for resilience
- ✅ Caching for performance

This is **good enough** for most use cases!
