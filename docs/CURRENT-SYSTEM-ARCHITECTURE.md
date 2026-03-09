# Tailtown Current System Architecture

**Last Updated**: December 9, 2025  
**Status**: ✅ Production - All Systems Operational  
**Architecture**: Microservices with HTTP Communication, Redis Caching, Sentry Monitoring

## 🆕 Recent Additions (v1.6.x)

- **Check-in Workflow Enhancements** (v1.6.18): Enhanced check-in process
  - Quick-add for missing info: Inline editing for vet, emergency contact, vaccines
  - Pet history access: View previous visits and notes from pet summary card
  - Belongings quick-edit: Edit inventory after check-in completion
  - Multi-pet check-in: Support for checking in multiple pets sharing a room
  - Step validation: Visual indicators for check-in step completion status
- **Setup Wizard** (v1.6.14): `/setup` - Complete tenant onboarding wizard
  - 11 steps: Business, Rooms, Services, Pricing, Hours, Staff, Payment, Notifications, Branding, Policies, Review
  - API: `POST /api/onboarding/complete` - Creates tenant with all resources
- **API Gateway** (v1.6.11): Per-tenant rate limiting, request correlation, API analytics
- **Staging Environment** (v1.6.12): https://staging.tailtown.canicloud.com
- **Audit Logging** (v1.6.2): TenantAuditLog model, admin viewer at `/admin/audit-logs`
- **Customer Account Portal** (v1.6.3): `/my-account` - reservations, pets, passes, balance
- **Online Booking Portal** (v1.6.1): `/book` - public booking with kennel selection

---

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Production Environment                           │
│                    https://brangro.canicloud.com                        │
│                         129.212.178.244                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Nginx (SSL/Proxy)                            │
│                      Let's Encrypt SSL Certificate                      │
│         Routes: /, /api/*, /health, /uploads/*, /static/*              │
│                    HTTPS Termination + Load Balancing                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│   Frontend (React SPA)       │    │   Backend Services           │
│   Port: 3000 (PM2)           │    │   PM2 Cluster Mode           │
│   Build: Static files        │    │                              │
│   served by Nginx            │    │   ┌──────────────────────┐   │
│                              │    │   │ Customer Service     │   │
│   Features:                  │    │   │ Port: 4004          │   │
│   - Material-UI              │    │   │ Instances: 2        │   │
│   - React Router             │    │   │                     │   │
│   - JWT Auth                 │    │   │ Controllers:        │   │
│   - Multi-tenant             │    │   │ - Customers         │   │
│   - Calendar                 │    │   │ - Pets              │   │
│   - POS                      │    │   │ - Staff             │   │
│                              │    │   │ - Products          │   │
│   API Integration:           │    │   │ - Announcements     │   │
│   - Auto JWT headers         │    │   │ - Invoices          │   │
│   - Tenant detection         │    │   │ - Grooming          │   │
│   - Dynamic URLs             │    │   │ - Training          │   │
└──────────────────────────────┘    │   │ - Checklists        │   │
                                    │   │ - SMS               │   │
                                    │   │                     │   │
                                    │   │ Infrastructure:     │   │
                                    │   │ - Redis Cache       │   │
                                    │   │ - Sentry Tracking   │   │
                                    │   │ - HTTP Client       │   │
                                    │   └──────────────────────┘   │
                                    │                              │
                                    │   ┌──────────────────────┐   │
                                    │   │ Reservation Service  │   │
                                    │   │ Port: 4003          │   │
                                    │   │ Instances: 2        │   │
                                    │   │                     │   │
                                    │   │ Controllers:        │   │
                                    │   │ - Reservations      │   │
                                    │   │ - Resources         │   │
                                    │   │ - Availability      │   │
                                    │   └──────────────────────┘   │
                                    └──────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                                │
│                           Port: 5432                                    │
│                                                                        │
│   Tenants:                                                             │
│   - tailtown (🔴 PRODUCTION - Your business, real data)               │
│   - brangro (🟡 DEMO - Customer demo site, mock data)                 │
│   - dev (🟢 DEVELOPMENT - Local testing, safe to break)               │
│                                                                        │
│   Key Tables:                                                          │
│   - customers, pets, staff                                            │
│   - reservations, resources                                           │
│   - products, invoices                                                │
│   - announcements, training_classes                                   │
│   - groomer_appointments, checklists                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ 1. Login (email/password)
       ▼
┌──────────────────────────────────┐
│  Frontend (AuthContext)          │
│  POST /api/staff/login           │
└──────┬───────────────────────────┘
       │ 2. Credentials
       ▼
┌──────────────────────────────────┐
│  Backend (Staff Controller)      │
│  - Validate credentials          │
│  - Generate JWT token            │
│  - Return user + accessToken     │
└──────┬───────────────────────────┘
       │ 3. { data: {...}, accessToken: "jwt..." }
       ▼
┌──────────────────────────────────┐
│  Frontend (localStorage)         │
│  - Store JWT token               │
│  - Store user data               │
└──────┬───────────────────────────┘
       │ 4. All subsequent requests
       ▼
┌──────────────────────────────────┐
│  API Service (Axios Interceptor) │
│  - Add Authorization header      │
│  - Bearer {token}                │
└──────┬───────────────────────────┘
       │ 5. Authenticated request
       ▼
┌──────────────────────────────────┐
│  Backend Middleware              │
│  - optionalAuth OR authenticate  │
│  - Verify JWT                    │
│  - Extract user info             │
│  - Attach to req.user            │
└──────┬───────────────────────────┘
       │ 6. Authorized request
       ▼
┌──────────────────────────────────┐
│  Controller                      │
│  - Access req.user.id            │
│  - Process business logic        │
└──────────────────────────────────┘
```

---

## 🏢 Multi-Tenant Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Tenant Detection Flow                        │
└────────────────────────────────────────────────────────────────┘

Request: https://brangro.canicloud.com/dashboard
                    │
                    ▼
┌────────────────────────────────────────────────────────────────┐
│  extractTenantContext Middleware                               │
│                                                                │
│  1. Extract subdomain from hostname                            │
│     hostname: "brangro.canicloud.com"                         │
│     subdomain: "brangro"                                      │
│                                                                │
│  2. Lookup tenant in database                                  │
│     SELECT * FROM tenants WHERE subdomain = 'brangro'         │
│                                                                │
│  3. Validate tenant is active                                  │
│     if (!tenant.isActive) → 403 Forbidden                     │
│                                                                │
│  4. Attach to request                                          │
│     req.tenantId = 'brangro'                                  │
│     req.tenant = { ...tenant data }                           │
└────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────┐
│  Controller (TenantRequest)                                    │
│                                                                │
│  const tenantId = req.tenantId || 'dev';                      │
│                                                                │
│  // All queries filtered by tenant                             │
│  const products = await prisma.product.findMany({             │
│    where: { tenantId }                                        │
│  });                                                           │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Isolation

### Tenant-Specific Data

Every major table includes `tenantId` for data isolation:

```sql
-- Example: Products table
CREATE TABLE products (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR NOT NULL,  -- Isolates data
  name VARCHAR NOT NULL,
  price DECIMAL(10,2),
  ...
  INDEX idx_products_tenant (tenant_id)
);

-- All queries MUST filter by tenant_id
SELECT * FROM products WHERE tenant_id = 'brangro';
```

### Controllers Using Proper Tenant Context

✅ **All 13 controllers updated** (Nov 5, 2025):

- products.controller.ts
- groomerAppointment.controller.ts
- checklist.controller.ts
- custom-icons.controller.ts
- enrollment.controller.ts
- referenceData.controller.ts
- reports.controller.ts
- sms.controller.ts
- staff.controller.ts
- trainingClass.controller.ts
- vaccineRequirement.controller.ts
- announcement.controller.ts
- invoice.controller.ts

---

## 🔧 Middleware Stack

### Request Processing Pipeline

```
Incoming Request (https://tailtown.canicloud.com/api/...)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  NGINX (API Gateway Layer)                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Rate Limiting                                          ││
│  │  - Per-tenant: 100 req/s (tenant_api_limit)            ││
│  │  - Per-IP: 10 req/s (api_limit)                        ││
│  │  - Login: 5 req/15min (login_limit)                    ││
│  │  - Booking: 2 req/s (booking_limit)                    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  API Versioning                                         ││
│  │  - /api/v1/* → /api/* (rewrite)                        ││
│  │  - X-API-Version header added                          ││
│  │  - X-Tenant-ID extracted from subdomain                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  1. correlationId()             │  ← Generates X-Request-ID
│     - Creates unique request ID │
│     - Enables distributed trace │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  2. apiVersionHeaders()         │  ← Adds version info
│     - X-API-Version: v1         │
│     - X-API-Deprecated: false   │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  3. extractTenantContext        │  ← Identifies tenant from subdomain
│     - Subdomain detection       │
│     - Tenant lookup             │
│     - Validation                │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  4. apiAnalytics()              │  ← Tracks metrics to Redis
│     - Request count per tenant  │
│     - Response times (P50/P95)  │
│     - Error rates by endpoint   │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  5. optionalAuth (if needed)    │  ← Extracts user from JWT if present
│     - Parse Authorization       │
│     - Verify JWT                │
│     - Attach user to req        │
│     - Continue if no token      │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  6. authenticate (if required)  │  ← Requires valid JWT
│     - Parse Authorization       │
│     - Verify JWT                │
│     - Attach user to req        │
│     - 401 if no valid token     │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  7. requireTenant (if needed)   │  ← Ensures tenant context exists
│     - Check req.tenantId        │
│     - 400 if missing            │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  8. Controller                  │  ← Business logic
│     - Access req.tenantId       │
│     - Access req.user           │
│     - Process request           │
└─────────────────────────────────┘
```

### API Gateway Features (Added Nov 30, 2025)

| Feature                      | Implementation     | Details                  |
| ---------------------------- | ------------------ | ------------------------ |
| **API Versioning**           | Nginx rewrite      | `/api/v1/*` → `/api/*`   |
| **Per-Tenant Rate Limiting** | Nginx + Express    | 100 req/s per tenant     |
| **Request Correlation**      | Express middleware | X-Request-ID header      |
| **API Analytics**            | Redis              | Metrics, latency, errors |
| **Enhanced Logging**         | Express middleware | Structured JSON logs     |

See [API-GATEWAY.md](architecture/API-GATEWAY.md) for full documentation.

---

## 🧪 Testing Infrastructure

### Test Coverage (Nov 5, 2025)

```
services/customer/src/middleware/__tests__/
├── tenant.middleware.test.ts      (8 test cases)
│   ├── Extract tenant from subdomain
│   ├── Extract from header
│   ├── Extract from query param
│   ├── Default to 'dev'
│   ├── Handle inactive tenant
│   ├── Handle non-existent tenant
│   └── Require tenant validation
│
└── auth.middleware.test.ts        (10 test cases)
    ├── authenticate middleware
    │   ├── Valid JWT token
    │   ├── Valid API key
    │   ├── Invalid token
    │   └── No authentication
    ├── optionalAuth middleware
    │   ├── Valid token
    │   ├── Invalid token
    │   └── No token
    └── requireSuperAdmin middleware
        ├── Allow super admin
        ├── Reject non-admin
        └── Reject unauthenticated

Total: 18 test cases
```

---

## 🚀 Deployment Architecture

### PM2 Process Management

```
┌─────────────────────────────────────────────────────────────┐
│  PM2 Ecosystem                                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  frontend (id: 6)                                    │  │
│  │  Mode: fork                                          │  │
│  │  Instances: 1                                        │  │
│  │  Command: serve -s build -l 3000                    │  │
│  │  Auto-restart: Yes                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  customer-service (id: 0, 2)                        │  │
│  │  Mode: cluster                                       │  │
│  │  Instances: 2                                        │  │
│  │  Port: 4004                                          │  │
│  │  Auto-restart: Yes                                   │  │
│  │  Load balancing: Round-robin                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  reservation-service (id: 1, 3)                     │  │
│  │  Mode: cluster                                       │  │
│  │  Instances: 2                                        │  │
│  │  Port: 4003                                          │  │
│  │  Auto-restart: Yes                                   │  │
│  │  Load balancing: Round-robin                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Nginx Configuration

**Note:** The `localhost` references below are **server-side** configuration on the production server. Nginx proxies external requests (https://canicloud.com) to internal services running on localhost ports.

```nginx
server {
    listen 443 ssl http2;
    server_name brangro.canicloud.com;

    ssl_certificate /etc/letsencrypt/live/canicloud.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/canicloud.com/privkey.pem;

    # Frontend (static files)
    # External: https://brangro.canicloud.com
    # Internal: http://localhost:3000 (on server)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend APIs
    # External: https://brangro.canicloud.com/api
    # Internal: http://localhost:4004 (on server)
    location /api/ {
        proxy_pass http://localhost:4004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📦 Technology Stack

### Frontend

- **Framework**: React 18.2.0
- **Language**: TypeScript 4.9.5
- **UI Library**: Material-UI 5.x
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Build Tool**: Create React App

### Backend

- **Runtime**: Node.js 24+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator

### Infrastructure

- **Server**: Oracle Cloud (129.212.178.244)
- **OS**: Ubuntu 22.04 LTS
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt
- **DNS**: Cloudflare

---

## 🔄 Recent Updates

### November 26, 2025 - Calendar & Resource Type Fixes

**ResourceType Enum Expansion**:

- ✅ Added new resource types to both services' Prisma schemas:
  - `JUNIOR_KENNEL` - Maps to "Boarding | Indoor Suite"
  - `QUEEN_KENNEL` - Maps to "Boarding | Indoor Suite"
  - `KING_KENNEL` - Maps to "Boarding | King Suite"
  - `VIP_ROOM` - Maps to "Boarding | VIP Suite"
  - `CAT_CONDO` - Maps to "Boarding | Cat Cabana"
  - `DAY_CAMP_FULL` - Maps to "Day Camp | Full Day"
  - `DAY_CAMP_HALF` - Maps to "Day Camp | Half Day"

**Calendar Improvements**:

- ✅ Fixed calendar to display all 104 resources (was showing 0)
- ✅ Removed hardcoded `type=KENNEL` filter from frontend
- ✅ Added resource-to-service mapping for auto-selection
- ✅ Fixed kennel size display (Junior/Queen/King labels)

**Database Data Fix**:

- ✅ Trimmed trailing spaces from service names in database
- ✅ Fixed service name matching for auto-selection

### November 5-7, 2025 - Code Cleanup & Security

**Code Cleanup Session**:

- ✅ Fixed 13 controllers for proper tenant context (86+ functions)
- ✅ Removed debug console.log statements
- ✅ Cleaned up 6 unused icon imports
- ✅ Added error handling for profile photos
- ✅ Added JSDoc documentation

**Authentication Improvements**:

- ✅ Added `optionalAuth` middleware
- ✅ Removed 'default-user' fallback
- ✅ Fixed JWT token storage in frontend
- ✅ Auto-send JWT with all API requests
- ✅ Require authentication for announcement dismissals

**Testing Infrastructure**:

- ✅ Created tenant middleware tests (8 cases)
- ✅ Created auth middleware tests (10 cases)
- ✅ Total: 18 test cases with full coverage

---

## 📊 Production Metrics

### Tenant Overview (Nov 5, 2025)

- **Production Tenant**: Tailtown (your business)
- **Demo Tenant**: BranGro (customer demos)
- **Dev Tenant**: Dev (local development)

### Tailtown Tenant (Production - YOUR BUSINESS)

- **Status**: 🔴 **CRITICAL - PRODUCTION**
- **Purpose**: Real business operations
- **Data**: Real customers, pets, reservations
- **Priority**: Highest - must work flawlessly
- **Use For**: Daily operations, real testing

### BranGro Tenant (Demo Site)

- **Status**: 🟡 **DEMO - NON-CRITICAL**
- **Purpose**: Customer demos, feature testing
- **Data**: Mock/demo data
- **Customers**: 20 (demo)
- **Pets**: 20 (demo)
- **Reservations**: 10 (demo)
- **Staff**: 4 (demo)
- **Products**: 6 (template POS items)
- **Use For**: Sales demos, safe testing, training

### System Health

- **Uptime**: 99.9%
- **Active Tenants**: 3 (tailtown, brangro, dev)

### Performance

- **API Response Time**: < 200ms average
- **Page Load Time**: < 2s
- **Database Queries**: Optimized with indexes
- **Memory Usage**: ~200MB per service instance

---

## 🎯 Architecture Principles

1. **Multi-Tenancy First**: All data isolated by tenant
2. **Type Safety**: TypeScript everywhere
3. **Test Coverage**: Critical paths tested
4. **Security**: JWT auth, password hashing, SQL injection prevention
5. **Scalability**: Cluster mode, load balancing ready
6. **Maintainability**: Clean code, documented, consistent patterns
7. **Monitoring**: PM2 logs, health checks, error tracking

## 🏢 Tenant Strategy

For detailed information about tenant purposes and usage, see [TENANT-STRATEGY.md](TENANT-STRATEGY.md).

### Quick Reference

- **Tailtown**: 🔴 Production (your business, real data)
- **BranGro**: 🟡 Demo (customer demos, mock data)
- **Dev**: 🟢 Development (local testing, safe to break)

### Development Workflow

```
Dev → BranGro → Tailtown → Future Customer Tenants
```

1. Develop and test in **Dev**
2. Validate with demo data in **BranGro**
3. Deploy to production in **Tailtown**
4. Roll out to paying customers

---

## 🔄 Microservice Communication (Nov 7, 2025)

### Service-to-Service HTTP Communication

**Pattern**: HTTP API calls with retry logic

```
┌──────────────────────────────────────────────────────────────┐
│              Reservation Service                              │
│                                                               │
│  Need to verify customer/pet exists?                         │
│  ↓                                                            │
│  HTTP GET /api/customers/:id                                 │
│  HTTP GET /api/pets/:id                                      │
│                                                               │
│  ┌─────────────────────────────────────────┐                │
│  │  Customer Service HTTP Client            │                │
│  │  - Base URL: http://localhost:4004       │                │
│  │  - Retry: 3 attempts (1s, 2s, 4s)       │                │
│  │  - Timeout: 5s per request               │                │
│  │  - Error handling: Circuit breaker ready │                │
│  └─────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP Request
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Customer Service                                 │
│                                                               │
│  GET /api/customers/:id                                      │
│  ↓                                                            │
│  Verify tenant context                                       │
│  Query database                                              │
│  Return customer data                                        │
└──────────────────────────────────────────────────────────────┘
```

### Retry Logic

```typescript
// Exponential backoff: 1s → 2s → 4s
const delays = [1000, 2000, 4000];
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    return await httpClient.get(url);
  } catch (error) {
    if (attempt < 2) await sleep(delays[attempt]);
    else throw error;
  }
}
```

---

## 🚀 Performance Infrastructure (Nov 7, 2025)

### Redis Caching Layer

**Purpose**: 10-50x performance improvement for frequently accessed data

```
┌──────────────────────────────────────────────────────────────┐
│                    Request Flow with Cache                    │
└──────────────────────────────────────────────────────────────┘

GET /api/products?tenantId=dev
    │
    ▼
┌─────────────────────────────────┐
│  1. Check Redis Cache           │
│     Key: products:dev:page:1    │
│     TTL: 5 minutes              │
└─────────────────────────────────┘
    │
    ├─ Cache HIT → Return cached data (< 10ms)
    │
    └─ Cache MISS ↓
       │
       ▼
┌─────────────────────────────────┐
│  2. Query PostgreSQL            │
│     SELECT * FROM products      │
│     WHERE tenant_id = 'dev'     │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  3. Store in Redis              │
│     SET products:dev:page:1     │
│     EXPIRE 300                  │
└─────────────────────────────────┘
       │
       ▼
    Return data
```

### Cache Invalidation

```typescript
// On product create/update/delete
await invalidateCache(`products:${tenantId}:*`);
```

### Redis Configuration

- **Host**: localhost:6379
- **Connection**: Persistent with auto-reconnect
- **Fallback**: Graceful degradation if Redis unavailable
- **Keys**: Tenant-specific (e.g., `products:dev:page:1`)

---

## 📊 Monitoring & Error Tracking (Nov 7, 2025)

### Sentry Integration

**Purpose**: Production error tracking and performance monitoring

```
┌──────────────────────────────────────────────────────────────┐
│                    Error Tracking Flow                        │
└──────────────────────────────────────────────────────────────┘

Application Error Occurs
    │
    ▼
┌─────────────────────────────────┐
│  Sentry.captureException()      │
│  - Error details                │
│  - Stack trace                  │
│  - User context                 │
│  - Request context              │
│  - Environment info             │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Sentry Dashboard               │
│  - Real-time alerts             │
│  - Error grouping               │
│  - Performance metrics          │
│  - Release tracking             │
└─────────────────────────────────┘
```

### Sentry Features Configured

- ✅ Error capture with context
- ✅ Performance monitoring
- ✅ User context tracking
- ✅ Breadcrumbs for debugging
- ✅ Release tracking
- ✅ Environment filtering (dev/prod)

### Configuration

- **DSN**: Configured per environment
- **Sample Rate**: 100% (errors), 10% (performance)
- **Environment**: dev/staging/production
- **Integrations**: Express, Prisma, HTTP

---

## 🔐 Security Infrastructure (Nov 7, 2025)

### Implemented Security Features

**Authentication & Authorization**:

- ✅ Rate limiting (5 attempts/15 min)
- ✅ Account lockout (5 failed attempts, 15 min)
- ✅ Short-lived access tokens (8 hours)
- ✅ Refresh token rotation (7 days)
- ✅ JWT validation on all protected routes

**Input Validation**:

- ✅ Zod schemas for all inputs
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (sanitization)
- ✅ CSRF protection

**Security Headers**:

- ✅ COEP (Cross-Origin-Embedder-Policy)
- ✅ COOP (Cross-Origin-Opener-Policy)
- ✅ CORP (Cross-Origin-Resource-Policy)
- ✅ Content-Security-Policy
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options

**Testing**:

- ✅ 380+ security tests
- ✅ OWASP Top 10 coverage
- ✅ Security score: 95/100

---

## 📝 Next Steps

### Immediate

- ✅ ~~Microservice communication~~ (DONE Nov 7)
- ✅ ~~Redis caching~~ (DONE Nov 7)
- ✅ ~~Security hardening~~ (DONE Nov 7)
- Configure SendGrid/Twilio for production
- Implement automated backups

### Short Term

- Add more endpoints to Redis cache
- Configure Sentry DSN for production
- Implement circuit breaker pattern
- Add distributed tracing (OpenTelemetry)

### Long Term

- Database split (separate DBs per service)
- Kubernetes deployment
- Multi-region support
- API gateway

---

**Document Status**: ✅ Current and Accurate  
**Last Verified**: November 26, 2025  
**Maintained By**: Development Team
