# Development Best Practices

**Purpose**: Quick reference guide for common patterns, pitfalls, and best practices when developing Tailtown features.

**Last Updated**: November 8, 2025

---

## 🚨 Critical Patterns (Read This First!)

### Authentication Middleware Placement

**❌ WRONG - Applying auth globally to router:**
```typescript
// DON'T DO THIS - blocks public routes like login
app.use('/api/staff', requireTenant, authenticate, requireTenantAdmin, staffRoutes);
```

**✅ CORRECT - Apply auth at route level:**
```typescript
// Public routes (no auth)
app.use('/api/staff', requireTenant, staffRoutes);

// Inside staffRoutes:
router.post('/login', loginStaff);  // Public - no auth
router.get('/profile', authenticate, getProfile);  // Protected - has auth
```

**Why**: Login endpoints must be publicly accessible. Users can't authenticate if they need to be authenticated first!

**Rule of Thumb**: 
- ✅ Public routes: Login, password reset, public booking pages
- 🔒 Protected routes: Everything else

---

### Proxy Configuration (Rate Limiting & IP Detection)

**❌ WRONG - No proxy trust:**
```typescript
const app = express();
// Missing: app.set('trust proxy', 1);
```

**✅ CORRECT - Trust proxy when behind nginx:**
```typescript
const app = express();
app.set('trust proxy', 1);  // REQUIRED when behind nginx/reverse proxy
```

**Why**: Without this, Express sees all requests coming from `127.0.0.1` (nginx), breaking:
- Rate limiting (everyone shares same IP)
- IP-based access control
- Geolocation features
- Security logging

**When to use**: ALWAYS when deploying behind nginx, load balancers, or any reverse proxy.

---

### Frontend Environment Configuration

**❌ WRONG - Setting NODE_ENV at runtime:**
```bash
# This is too late - React embeds checks at BUILD time
npm run build
NODE_ENV=production npm start
```

**✅ CORRECT - Set NODE_ENV during build:**
```bash
NODE_ENV=production npm run build
```

**Why**: React's environment checks are embedded during build, not runtime. A development build will ALWAYS use localhost, regardless of runtime environment variables.

**Verification**:
```bash
# After building, check for localhost references
grep -r "localhost:4004" build/static/js/
# Should return nothing in production builds
```

---

### Multi-Tenant Context

**❌ WRONG - Hardcoding tenant or missing tenant context:**
```typescript
const customers = await prisma.customer.findMany();  // Gets ALL tenants!
```

**✅ CORRECT - Always filter by tenant:**
```typescript
const customers = await prisma.customer.findMany({
  where: { tenantId: req.tenantId }  // From extractTenantContext middleware
});
```

**Why**: Without tenant filtering, you'll leak data across tenants - a critical security issue.

**Rule**: EVERY database query must include `tenantId` in the `where` clause, except for:
- Tenant table itself
- System-wide settings
- Super admin operations (with explicit checks)

---

### Tenant ID Storage: UUID vs Subdomain (CRITICAL!)

**❌ WRONG - Using subdomain as tenantId:**
```typescript
const customer = await prisma.customer.create({
  data: {
    tenantId: tenant.subdomain,  // 'rainy' - WRONG!
    name: 'John Doe'
  }
});
```

**✅ CORRECT - Always use UUID:**
```typescript
const customer = await prisma.customer.create({
  data: {
    tenantId: tenant.id,  // '06d09e08-fe1f-4feb-89f8-c3b619026ba9' - CORRECT!
    name: 'John Doe'
  }
});
```

**Why**: 
- UUIDs are immutable - subdomains can change
- UUIDs prevent naming conflicts
- Consistent with database schema design
- Middleware now converts subdomain → UUID automatically

**Middleware Behavior** (Nov 8, 2025):
```typescript
// Frontend sends: x-tenant-id: 'rainy'
// Middleware converts to: req.tenantId = '06d09e08-fe1f-4feb-89f8-c3b619026ba9'
// All queries use UUID automatically
```

**Migration Note**: Old data may have subdomain strings - clone scripts handle both for backward compatibility.

---

### Frontend Tenant ID: Never Hardcode 'dev'

**❌ WRONG - Hardcoded tenant:**
```typescript
const response = await fetch('/api/products', {
  headers: { 'x-tenant-id': 'dev' }  // WRONG - always shows dev data!
});
```

**✅ CORRECT - Use localStorage:**
```typescript
const tenantId = localStorage.getItem('tailtown_tenant_id') 
  || localStorage.getItem('tenantId') 
  || 'dev';
const response = await fetch('/api/products', {
  headers: { 'x-tenant-id': tenantId }
});
```

**Why**: Hardcoded 'dev' breaks:
- Tenant impersonation
- Multi-tenant testing
- Production tenant access

**Rule**: NEVER hardcode tenant IDs in frontend code. Always read from localStorage.

---

## 🔐 Authentication Patterns

### Middleware Order Matters

**Correct Order**:
```typescript
app.use(cors());
app.use(express.json());
app.use(extractTenantContext);      // 1. Extract tenant from subdomain
app.use('/api/staff', requireTenant, staffRoutes);  // 2. Validate tenant exists
// Auth applied inside routes as needed
```

**Why This Order**:
1. **CORS & Body Parsing** - Must be first to process requests
2. **Tenant Extraction** - Needed for all subsequent middleware
3. **Tenant Validation** - Ensure tenant exists and is active
4. **Authentication** - Applied per-route, not globally

### Optional vs Required Auth

**Optional Auth** (for public pages that enhance with user data):
```typescript
router.get('/announcements', optionalAuth, getAnnouncements);
```
- Doesn't fail if no token
- Sets `req.user` if token present
- Use for: Public pages, landing pages, booking forms

**Required Auth** (for protected resources):
```typescript
router.get('/profile', authenticate, getProfile);
```
- Returns 401 if no token
- Always sets `req.user`
- Use for: Admin pages, user dashboards, private data

---

## 🚀 Deployment Patterns

### Pre-Deployment Checklist

**Before EVERY deployment:**
```bash
# 1. Run tests
npm test

# 2. Build with production environment
NODE_ENV=production npm run build

# 3. Verify build (automated)
npm run verify-build

# 4. Check for localhost references
grep -r "localhost" build/static/js/ || echo "✅ Clean"
```

### SSL Certificate Management

**Adding New Subdomain**:
```bash
# Use --expand to add to existing certificate
certbot certonly --nginx --cert-name canicloud.com \
  -d canicloud.com \
  -d www.canicloud.com \
  -d existing.canicloud.com \
  -d NEW.canicloud.com \
  --expand

# Test and reload nginx
nginx -t && systemctl reload nginx
```

**Don't**: Create separate certificates for each subdomain
**Do**: Expand existing certificate to include all subdomains

---

## 📝 Database Patterns

### Always Use Transactions for Multi-Step Operations

**❌ WRONG - No transaction:**
```typescript
await prisma.invoice.create({ data: invoiceData });
await prisma.payment.create({ data: paymentData });
// If payment fails, invoice is orphaned!
```

**✅ CORRECT - Use transaction:**
```typescript
await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({ data: invoiceData });
  const payment = await tx.payment.create({ data: paymentData });
  return { invoice, payment };
});
```

### Tenant Isolation in Queries

**Pattern for all queries**:
```typescript
// Single record
const customer = await prisma.customer.findUnique({
  where: { 
    id: customerId,
    tenantId: req.tenantId  // ALWAYS include
  }
});

// Multiple records
const customers = await prisma.customer.findMany({
  where: { 
    tenantId: req.tenantId,  // ALWAYS include
    // ... other filters
  }
});

// Aggregations
const count = await prisma.customer.count({
  where: { tenantId: req.tenantId }  // ALWAYS include
});
```

---

## 🧪 Testing Patterns

### Test Tenant Isolation

**Every controller test should verify tenant isolation**:
```typescript
it('should not return data from other tenants', async () => {
  const tenant1Data = await createTestData(tenant1Id);
  const tenant2Data = await createTestData(tenant2Id);
  
  const response = await request(app)
    .get('/api/customers')
    .set('x-tenant-id', tenant1Id);
  
  expect(response.body.data).toContainEqual(tenant1Data);
  expect(response.body.data).not.toContainEqual(tenant2Data);
});
```

### Test Authentication Requirements

```typescript
describe('Protected Routes', () => {
  it('should return 401 without token', async () => {
    const response = await request(app).get('/api/profile');
    expect(response.status).toBe(401);
  });
  
  it('should return 200 with valid token', async () => {
    const token = generateTestToken();
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
  });
});
```

---

## 🐛 Common Pitfalls

### 1. Forgetting Tenant Context

**Symptom**: Data leaking between tenants, wrong data showing up

**Check**:
```typescript
// Look for queries missing tenantId
prisma.customer.findMany({
  where: { /* tenantId missing! */ }
});
```

**Fix**: Add `tenantId: req.tenantId` to all where clauses

### 2. Auth Middleware on Public Routes

**Symptom**: 401 errors on login, can't access public pages

**Check**: Look for auth middleware applied to entire routers
```typescript
app.use('/api/staff', authenticate, staffRoutes);  // ❌ Blocks login!
```

**Fix**: Move auth to individual routes that need it

### 3. Rate Limiting Not Working

**Symptom**: Rate limits apply to all users together, or don't work at all

**Check**: Missing trust proxy setting
```typescript
// Missing this line:
app.set('trust proxy', 1);
```

**Fix**: Add trust proxy configuration

### 4. Environment Variables Not Applied

**Symptom**: Production build still uses localhost

**Check**: When was NODE_ENV set?
```bash
npm run build  # ❌ Built without NODE_ENV
NODE_ENV=production  # Too late!
```

**Fix**: Set NODE_ENV BEFORE building
```bash
NODE_ENV=production npm run build  # ✅ Correct
```

### 5. SSL Certificate Doesn't Cover Subdomain

**Symptom**: Browser shows certificate error for new subdomain

**Check**: List domains in certificate
```bash
openssl x509 -in /etc/letsencrypt/live/canicloud.com/fullchain.pem -text -noout | grep DNS
```

**Fix**: Expand certificate with --expand flag

---

## 📋 Code Review Checklist

Before submitting PR, verify:

### Security
- [ ] All database queries include `tenantId` filter
- [ ] Authentication middleware applied to protected routes
- [ ] No sensitive data in logs or error messages
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (using Prisma parameterized queries)

### Multi-Tenancy
- [ ] Tenant context extracted from request
- [ ] Tenant validation performed
- [ ] No cross-tenant data access possible
- [ ] Tenant isolation tested

### Authentication
- [ ] Public routes don't have auth middleware
- [ ] Protected routes have auth middleware
- [ ] Token validation working
- [ ] Proper error messages (401 vs 403)

### Configuration
- [ ] Environment variables documented
- [ ] No hardcoded URLs or credentials
- [ ] Production build tested
- [ ] No localhost references in production code

### Testing
- [ ] Unit tests for new functions
- [ ] Integration tests for new endpoints
- [ ] Tenant isolation tested
- [ ] Authentication tested
- [ ] Edge cases covered

---

## 🔧 Quick Reference Commands

### Development
```bash
# Start local development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

### Deployment (Zero-Downtime)
```bash
# Build for production
NODE_ENV=production npm run build

# Verify build
npm run verify-build

# Deploy with zero downtime (Nov 8, 2025)
ssh root@129.212.178.244
cd /opt/tailtown
./scripts/deploy.sh

# Or use PM2 reload (keeps services running)
pm2 reload customer-service --update-env
pm2 reload reservation-service --update-env

# ❌ DON'T USE pm2 restart (causes downtime)
# pm2 restart all  # WRONG - drops connections!
```

**Zero-Downtime Deployment**:
- Uses `pm2 reload` instead of `pm2 restart`
- Keeps at least one instance running during updates
- Atomic frontend directory swaps
- Automatic via GitHub Actions on merge to main
- See `/DEPLOYMENT.md` for full details

### Database
```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Reset database (DEV ONLY!)
npx prisma migrate reset
```

### SSL/Nginx
```bash
# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

# Check certificate
openssl x509 -in /etc/letsencrypt/live/canicloud.com/fullchain.pem -text -noout | grep DNS

# Renew certificate
certbot renew
```

---

## 📚 Related Documentation

- **Architecture**: `/docs/CURRENT-SYSTEM-ARCHITECTURE.md`
- **Deployment**: `/DEPLOYMENT.md`
- **Deployment Safeguards**: `/DEPLOYMENT-SAFEGUARDS.md`
- **Security**: `/SECURITY-IMPLEMENTATION.md`
- **Testing**: `/docs/TESTING-GUIDE.md` (if exists)
- **API Reference**: `/docs/API-REFERENCE.md` (if exists)

---

## 🆘 When Things Go Wrong

### Login Not Working
1. Check auth middleware isn't on `/login` route
2. Verify `trust proxy` is set
3. Check rate limiting configuration
4. Verify JWT secret is set
5. Check database connection

### Data Showing from Wrong Tenant
1. Verify `tenantId` in all queries
2. Check `extractTenantContext` middleware is running
3. Verify subdomain is correct
4. Check tenant exists in database

### API Calls Going to Localhost
1. Verify `NODE_ENV=production` during build
2. Check `.env` file on server
3. Rebuild and redeploy frontend
4. Clear browser cache

### SSL Certificate Error
1. Check subdomain is in certificate
2. Expand certificate if needed
3. Reload nginx after changes
4. Clear browser SSL cache

---

## 🕐 Gingr Import Timezone Handling

### The Critical Bug (Fixed Nov 6, 2025)

**Problem**: Gingr sends dates without timezone info, causing 7-hour offset errors.

**❌ WRONG - Direct Date parsing:**
```typescript
// DON'T DO THIS - Will be off by 7 hours!
const reservation = {
  startDate: new Date(gingrData.start_date),  // "2025-10-13T12:30:00"
  endDate: new Date(gingrData.end_date)
};
// Result: 12:30 PM MST displays as 12:30 AM MST (WRONG!)
```

**✅ CORRECT - Add timezone offset:**
```typescript
// DO THIS - Converts Mountain Time to UTC correctly
const parseGingrDate = (dateStr: string): Date => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);  // Add MST offset (UTC-7)
  return date;
};

const reservation = {
  startDate: parseGingrDate(gingrData.start_date),
  endDate: parseGingrDate(gingrData.end_date)
};
// Result: 12:30 PM MST displays correctly!
```

**Why**: 
- Gingr sends: `"2025-10-13T12:30:00"` (meant as 12:30 PM Mountain Time)
- No timezone indicator (no `Z` or offset)
- JavaScript treats as local time, then converts to UTC
- Must add 7 hours to get correct UTC time for Mountain Time

**Real Example**:
```typescript
// Gingr sends: "2025-10-13T12:30:00" (12:30 PM MST)
// Wrong: new Date() → 2025-10-13T12:30:00Z (5:30 AM MST) ❌
// Right: Add 7 hours → 2025-10-13T19:30:00Z (12:30 PM MST) ✅
```

**Location**: `services/customer/src/services/gingr-sync.service.ts`

**Tests**: `services/customer/src/__tests__/integration/gingr-timezone-handling.test.ts` (15 tests)

**Documentation**: See `docs/TIMEZONE-HANDLING.md` for full details

**Migration**: 6,535 reservations were fixed with `scripts/fix-reservation-times.js`

---

## 💡 Pro Tips

1. **Always test in dev tenant first** - Never test directly in production
2. **Use transactions for related operations** - Prevents partial updates
3. **Log tenant context in errors** - Makes debugging easier
4. **Verify tenant isolation in tests** - Catches security issues early
5. **Document environment variables** - Future you will thank you
6. **Use TypeScript strictly** - Catches errors at compile time
7. **Keep middleware order consistent** - Prevents subtle bugs
8. **Test authentication edge cases** - Expired tokens, invalid tokens, etc.
9. **Always use parseGingrDate() for Gingr imports** - Prevents timezone bugs
10. **Test timezone conversions with various times** - Morning, noon, evening, late night

---

**Remember**: When in doubt, check this guide first! If you find a new pattern or pitfall, add it here.

**Questions?** Check the related documentation or ask the team.

**Last Updated**: November 8, 2025 - 10:53 PM MST

## 📝 Recent Updates

### November 8, 2025
- Added UUID vs Subdomain tenant ID pattern (CRITICAL)
- Added frontend tenant ID localStorage pattern
- Updated deployment to zero-downtime using pm2 reload
- Added Nginx header passthrough requirements
