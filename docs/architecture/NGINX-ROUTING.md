# Nginx Routing Configuration

## Overview

This document describes the nginx reverse proxy configuration for Tailtown, which routes API requests to the appropriate backend services and provides API Gateway functionality.

## Service Architecture

- **Frontend**: Static React app served by PM2 on port 3000
- **Customer Service**: Node.js/Express on port 4004
- **Reservation Service**: Node.js/Express on port 4003

## API Gateway Features (Added Nov 30, 2025)

Nginx now provides API Gateway functionality:

| Feature                      | Configuration                                                      |
| ---------------------------- | ------------------------------------------------------------------ |
| **Per-Tenant Rate Limiting** | `limit_req_zone $tenant_id zone=tenant_api_limit:10m rate=100r/s`  |
| **Per-IP Rate Limiting**     | `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s` |
| **API Versioning**           | `/api/v1/*` rewrites to `/api/*`                                   |
| **Login Rate Limiting**      | 5 requests per 15 minutes                                          |
| **Booking Rate Limiting**    | 2 requests per second                                              |

See [architecture/API-GATEWAY.md](architecture/API-GATEWAY.md) for full documentation.

## Nginx Configuration

**Location**: `/etc/nginx/sites-enabled/tailtown`  
**Source**: `config/nginx/tailtown.conf`

### Customer Service Routes (Port 4004)

All customer-related, staff, pet, service, waitlist, product, analytics, reporting, and training endpoints:

```nginx
location ~ ^/api/(staff|customers|pets|services|waitlist|products|analytics|reports|training-classes) {
    proxy_pass http://localhost:4004;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Endpoints**:

- `/api/staff/*` - Staff management
- `/api/customers/*` - Customer management
- `/api/pets/*` - Pet management
- `/api/services/*` - Service management
- `/api/waitlist/*` - Waitlist management
- `/api/products/*` - Product/POS management
- `/api/analytics/*` - Analytics dashboard
- `/api/reports/*` - Sales and tax reports
- `/api/training-classes/*` - Training class management
- `/api/announcements/*` - Announcement management (public read, admin write)

### Reservation Service Routes (Port 4003)

All reservation and resource (kennel) endpoints:

```nginx
location ~ ^/api/(reservations|resources) {
    proxy_pass http://localhost:4003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Endpoints**:

- `/api/reservations/*` - Reservation management
- `/api/resources/*` - Resource (kennel) management

### Frontend Routes

All non-API routes serve the React frontend:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Testing Nginx Configuration

After making changes to nginx configuration:

```bash
# Test configuration syntax
nginx -t

# Reload nginx (graceful restart)
nginx -s reload

# Or restart nginx service
systemctl restart nginx
```

## Common Issues

### 404 Not Found for API Endpoints

**Symptom**: API calls return 404 errors in browser console

**Cause**: Endpoint not included in nginx routing regex

**Solution**: Add the endpoint to the appropriate `location` block regex pattern

**Example**: Adding `/api/announcements` to customer-service:

```nginx
# Before
location ~ ^/api/(staff|customers|pets|services) {

# After
location ~ ^/api/(staff|customers|pets|services|announcements) {
```

### 502 Bad Gateway

**Symptom**: API calls return 502 errors

**Cause**: Backend service is not running or not listening on expected port

**Solution**:

1. Check service status: `pm2 status`
2. Check service logs: `pm2 logs customer-service` or `pm2 logs reservation-service`
3. Restart service: `pm2 restart customer-service`

### Changes Not Taking Effect

**Symptom**: Nginx changes don't seem to apply

**Cause**: Configuration not reloaded or syntax error preventing reload

**Solution**:

1. Test config: `nginx -t`
2. Check for errors in output
3. Reload: `nginx -s reload`
4. If still not working, hard restart: `systemctl restart nginx`

## Deployment Checklist

When adding new API endpoints:

- [ ] Identify which service handles the endpoint (customer-service or reservation-service)
- [ ] Add endpoint to appropriate nginx `location` block regex
- [ ] Test nginx configuration: `nginx -t`
- [ ] Reload nginx: `nginx -s reload`
- [ ] Verify endpoint works in browser/Postman
- [ ] Update this documentation

## Critical Configuration Notes

### Port Routing

**IMPORTANT**: The `/api/` location block must route to port **4004** (customer-service), NOT 4003 (reservation-service).

```nginx
# CORRECT
location /api/ {
    proxy_pass http://localhost:4004;  # Customer service
}

# Reservations are a specific exception
location /api/reservations/ {
    proxy_pass http://localhost:4003;  # Reservation service
}
```

**Common Mistake**: During deployment on Nov 21-22, 2025, the `/api/` block was incorrectly pointing to 4003, causing all API requests (including announcements) to fail with 404 errors. Always verify port routing after nginx configuration changes.

### Route Order Matters

More specific routes must be defined BEFORE general routes in nginx configuration. For example:

- `/api/reservations/` must come before `/api/`
- `/api/announcements` must come before `/api/`

## Version History

- **November 30, 2025**: Added API Gateway features (rate limiting, versioning, analytics)
- **November 22, 2025**: Fixed announcements routing, added critical port configuration notes
- **November 21, 2025**: Added waitlist, products, analytics, reports, training-classes routes
- **Initial**: Basic customer-service and reservation-service routing

---

**Last Updated**: November 30, 2025  
**Maintainer**: Development Team
