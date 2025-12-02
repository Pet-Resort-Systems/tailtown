# AI Reference: Overnight Reservation Fix (Nov 19, 2025)

## Quick Summary for AI Assistants

This document provides a concise reference for AI assistants working on the Tailtown codebase regarding the overnight reservation count fix completed on November 19, 2025.

## Critical Bugs Fixed

### 1. Gingr Date Parsing Bug (CRITICAL)

**Problem**: Adding 7 hours to dates that already include timezone info
**Impact**: All 6,559 Gingr reservations had dates shifted forward by 7 hours
**Status**: ✅ FIXED

```typescript
// ❌ WRONG - DO NOT USE
const parseGingrDate = (dateStr: string): Date => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7); // Double-counting timezone!
  return date;
};

// ✅ CORRECT - USE THIS
const parseGingrDate = (dateStr: string): Date => {
  return new Date(dateStr); // Gingr dates already have timezone: "2025-11-17T13:00:00-07:00"
};
```

**File**: `/services/customer/src/services/gingr-sync.service.ts` (line ~356)

### 2. Pet ExternalId Lookup Bug

**Problem**: Missing `-tailtown` suffix when looking up pets
**Impact**: Pet lookups failed, reservations couldn't be synced
**Status**: ✅ FIXED

```typescript
// ✅ CORRECT
const pet = await prisma.pet.findFirst({
  where: { 
    tenantId: TENANT_ID, 
    externalId: reservation.animal.id + '-tailtown' // Must append suffix
  }
});
```

**Note**: Customers do NOT have this suffix, only pets.

### 3. Service Category Bug

**Problem**: "Day Camp | Day Lodging" categorized as DAYCARE instead of BOARDING
**Impact**: Overnight boarding reservations excluded from overnight count
**Status**: ✅ FIXED

```typescript
// ✅ CORRECT
serviceCategory: serviceType.includes('Day Camp') && !serviceType.includes('Lodging') ? 'DAYCARE' : 'BOARDING'
```

### 4. Frontend Calculation Bug

**Problem**: Missing BOARDING filter, incorrect date logic
**Impact**: Dashboard showing wrong overnight count
**Status**: ✅ FIXED

```typescript
// ✅ CORRECT - /frontend/src/hooks/useDashboardData.ts
const overnight = enhancedReservations.filter((res: any) => {
  if (res.service?.serviceCategory !== 'BOARDING') return false;
  
  const startDate = new Date(res.startDate);
  const endDate = new Date(res.endDate);
  const todayStart = new Date(formattedDate + 'T00:00:00Z');
  const todayEnd = new Date(formattedDate + 'T23:59:59Z');
  
  return startDate <= todayEnd && endDate > todayStart;
}).length;
```

## Key Data Formats

### Gingr API Date Format
```
"2025-11-17T13:00:00-07:00"
```
- Already includes timezone (MST/MDT)
- Parse as-is, no conversion needed
- Represents Mountain Time

### Pet ExternalId Format
```
Database: "18447-tailtown"
Gingr API: "18447"
```
- Always append `-tailtown` when looking up pets
- Customers use plain Gingr ID (no suffix)

### Service Categories
```
BOARDING - Overnight stays (includes "Day Lodging")
DAYCARE - Day camp (excludes "Day Lodging")
GROOMING - Grooming services
TRAINING - Training classes
VET - Veterinary services
```

## Current State (Nov 19, 2025)

- **Dashboard Overnight Count**: 27 ✅
- **Gingr Overnight Count**: 29
- **Difference**: 2 (cancelled reservations)
- **Total Active Reservations**: 352
- **Gingr Reservations Synced**: 6,559

## Files Modified

1. `/services/customer/src/services/gingr-sync.service.ts` - Date parsing, service category, pet lookup
2. `/frontend/src/hooks/useDashboardData.ts` - Overnight calculation, pagination
3. Production database - Fixed 6,559 reservation dates, updated service categories

## Deployment Status

- ✅ Frontend changes deployed
- ✅ Backend changes ready (need to deploy dist folder)
- ✅ Database corrections applied
- ⏳ Cron job needs updated code (runs every 8 hours)

## Known Issues

### Gingr Sync Performance
- **Problem**: Syncs all 11,826 customers and 18,469 pets every time
- **Impact**: Slow, hangs, times out
- **Priority**: HIGH
- **Solution**: Implement incremental sync based on `lastGingrSyncAt`

## Testing Commands

### Check Overnight Count via API
```bash
curl -s "http://localhost:4003/api/reservations?page=1&limit=500&status=PENDING,CONFIRMED,CHECKED_IN" \
  -H "x-tenant-id: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05" | jq '
  [.data.reservations[] | 
   select(.service.serviceCategory == "BOARDING") | 
   select(.startDate <= "2025-11-19T23:59:59.999Z" and .endDate > "2025-11-19T00:00:00.000Z")] | 
  length
'
```

### Check Database Directly
```sql
SELECT COUNT(*) 
FROM reservations r
JOIN services s ON r."serviceId" = s.id
WHERE r."tenantId" = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05'
  AND r.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
  AND s."serviceCategory" = 'BOARDING'
  AND r."startDate" <= '2025-11-19T23:59:59.999Z'
  AND r."endDate" > '2025-11-19T00:00:00.000Z';
```

## Common Pitfalls to Avoid

1. ❌ **Never add hours to Gingr dates** - they already have timezone
2. ❌ **Never forget `-tailtown` suffix** when looking up pets
3. ❌ **Never categorize "Day Lodging" as DAYCARE** - it's BOARDING
4. ❌ **Never use local timezone** for date comparisons - always UTC
5. ❌ **Never assume API returns all data** - use pagination (max 500/page)

## Related Documentation

- Full details: `/docs/OVERNIGHT_RESERVATION_FIX_2025-11-19.md`
- Gingr Sync Guide: `/docs/gingr/GINGR-SYNC-GUIDE.md`
- Roadmap: `/docs/ROADMAP.md`

## Quick Reference: Tenant ID

```
Production Tenant: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
Business Name: Tail Town Pet Resort
Subdomain: tailtown
```

## Memories Created

5 memories created covering:
1. Gingr date parsing bug fix
2. Pet externalId format
3. Day Lodging service category
4. Dashboard overnight calculation
5. Gingr sync performance issues

---

**Last Updated**: November 19, 2025 - 6:59 PM MST  
**Status**: ✅ All fixes deployed to production  
**Next Steps**: Deploy backend dist folder, optimize sync performance
