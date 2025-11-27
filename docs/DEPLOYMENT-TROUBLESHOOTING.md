# Deployment Troubleshooting Guide

This guide covers common deployment issues and their solutions based on real production experience.

## Table of Contents

- [Service Crashes on Startup](#service-crashes-on-startup)
- [PM2 Restart Loops](#pm2-restart-loops)
- [502 Gateway Errors](#502-gateway-errors)
- [Manual Deployment Procedures](#manual-deployment-procedures)
- [Common Production Issues](#common-production-issues)
- [Verification Steps](#verification-steps)

---

## Service Crashes on Startup

### Rate Limiter IPv6 Error

**Error**: `ERR_ERL_KEY_GEN_IPV6`

**Symptoms**:

- Service crashes immediately on startup
- PM2 shows high restart count
- Error mentions express-rate-limit and IPv6

**Solution**:

```typescript
// In rate limiter middleware
keyGenerator: (req: any) => {
  return req.tenantId || 'unknown'; // Don't use req.ip
},
```

**Prevention**:

- Always use tenant-based or user-based keys for rate limiting
- Test with IPv6 addresses during development
- Pin express-rate-limit version

### Node-fetch ESM Error

**Error**: `ERR_REQUIRE_ESM`

**Symptoms**:

- TypeScript compilation succeeds but runtime fails
- Error mentions node-fetch and require()
- Service crashes during module loading

**Solution**:

```bash
# Downgrade to CommonJS compatible version
npm install node-fetch@2
```

**Prevention**:

- Pin node-fetch version in package.json
- Use `npm install node-fetch@2` for CommonJS projects
- Consider using native fetch() for Node.js 18+

---

## PM2 Restart Loops

### High Restart Count

**Symptoms**:

- PM2 status shows 20+ restarts
- Service status shows "errored" instead of "online"
- Logs show repeating crash patterns

**Diagnosis**:

```bash
# Check current status
pm2 status

# View recent error logs
pm2 logs service-name --lines 50 --err

# Clear old logs to see fresh errors
pm2 flush service-name
pm2 restart service-name
pm2 logs service-name --lines 50
```

### Common Causes

1. **Configuration errors** - Missing environment variables
2. **Database connection issues** - Wrong URL or credentials
3. **Port conflicts** - Another service using the same port
4. **Module import errors** - ESM/CommonJS compatibility issues
5. **Syntax errors** - TypeScript compilation issues

---

## 502 Gateway Errors

### Symptoms

- Frontend loads but API calls fail
- Browser shows 502 Bad Gateway errors
- Nginx logs show upstream connection issues

### Diagnosis

```bash
# Check if backend services are running
pm2 status

# Test direct API access
curl -H "x-tenant-id: dev" http://localhost:4004/api/customers

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Common Solutions

1. **Restart backend services**
2. **Check database connectivity**
3. **Verify Nginx configuration**
4. **Check available disk space**
5. **Monitor system resources**

---

## Manual Deployment Procedures

Use when automated deployment fails or for emergency fixes.

### Prerequisites

- SSH access to production server
- PM2 process manager installed
- Git repository access

### Step-by-Step Process

#### 1. Connect to Server

```bash
ssh root@129.212.178.244
```

#### 2. Navigate to Project

```bash
cd /opt/tailtown
```

#### 3. Handle Local Changes

```bash
# Option A: Stash changes
git stash

# Option B: Commit changes
git add .
git commit -m "Local changes before deployment"
```

#### 4. Pull Latest Code

```bash
git pull origin main
```

#### 5. Update Dependencies

```bash
# Customer service
cd services/customer
npm install

# Reservation service (if needed)
cd ../reservation-service
npm install
```

#### 6. Fix Known Issues

```bash
# Example: Fix node-fetch compatibility
npm install node-fetch@2

# Example: Rebuild TypeScript
npm run build
```

#### 7. Test Manual Startup

```bash
npm start
# Press Ctrl+C to stop if successful
```

#### 8. Restart PM2 Services

```bash
pm2 restart customer-service
pm2 restart reservation-service
```

#### 9. Verify Services

```bash
pm2 status
pm2 logs customer-service --lines 20
```

#### 10. Test APIs

```bash
curl -H "x-tenant-id: dev" http://localhost:4004/api/customers
curl http://localhost:4003/api/reservations
```

---

## Common Production Issues

### Database Data Quality Issues

**Symptoms**:

- Features work inconsistently (e.g., auto-selection works for some items but not others)
- String matching fails unexpectedly
- Lookups return null when data appears to exist

**Common Causes**:

1. **Trailing spaces in string fields** - Data imported or entered with extra whitespace
2. **Inconsistent casing** - Mixed case in fields that should be uniform
3. **Typos in reference data** - Misspelled values in lookup tables

**Diagnosis**:

```bash
# Check for trailing spaces in service names
PGPASSWORD=<password> psql -h localhost -U postgres -d customer -c "
SELECT name, length(name) FROM services
WHERE name != TRIM(name);"

# Check for specific value with exact match
PGPASSWORD=<password> psql -h localhost -U postgres -d customer -c "
SELECT name, length(name) FROM services
WHERE name IN ('Expected Value 1', 'Expected Value 2');"
```

**Solutions**:

```bash
# Trim trailing spaces from all service names
PGPASSWORD=<password> psql -h localhost -U postgres -d customer -c "
UPDATE services SET name = TRIM(name)
WHERE name != TRIM(name);"

# Fix specific typos
PGPASSWORD=<password> psql -h localhost -U postgres -d customer -c "
UPDATE services SET name = 'Correct Name'
WHERE name = 'Incorect Name';"
```

**Prevention**:

- Add database constraints to prevent trailing whitespace
- Use TRIM() in application code when inserting/updating
- Add data validation in import scripts
- Regular data quality audits

---

### Database Connection Failures

**Symptoms**:

- Service starts but can't connect to database
- Timeouts on API endpoints
- Error logs mention connection refused

**Solutions**:

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U postgres -d customer -c "SELECT 1;"

# Check environment variables
cat .env | grep DATABASE_URL
```

### Memory Issues

**Symptoms**:

- Services restart unexpectedly
- PM2 shows high memory usage
- System becomes unresponsive

**Solutions**:

```bash
# Check memory usage
free -h
pm2 monit

# Restart services to free memory
pm2 restart all

# Check for memory leaks
pm2 logs customer-service --lines 100 | grep -i memory
```

### Disk Space Issues

**Symptoms**:

- Services fail to start
- Logs show "No space left on device"
- Database operations fail

**Solutions**:

```bash
# Check disk space
df -h

# Clean up old logs
pm2 flush all
sudo journalctl --vacuum-time=7d

# Clean up npm cache
npm cache clean --force
```

---

## Verification Steps

After any deployment or fix, verify the system is working:

### 1. Service Health

```bash
pm2 status
# All services should show "online"
```

### 2. API Endpoints

```bash
# Customer service
curl -H "x-tenant-id: dev" http://localhost:4004/api/customers
curl -H "x-tenant-id: dev" http://localhost:4004/api/pets

# Reservation service
curl http://localhost:4003/api/reservations
curl http://localhost:4003/api/services
```

### 3. Frontend Access

```bash
curl -I http://localhost:3000
# Should return 200 OK
```

### 4. Database Connectivity

```bash
psql -h localhost -U postgres -d customer -c "SELECT COUNT(*) FROM users;"
```

### 5. Error Log Check

```bash
pm2 logs customer-service --lines 50 --err
pm2 logs reservation-service --lines 50 --err
```

### 6. Production URL Test

```bash
curl -I https://canicloud.com
# Should return 200 OK
```

---

## Emergency Contacts and Procedures

### When to Escalate

- Service down for more than 30 minutes
- Database corruption suspected
- Security breach detected
- Hardware failure indicators

### Emergency Rollback

```bash
# Quick rollback to previous commit
git log --oneline -10
git checkout <previous-commit-hash>
npm install
npm run build
pm2 restart all
```

### Monitoring Setup

```bash
# Basic monitoring script
while true; do
  echo "$(date): Checking services..."
  pm2 status | grep -E "(online|errored)"
  sleep 300
done
```

---

## Prevention Measures

### Code Quality

1. **Test IPv6 compatibility** in rate limiters
2. **Pin dependency versions** to prevent breaking updates
3. **Use CommonJS-compatible packages** for TypeScript projects
4. **Add deployment verification** to CI/CD pipeline

### Deployment Process

1. **Staging environment** for testing production changes
2. **Blue-green deployments** for zero downtime
3. **Automated rollback** on health check failures
4. **Database migrations** run before code deployment

### Monitoring

1. **PM2 restart alerts** for crash loops
2. **Error rate monitoring** for API endpoints
3. **Resource usage alerts** for memory/CPU
4. **Uptime monitoring** for external URLs

---

## Quick Reference Commands

```bash
# Service Management
pm2 status                    # Check all services
pm2 restart service-name     # Restart specific service
pm2 logs service-name        # View service logs
pm2 flush service-name       # Clear service logs

# Database
sudo systemctl status postgresql
psql -h localhost -U postgres -d customer

# Deployment
cd /opt/tailtown
git pull origin main
npm install
npm run build
pm2 restart all

# Troubleshooting
df -h                        # Disk space
free -h                      # Memory usage
netstat -tulpn | grep :4004 # Port usage
```

---

**Last Updated**: November 26, 2025  
**Based On**: Real production deployment issues and resolutions  
**Environment**: Digital Ocean, Ubuntu, PM2, PostgreSQL
