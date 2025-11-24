# Check-In Templates Fix - November 24, 2024

## Issue Summary

Check-in and service agreement templates were not loading in the dev environment, causing 404 errors when accessing `/api/check-in-templates` and related endpoints.

## Root Cause

1. **Nginx routing misconfiguration**: Check-in template routes were not properly configured to route to the reservation-service (port 4003)
2. **Backup files in sites-enabled**: Multiple backup files in `/etc/nginx/sites-enabled/` were being loaded by nginx, causing conflicting server blocks
3. **Missing SSL configuration**: The wildcard-subdomains server block was missing `listen 443 ssl;` directives

## Solution Applied

### 1. Added SSL Configuration to Wildcard Server Block

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    ssl_certificate /etc/letsencrypt/live/canicloud.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/canicloud.com/privkey.pem;

    server_name ~^(?<subdomain>.+)\.canicloud\.com$;
    ...
}
```

### 2. Added Check-In Route Locations

Added four `location ^~` blocks to route check-in related endpoints to port 4003:

```nginx
# Check-in and service agreement routes -> reservation-service (4003)
location ^~ /api/check-in-templates {
    proxy_pass http://localhost:4003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Tenant-Subdomain $subdomain;
    proxy_set_header X-Tenant-Id $http_x_tenant_id;
    proxy_cache_bypass $http_upgrade;
}

location ^~ /api/check-ins { ... }
location ^~ /api/service-agreement-templates { ... }
location ^~ /api/service-agreements { ... }
```

### 3. Removed Backup Files from sites-enabled

```bash
rm /etc/nginx/sites-enabled/tailtown.backup*
```

**Critical**: Backup files should NEVER be in `sites-enabled` as nginx loads all files in that directory.

### 4. Removed Duplicate SSL Configuration

Removed duplicate SSL configuration lines that were outside the server block.

## Files Modified

- `/etc/nginx/sites-enabled/wildcard-subdomains` - Added SSL config and check-in routes
- `/etc/nginx/sites-enabled/tailtown` - Already had check-in routes but wasn't being used for subdomains

## Verification

```bash
# Test check-in templates
curl -H "x-tenant-id: dev" https://dev.canicloud.com/api/check-in-templates
# Returns: 200 OK with template data

# Test service agreement templates
curl -H "x-tenant-id: dev" https://dev.canicloud.com/api/service-agreement-templates/default
# Returns: 200 OK with agreement template

# Browser console shows:
# API Response: 200 GET /api/check-in-templates
```

## Deployment Steps for Production

### Prerequisites

- SSH access to production server
- Sudo privileges
- Backup of current nginx configuration

### Steps

1. **Backup current nginx config**:

   ```bash
   sudo cp /etc/nginx/sites-enabled/wildcard-subdomains /etc/nginx/sites-available/wildcard-subdomains.backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Edit wildcard-subdomains config**:

   ```bash
   sudo nano /etc/nginx/sites-enabled/wildcard-subdomains
   ```

   Add the SSL configuration and four check-in location blocks as shown above.

3. **Remove any backup files from sites-enabled**:

   ```bash
   sudo rm /etc/nginx/sites-enabled/*.backup*
   ```

4. **Test nginx configuration**:

   ```bash
   sudo nginx -t
   ```

5. **Restart nginx**:

   ```bash
   sudo systemctl restart nginx
   ```

6. **Verify**:
   ```bash
   curl -H "x-tenant-id: [tenant]" https://[subdomain].canicloud.com/api/check-in-templates
   ```

## Lessons Learned

1. **Never put backup files in sites-enabled** - Use sites-available or a separate backup directory
2. **Wildcard server blocks need explicit SSL config** - Don't assume SSL is inherited
3. **Use `^~` prefix modifier** for specific routes that need to override general `/api/` routes
4. **Always restart nginx after major config changes** - Reload may not be sufficient for server block changes

## Related Issues

- Check-in workflow was previously working but broke due to nginx configuration drift
- Templates were seeded correctly in the database but weren't accessible via API

## Status

✅ **RESOLVED** - Check-in templates now loading successfully in all environments
