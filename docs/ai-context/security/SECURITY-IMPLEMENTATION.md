# API Security Implementation

**Date:** November 6, 2025  
**Status:** ✅ IMPLEMENTED

## Overview

All API endpoints are now secured with JWT-based authentication and role-based access control (RBAC).

## Security Layers

### 1. Tenant Isolation
- **Middleware:** `requireTenant`
- **Purpose:** Ensures all requests are scoped to a specific tenant
- **Implementation:** Extracts tenant from subdomain or header
- **Validation:** Checks tenant exists and is active

### 2. Authentication
- **Middleware:** `authenticate`
- **Purpose:** Verifies user identity via JWT token
- **Token Location:** `Authorization: Bearer <token>` header
- **Token Storage:** Frontend stores in `localStorage` as `token` and `accessToken`

### 3. Authorization (Role-Based Access Control)
- **Middleware:** `requireTenantAdmin`, `requireSuperAdmin`
- **Roles:**
  - `SUPER_ADMIN` - Platform-wide access
  - `TENANT_ADMIN` - Full access within tenant
  - `MANAGER` - Limited admin access
  - `STAFF` - Basic operational access

## API Route Security Matrix

### Admin-Only Routes (Require TENANT_ADMIN or SUPER_ADMIN)
```
POST   /api/staff
PUT    /api/staff/:id
DELETE /api/staff/:id
*      /api/price-rules
*      /api/coupons
*      /api/loyalty
*      /api/analytics
*      /api/emails
*      /api/sms
*      /api/reports
*      /api/vaccine-requirements
*      /api/custom-icons
*      /api/message-templates
*      /api/business-settings
```

### Staff Routes (Require Authentication)
```
*      /api/customers
*      /api/pets
*      /api/reservations
*      /api/services
*      /api/resources
*      /api/suites
*      /api/availability
*      /api/deposits
*      /api/checklists
*      /api/schedules
*      /api/invoices
*      /api/payments
*      /api/addons
*      /api/products
*      /api/groomer-appointments
*      /api/training-classes
*      /api/enrollments
```

### Public/Optional Auth Routes
```
GET    /api/reference-data (breeds, vets, etc.)
GET    /api/announcements
GET    /health
```

### Super Admin Only Routes
```
*      /api/super-admin
*      /api/tenants
*      /api/gingr (migration tools)
```

## Frontend Integration

### Token Management
- **Login:** JWT token received from `/api/auth/login`
- **Storage:** `localStorage.setItem('token', jwt)` and `localStorage.setItem('accessToken', jwt)`
- **Transmission:** Axios interceptor adds `Authorization: Bearer <token>` header
- **Expiration:** Token includes expiration time, frontend checks `tokenTimestamp`

### API Service Configuration
**File:** `/apps/frontend/src/services/api.ts`

```typescript
// Token is automatically attached to all requests
customerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Security Features

### ✅ Implemented
1. **JWT Authentication** - All API routes require valid JWT
2. **Role-Based Access Control** - Admin vs Staff permissions
3. **Tenant Isolation** - Data scoped to tenant subdomain
4. **Rate Limiting** - 100 req/15min general, 5 req/15min for auth
5. **HTTPS Enforcement** - Production only
6. **CORS Configuration** - Specific origins only
7. **Security Headers** - Helmet.js middleware
8. **Input Sanitization** - Request body sanitization

### 🔒 Additional Recommendations

1. **Token Refresh** - Implement refresh token rotation
2. **Token Revocation** - Add blacklist for compromised tokens
3. **2FA** - Add two-factor authentication for admin accounts
4. **API Key Rotation** - Rotate super admin API keys regularly
5. **Audit Logging** - Log all admin actions
6. **IP Whitelisting** - Restrict super admin access by IP
7. **Session Management** - Track active sessions per user
8. **Password Policy** - Enforce strong passwords

## Testing Authentication

### Test with cURL

```bash
# Without token (should fail with 401)
curl https://dev.canicloud.com/api/customers

# With token (should succeed)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://dev.canicloud.com/api/customers
```

### Test in Browser DevTools

```javascript
// Check if token is set
localStorage.getItem('token')
localStorage.getItem('accessToken')

// Manually set token for testing
localStorage.setItem('token', 'YOUR_JWT_TOKEN')
localStorage.setItem('accessToken', 'YOUR_JWT_TOKEN')
```

## Migration Notes

### Breaking Changes
- All API routes now require authentication
- Frontend must send JWT token in Authorization header
- Unauthenticated requests will receive 401 Unauthorized

### Backward Compatibility
- Reference data endpoints use `optionalAuth` - work with or without token
- Health check endpoint remains public
- Existing JWT tokens from login flow continue to work

## Monitoring

### Key Metrics to Track
1. Failed authentication attempts
2. 401/403 error rates
3. Token expiration rates
4. Admin action frequency
5. Cross-tenant access attempts

### Log Locations
- **Auth Errors:** PM2 logs for customer-service
- **Rate Limiting:** Express rate-limit logs
- **Security Events:** Custom security middleware logs

## Emergency Procedures

### If Tokens Are Compromised
1. Rotate JWT secret in environment variables
2. Restart all services
3. Force all users to re-login
4. Review audit logs for suspicious activity

### If Locked Out
1. Use super admin API key as fallback
2. Access database directly to reset user
3. Check PM2 logs for authentication errors

## Documentation

- **Auth Middleware:** `/apps/customer-service/src/middleware/auth.middleware.ts`
- **Tenant Middleware:** `/apps/customer-service/src/middleware/tenant.middleware.ts`
- **Security Middleware:** `/apps/customer-service/src/middleware/security.middleware.ts`
- **Route Configuration:** `/apps/customer-service/src/index.ts`
- **Frontend API Service:** `/apps/frontend/src/services/api.ts`
- **Auth Context:** `/apps/frontend/src/contexts/AuthContext.tsx`
