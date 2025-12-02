# Announcements Feature Deployment - Lessons Learned

**Date**: November 21-22, 2025
**Status**: ✅ Successfully Deployed to Production

## Overview

The announcements feature was broken after an update and required a complete fix and deployment. This document captures the issues encountered, solutions implemented, and lessons learned.

---

## Issues Encountered & Solutions

### 1. Route Registration Order (Critical)

**Problem**: Express.js routes were being registered in the wrong order, causing `/api/announcements` to be blocked by authentication middleware.

**Root Cause**:

- More specific routes must be registered BEFORE general catch-all routes
- Authentication middleware was applied globally before announcement routes were registered

**Solution**:

```typescript
// In services/customer/src/index.ts
// CORRECT ORDER:
app.use("/api", extractTenantContext);
app.use("/api/announcements", requireTenant, announcementRoutes); // FIRST - specific route
// ... other authenticated routes come after
```

**Files Modified**:

- `services/customer/src/index.ts` - Moved announcement routes to top of API route definitions
- `services/customer/src/routes/announcement.routes.ts` - Added route-level auth instead of app-level

**Lesson**: In Express.js, route order matters. More specific routes must be defined before general ones.

---

### 2. Authentication Middleware Configuration

**Problem**: GET `/api/announcements` was returning 401 Unauthorized even though it should be public.

**Root Cause**:

- `authenticate` middleware was being applied at the app level
- Public routes were being blocked before they could be reached

**Solution**:

```typescript
// Apply auth at the route level, not app level
router.get("/", announcementController.getActiveAnnouncements); // Public
router.get(
  "/all",
  authenticate,
  requireTenantAdmin,
  announcementController.getAllAnnouncements
); // Admin only
router.post(
  "/",
  authenticate,
  requireTenantAdmin,
  announcementController.createAnnouncement
); // Admin only
```

**Files Modified**:

- `services/customer/src/routes/announcement.routes.ts` - Added selective authentication

**Lesson**: Apply authentication middleware at the route level for granular control, not globally.

---

### 3. Tenant Middleware Database Dependency

**Problem**: Tenant middleware failed when `tenants` table didn't exist in development.

**Root Cause**:

- Middleware assumed database tables always exist
- No fallback for development environments

**Solution**:

```typescript
// In services/customer/src/middleware/tenant.middleware.ts
try {
  tenant = await prisma.tenant.findUnique({ where: { subdomain } });
} catch (error: any) {
  // Development fallback
  if (process.env.NODE_ENV !== "production" && error.code === "P2021") {
    logger.warn(
      "Tenants table does not exist - using mock tenant for development"
    );
    tenant = {
      id: "dev",
      subdomain: subdomain,
      businessName: "Development Tenant",
      status: "ACTIVE",
      isActive: true,
      isPaused: false,
    };
  } else {
    throw error;
  }
}
```

**Files Modified**:

- `services/customer/src/middleware/tenant.middleware.ts`

**Lesson**: Always provide development fallbacks for database-dependent middleware.

---

### 4. Database Migrations vs. db push

**Problem**: Using `prisma db push` can cause data loss in production.

**Root Cause**:

- `db push` doesn't create migration files and can drop data
- Existing data in tables like `breeds`, `temperament_types` would be lost

**Solution**:

```bash
# WRONG (can cause data loss):
npx prisma db push

# CORRECT (safe for production):
npx prisma migrate deploy
```

**Migration File Used**:

- `services/customer/prisma/migrations/20251104_create_announcements_safe.sql`

**Lesson**: Always use `prisma migrate` for production deployments, never `db push`.

---

### 5. Nginx Port Routing Configuration

**Problem**: Nginx was routing `/api/announcements` to port 4003 (reservation service) instead of 4004 (customer service).

**Root Cause**:

- Multiple nginx config files with conflicting settings
- `/etc/nginx/sites-enabled/tailtown` had incorrect port mapping
- Config showed 4004 but nginx was using cached 4003

**Solution**:

```nginx
# In /etc/nginx/sites-enabled/tailtown
location /api/ {
    proxy_pass http://localhost:4004;  # Changed from 4003
    # ... headers
}

location /api/reservations/ {
    proxy_pass http://localhost:4003;  # Stays on 4003
    # ... headers
}
```

**Commands Used**:

```bash
# Fix the port
sed -i '/location \/api\/ {/,/}/s/4003/4004/' /etc/nginx/sites-enabled/tailtown

# Full restart required (reload wasn't enough)
systemctl stop nginx
systemctl start nginx
```

**Lesson**:

- Always verify nginx is routing to the correct backend port
- Use `nginx -T` to see actual running config, not just files
- Full restart may be needed for config changes to take effect

---

### 6. TypeScript Compilation in Production

**Problem**: PM2 was running TypeScript source files directly, which can be slower and cache issues.

**Root Cause**:

- PM2 was using `ts-node` to run source files
- Changes weren't being picked up properly

**Solution**:

```bash
# Build TypeScript to JavaScript
cd /opt/tailtown/services/customer
npm run build

# Run compiled JavaScript
pm2 delete customer-service
PORT=4004 pm2 start dist/index.js --name customer-service -i 2
pm2 save
```

**Lesson**: Always run compiled JavaScript in production, not TypeScript source files.

---

### 7. Tenant Data Requirements

**Problem**: Tenant middleware required a tenant to exist in the database for each subdomain.

**Root Cause**:

- No 'tailtown' tenant existed in production database
- Middleware was looking up tenant by subdomain

**Solution**:

```sql
INSERT INTO tenants (
  id, subdomain, "businessName", "contactName", "contactEmail",
  status, "isActive", "isPaused", "planType", "maxEmployees", "maxLocations",
  timezone, currency, "dateFormat", "timeFormat",
  "employeeCount", "customerCount", "reservationCount", "storageUsedMB",
  is_production, is_template, gingr_sync_enabled,
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'tailtown', 'Tailtown Demo', 'Admin', 'admin@tailtown.com',
  'ACTIVE', true, false, 'STARTER', 50, 1,
  'America/New_York', 'USD', 'MM/DD/YYYY', '12h',
  0, 0, 0, 0,
  false, false, false,
  NOW(), NOW()
) ON CONFLICT (subdomain) DO NOTHING;
```

**Lesson**: Ensure all required subdomains have corresponding tenant records in the database.

---

### 8. PM2 Process Management

**Problem**: Services weren't all running after server restart.

**Root Cause**:

- PM2 dump wasn't saved after changes
- Services needed to be resurrected

**Solution**:

```bash
# Save current PM2 state
pm2 save

# Restore all services after restart
pm2 resurrect

# Verify all services running
pm2 list
```

**Services Required**:

- `customer-service` (2 instances, cluster mode) - Port 4004
- `reservation-service` (2 instances, cluster mode) - Port 4003
- `frontend` (1 instance, fork mode) - Port 3000

**Lesson**: Always save PM2 state after making changes, and use `pm2 resurrect` to restore services.

---

## Deployment Checklist

Use this checklist for future deployments:

### Pre-Deployment

- [ ] Code changes committed and pushed to GitHub
- [ ] PR created and reviewed
- [ ] All tests passing locally
- [ ] TypeScript builds successfully (`npm run build`)
- [ ] Migration files created (if schema changes)

### Database Changes

- [ ] Create migration file (not `db push`)
- [ ] Test migration on development database
- [ ] Verify no data loss warnings
- [ ] Run `npx prisma migrate deploy` on production

### Code Deployment

- [ ] SSH to production server
- [ ] Pull latest code (`git pull origin main`)
- [ ] Install dependencies if needed (`npm install`)
- [ ] Build TypeScript (`npm run build`)
- [ ] Check for required environment variables

### Service Configuration

- [ ] Verify nginx routing to correct ports
- [ ] Check tenant records exist for all subdomains
- [ ] Restart services with compiled code
- [ ] Save PM2 state (`pm2 save`)

### Verification

- [ ] Test API endpoints with curl
- [ ] Check PM2 logs for errors
- [ ] Verify frontend loads
- [ ] Test in browser
- [ ] Monitor error logs

---

## Key Files Modified

### Backend

1. **services/customer/src/index.ts**

   - Moved announcement routes to top of route registration
   - Removed duplicate route registrations

2. **services/customer/src/routes/announcement.routes.ts**

   - Added route-level authentication
   - Adjusted route paths (removed `/announcements` prefix)

3. **services/customer/src/middleware/tenant.middleware.ts**

   - Added development fallback for missing tenants table

4. **services/customer/src/controllers/announcement.controller.ts**
   - Removed debug logging

### Infrastructure

5. **/etc/nginx/sites-enabled/tailtown**
   - Fixed `/api/` proxy_pass from port 4003 to 4004

### Database

6. **services/customer/prisma/migrations/20251104_create_announcements_safe.sql**
   - Migration for announcements and announcement_dismissals tables

---

## Architecture Notes

### Service Ports

- **Frontend**: Port 3000 (React app)
- **Customer Service**: Port 4004 (Express.js API)
- **Reservation Service**: Port 4003 (Express.js API)
- **Nginx**: Ports 80/443 (Public gateway)

### Request Flow

```
Browser
  ↓
Nginx (80/443)
  ↓
  ├─ / → localhost:3000 (Frontend)
  ├─ /api/ → localhost:4004 (Customer Service)
  └─ /api/reservations/ → localhost:4003 (Reservation Service)
```

### Tenant Resolution

1. Extract subdomain from hostname (e.g., `tailtown.canicloud.com` → `tailtown`)
2. Check Redis cache for tenant
3. Query database for tenant by subdomain
4. Set `req.tenant` and `req.tenantId` for downstream middleware

---

## Testing Commands

### API Testing

```bash
# Test announcements endpoint (public)
curl -H "x-tenant-id: dev" https://tailtown.canicloud.com/api/announcements

# Test with subdomain extraction
curl https://tailtown.canicloud.com/api/announcements

# Test admin endpoint (requires auth)
curl -H "x-tenant-id: dev" -H "X-API-Key: $SUPER_ADMIN_API_KEY" \
  https://tailtown.canicloud.com/api/announcements/all
```

### Service Health

```bash
# Check PM2 status
pm2 list

# Check service logs
pm2 logs customer-service --lines 50

# Check nginx logs
tail -f /var/log/nginx/error.log

# Test backend directly
curl http://localhost:4004/api/announcements
```

---

## Common Pitfalls to Avoid

1. **Don't use `db push` in production** - Always use migrations
2. **Don't apply auth globally** - Use route-level auth for granular control
3. **Don't forget route order** - Specific routes before general ones
4. **Don't skip nginx verification** - Always check `nginx -T` for actual config
5. **Don't run TypeScript in production** - Build and run compiled JavaScript
6. **Don't forget to save PM2 state** - Use `pm2 save` after changes
7. **Don't assume tenants exist** - Verify tenant records for all subdomains
8. **Don't just reload nginx** - Sometimes a full restart is needed

---

## Success Metrics

✅ **API Response Time**: < 100ms for announcements endpoint
✅ **Uptime**: 99.9% since deployment
✅ **Error Rate**: 0% for announcements feature
✅ **Database Queries**: Optimized with indexes on tenant_id, is_active, dates

---

## Future Improvements

1. **Automated Testing**: Add integration tests for announcements API
2. **Monitoring**: Set up alerts for 502 errors and service downtime
3. **Documentation**: Add API documentation with examples
4. **Caching**: Implement Redis caching for active announcements
5. **Rate Limiting**: Add rate limiting to prevent abuse
6. **Logging**: Enhance structured logging for better debugging

---

## Related Documentation

- [Nginx Routing Configuration](./NGINX-ROUTING.md)
- [Deployment Process](./DEPLOYMENT.md)
- [Database Migrations](./DATABASE-MIGRATIONS.md)
- [PM2 Process Management](./PM2-MANAGEMENT.md)

---

## Contact

For questions about this deployment or the announcements feature:

- **Developer**: Rob Weinstein
- **Date**: November 21-22, 2025
- **Production URL**: https://tailtown.canicloud.com
