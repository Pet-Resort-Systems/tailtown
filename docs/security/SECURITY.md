# Security Implementation

## Overview

The Tailtown platform implements multi-layered security to protect tenant data and restrict administrative access.

## Quick Reference

### What's Protected

- ✅ **Brute Force** - Rate limiting (5 attempts/15 min)
- ✅ **Account Takeover** - Auto-lockout after 5 failed logins
- ✅ **Token Theft** - Short-lived tokens (8h) with rotation
- ✅ **Injection** - Input validation on all endpoints
- ✅ **DoS** - Request size limits (10MB max)
- ✅ **XSS** - Input sanitization + security headers

### Common Issues

**"Too many requests" error:**

- Rate limit hit
- Wait 15 minutes or use different IP

**"Account locked" error:**

- 5 failed login attempts
- Wait 15 minutes for auto-unlock

**"Invalid token" error:**

- Token expired (8 hours)
- Use refresh token to get new one

**Validation error:**

- Check `error.errors` array for field-specific messages
- Fix input and retry

### More Details

- **Security Checklist:** [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md)
- **Full Security Docs:** [../ai-context/security/](../ai-context/security/)
- **OWASP Top 10:** [../ai-context/security/SECURITY-FINAL-SUMMARY.md](../ai-context/security/SECURITY-FINAL-SUMMARY.md)

---

## Authentication System

### Super Admin API Key

**Purpose**: Protect tenant management endpoints from unauthorized access.

**Implementation**:

- All `/api/tenants` endpoints require authentication
- Uses `X-API-Key` header for verification
- Only super admins can access tenant management

**Configuration**:

```bash
# Backend (.env)
SUPER_ADMIN_API_KEY=your_secure_key_here

# Admin Portal (.env)
REACT_APP_SUPER_ADMIN_API_KEY=your_secure_key_here
```

**⚠️ IMPORTANT**: Change the default API key in production!

---

## Middleware

### Authentication Middleware

**Location**: `services/customer/src/middleware/auth.middleware.ts`

**Functions**:

1. **`authenticate`**
    - Validates API key or Bearer token
    - Attaches user info to request
    - Returns 401 if authentication fails

2. **`requireSuperAdmin`**
    - Checks if user has SUPER_ADMIN role
    - Returns 403 if not authorized
    - Must be used after `authenticate`

3. **`requireTenantAdmin`**
    - Allows SUPER_ADMIN or TENANT_ADMIN roles
    - For tenant-specific admin operations

4. **`requireTenantAccess`**
    - Ensures users can only access their own tenant data
    - Super admins can access any tenant

---

## Protected Endpoints

### Tenant Management (Super Admin Only)

All endpoints under `/api/tenants` require super admin authentication:

```
GET    /api/tenants              - List all tenants
GET    /api/tenants/:id          - Get tenant details
GET    /api/tenants/subdomain/:subdomain
POST   /api/tenants              - Create tenant
PUT    /api/tenants/:id          - Update tenant
POST   /api/tenants/:id/pause    - Pause tenant
POST   /api/tenants/:id/reactivate
DELETE /api/tenants/:id          - Delete tenant
GET    /api/tenants/:id/usage    - Get usage stats
```

**Example Request**:

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:4004/api/tenants
```

---

## Admin Portal Security

### Access Control

**Current**: API key authentication
**Future**: Add login page with password protection

**Configuration**:

```env
# admin-portal/.env
REACT_APP_SUPER_ADMIN_API_KEY=your_secure_key_here
```

### Network Security (Recommended for Production)

1. **IP Whitelist**: Restrict admin portal to specific IPs
2. **VPN Access**: Require VPN connection
3. **Separate Subdomain**: `admin.tailtown.com`
4. **HTTPS Only**: Force SSL/TLS
5. **Rate Limiting**: Prevent brute force attacks

---

## Testing Security

### Test 1: No Authentication (Should Fail)

```bash
curl http://localhost:4004/api/tenants
# Expected: 401 Unauthorized
```

### Test 2: Wrong API Key (Should Fail)

```bash
curl -H "X-API-Key: wrong-key" \
  http://localhost:4004/api/tenants
# Expected: 401 Unauthorized
```

### Test 3: Correct API Key (Should Succeed)

```bash
curl -H "X-API-Key: dev-super-admin-key-12345" \
  http://localhost:4004/api/tenants
# Expected: 200 OK with tenant list
```

---

## Future Enhancements

### Phase 1: JWT Tokens (Recommended)

- Replace API key with JWT tokens
- Add login endpoint
- Implement token refresh
- Store tokens securely

### Phase 2: Role-Based Access Control (RBAC)

- Define granular permissions
- Implement permission checks
- Add role management UI

### Phase 3: Multi-Factor Authentication (MFA)

- Add 2FA for super admins
- SMS or authenticator app
- Backup codes

### Phase 4: Audit Logging

- Log all admin actions
- Track API access
- Security monitoring
- Compliance reporting

---

## Production Checklist

### Before Deploying:

- [ ] Change default API key to strong random value
- [ ] Use environment variables (never commit keys)
- [ ] Enable HTTPS/SSL
- [ ] Set up IP whitelist for admin portal
- [ ] Implement rate limiting
- [ ] Add login page to admin portal
- [ ] Set up monitoring and alerts
- [ ] Review and test all endpoints
- [ ] Document emergency procedures
- [ ] Set up backup authentication method

### Strong API Key Generation:

```bash
# Generate secure random key
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Emergency Procedures

### If API Key is Compromised:

1. **Immediately**:
    - Change `SUPER_ADMIN_API_KEY` in backend .env
    - Restart customer service
    - Update admin portal .env
    - Restart admin portal

2. **Review**:
    - Check access logs
    - Identify unauthorized access
    - Assess data exposure

3. **Prevent**:
    - Rotate keys regularly
    - Use secrets management (AWS Secrets Manager, etc.)
    - Implement key rotation policy

---

## Best Practices

### Development:

- ✅ Use different API keys for dev/staging/prod
- ✅ Never commit API keys to git
- ✅ Use `.env` files (gitignored)
- ✅ Document all security measures

### Production:

- ✅ Use strong, random API keys (32+ characters)
- ✅ Rotate keys every 90 days
- ✅ Monitor for suspicious activity
- ✅ Implement rate limiting
- ✅ Use HTTPS only
- ✅ Set up WAF (Web Application Firewall)
- ✅ Regular security audits

---

## Contact

For security concerns or to report vulnerabilities:

- Email: security@tailtown.com
- Do not publicly disclose vulnerabilities
- Allow 90 days for fixes before disclosure

---

**Last Updated**: October 23, 2025  
**Version**: 1.0  
**Status**: ✅ Implemented
