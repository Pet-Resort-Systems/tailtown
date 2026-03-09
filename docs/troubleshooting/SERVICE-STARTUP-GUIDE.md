# Service Startup Troubleshooting Guide

This guide helps diagnose and resolve common issues when starting Tailtown services.

## Quick Service Status Check

```bash
# Check if all services are running
echo "=== Service Status ==="
echo "Frontend (3000):" && lsof -ti:3000 && echo "✅ Running" || echo "❌ Not running"
echo "Reservation (4003):" && lsof -ti:4003 && echo "✅ Running" || echo "❌ Not running"
echo "Customer (4004):" && lsof -ti:4004 && echo "✅ Running" || echo "❌ Not running"

# Test health endpoints
curl -s http://localhost:4003/health | grep -q "up" && echo "✅ Reservation service healthy" || echo "❌ Reservation service unhealthy"
curl -s http://localhost:4004/health | grep -q "up" && echo "✅ Customer service healthy" || echo "❌ Customer service unhealthy"
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tailtown Services                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Frontend   │      │   Customer   │                │
│  │   (React)    │─────▶│   Service    │                │
│  │  Port 3000   │      │  Port 4004   │                │
│  └──────────────┘      └──────────────┘                │
│         │                      │                         │
│         │              ┌───────┴────────┐               │
│         │              │                 │               │
│         └─────────────▶│  Reservation   │               │
│                        │    Service     │               │
│                        │   Port 4003    │               │
│                        └────────────────┘               │
│                                │                         │
│                        ┌───────┴────────┐               │
│                        │                 │               │
│                   ┌────▼────┐      ┌────▼────┐         │
│                   │  DB     │      │  DB     │         │
│                   │ :5433   │      │ :5434   │         │
│                   └─────────┘      └─────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Common Issues and Solutions

### Issue 1: ERR_CONNECTION_REFUSED

**Symptoms:**
- Browser console shows `ERR_CONNECTION_REFUSED`
- API requests fail
- Calendar pages show no data

**Diagnosis:**
```bash
# Check which service is down
lsof -i :4003  # Reservation service
lsof -i :4004  # Customer service
```

**Solution:**
```bash
# Start the missing service
cd apps/reservation-service  # or apps/customer-service
source ~/.nvm/nvm.sh
pnpm run dev
```

---

### Issue 2: EADDRINUSE (Port Already in Use)

**Symptoms:**
- Error: `listen EADDRINUSE: address already in use :::4003`
- Service won't start

**Diagnosis:**
```bash
# Find what's using the port
lsof -i :4003
# or
lsof -i :4004
```

**Solution:**
```bash
# Option 1: Kill the specific process
kill -9 <PID>

# Option 2: Kill all node processes (nuclear option)
pkill -f "node"

# Option 3: Kill specific service
pkill -f "reservation-service"
pkill -f "customer"

# Then restart the service
cd apps/reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev
```

---

### Issue 3: Service Starts on Wrong Port

**Symptoms:**
- Service claims to start but isn't accessible
- Port conflicts even though .env is correct

**Diagnosis:**
```bash
# Check .env file
cat apps/reservation-service/.env | grep PORT

# Check what's actually running
ps aux | grep "ts-node-dev" | grep -v grep
```

**Solution:**
```bash
# Explicitly set PORT when starting
cd apps/reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev

# Or update .env and restart
echo "PORT=4003" >> .env
pnpm run dev
```

---

### Issue 4: Database Connection Failed

**Symptoms:**
- Service starts but shows database errors
- `❌ Database connection failed`

**Diagnosis:**
```bash
# Check if PostgreSQL containers are running
docker ps | grep postgres

# Check database connectivity
psql -h localhost -p 5433 -U postgres -d customer -c "SELECT 1;"
psql -h localhost -p 5434 -U postgres -d reservation -c "SELECT 1;"
```

**Solution:**
```bash
# Start PostgreSQL containers if needed
docker start tailtown-postgres

# Or recreate containers
docker run -d --name tailtown-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=customer \
  -p 5433:5432 postgres:14

# Verify DATABASE_URL in .env
cat apps/reservation-service/.env | grep DATABASE_URL
```

---

### Issue 5: NVM Not Loaded

**Symptoms:**
- `node: command not found`
- Wrong Node.js version
- Services fail to start

**Diagnosis:**
```bash
# Check if NVM is loaded
nvm --version

# Check Node version
node --version
```

**Solution:**
```bash
# Load NVM
source ~/.nvm/nvm.sh

# Verify correct version
nvm use 16

# Add to shell profile for automatic loading
echo 'source ~/.nvm/nvm.sh' >> ~/.zshrc  # or ~/.bashrc
```

---

### Issue 6: Tenant Validation Errors

**Symptoms:**
- API returns 401 Unauthorized
- Error: "Tenant ID is required"

**Diagnosis:**
```bash
# Test API with tenant header
curl -H "x-tenant-id: dev" http://localhost:4003/api/reservations
```

**Solution:**
- Frontend automatically includes tenant ID
- For manual testing, always include: `-H "x-tenant-id: dev"`
- Check browser localStorage for `tailtown_tenant_id`

---

### Issue 7: Frontend Won't Start

**Symptoms:**
- `pnpm start` fails
- Port 3000 already in use

**Diagnosis:**
```bash
# Check what's on port 3000
lsof -i :3000

# Check for multiple React processes
ps aux | grep "react-scripts" | grep -v grep
```

**Solution:**
```bash
# Kill existing frontend processes
pkill -f "react-scripts"

# Clear cache and restart
cd apps/frontend
rm -rf node_modules/.cache
pnpm start
```

---

## Startup Procedures

### Clean Start (Recommended)

```bash
# 1. Kill all existing services
pkill -f "node"
pkill -f "react-scripts"

# 2. Verify ports are free
lsof -i :3000 :4003 :4004

# 3. Start customer service
cd apps/customer-service
source ~/.nvm/nvm.sh && pnpm run dev &
sleep 3

# 4. Start reservation service
cd ../reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev &
sleep 3

# 5. Start frontend
cd ../../apps/frontend
source ~/.nvm/nvm.sh && pnpm start
```

### Quick Restart (Single Service)

```bash
# Restart reservation service only
pkill -f "reservation-service"
cd apps/reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev
```

### Development Workflow

```bash
# Terminal 1: Customer Service
cd apps/customer-service
source ~/.nvm/nvm.sh && pnpm run dev

# Terminal 2: Reservation Service
cd apps/reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev

# Terminal 3: Frontend
cd apps/frontend
source ~/.nvm/nvm.sh && pnpm start
```

---

## Health Check Commands

### Quick Health Check
```bash
#!/bin/bash
echo "🔍 Checking Tailtown Services..."

# Frontend
if curl -s http://localhost:3000 > /dev/null; then
  echo "✅ Frontend (3000): Running"
else
  echo "❌ Frontend (3000): Down"
fi

# Reservation Service
if curl -s http://localhost:4003/health | grep -q "up"; then
  echo "✅ Reservation Service (4003): Healthy"
else
  echo "❌ Reservation Service (4003): Unhealthy"
fi

# Customer Service
if curl -s http://localhost:4004/health | grep -q "up"; then
  echo "✅ Customer Service (4004): Healthy"
else
  echo "❌ Customer Service (4004): Unhealthy"
fi

# Databases
if docker ps | grep -q "tailtown-postgres"; then
  echo "✅ PostgreSQL: Running"
else
  echo "❌ PostgreSQL: Down"
fi
```

### Detailed Service Info
```bash
# Get detailed service information
curl -s http://localhost:4003/health | jq
curl -s http://localhost:4004/health | jq

# Check service logs
# (View the terminal where service is running)
```

---

## Environment Variables

### Required Variables

**Reservation Service** (`apps/reservation-service/.env`):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/reservation"
PORT=4003
NODE_ENV=development
CUSTOMER_SERVICE_URL="http://localhost:4004/health"
```

**Customer Service** (`apps/customer-service/.env`):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/customer"
PORT=4004
NODE_ENV=development
JWT_SECRET=your-secret-key
```

**Frontend** (`apps/frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:4003
REACT_APP_CUSTOMER_API_URL=http://localhost:4004
REACT_APP_TENANT_ID=dev
```

---

## Debugging Tips

### Enable Verbose Logging
```bash
# Start with debug logging
DEBUG=* pnpm run dev

# Or specific namespaces
DEBUG=express:* pnpm run dev
```

### Check Service Dependencies
```bash
# Verify customer service is accessible from reservation service
curl http://localhost:4004/health

# Test cross-service communication
curl -H "x-tenant-id: dev" http://localhost:4003/api/reservations
```

### Monitor Network Traffic
```bash
# Watch API calls in browser DevTools
# Network tab → Filter by "localhost:4003" or "localhost:4004"

# Or use curl with verbose output
curl -v -H "x-tenant-id: dev" http://localhost:4003/api/reservations
```

---

## Prevention Best Practices

1. **Always use NVM**: `source ~/.nvm/nvm.sh` before starting services
2. **Start in order**: Databases → Backend services → Frontend
3. **Verify each service**: Check health endpoint before starting next
4. **Use separate terminals**: One terminal per service for easy monitoring
5. **Check logs**: Watch for startup errors and warnings
6. **Document changes**: Update .env.example when adding new variables

---

## Getting Help

If issues persist:

1. **Check logs**: Review terminal output for error messages
2. **Verify configuration**: Ensure .env files are correct
3. **Test individually**: Start services one at a time
4. **Check documentation**: Review service-specific README files
5. **Ask for help**: Include error messages and steps taken

---

## Related Documentation

- [Service Architecture](../architecture/SERVICES.md)
- [Database Setup](../setup/DATABASE.md)
- [Development Environment](../setup/DEVELOPMENT.md)
- [API Documentation](../api/README.md)
