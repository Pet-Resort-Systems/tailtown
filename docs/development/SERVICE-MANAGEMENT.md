# Service Management Guide

This guide covers managing Tailtown services, startup, shutdown, and health monitoring.

## Quick Start

### Start All Services

```bash
# Start core services (frontend, customer, reservation, MCP)
npm run start:services

# Start all services including payment service
npm run start:services:full
```

### Stop All Services

```bash
npm run stop:services
```

### Check Service Health

```bash
# One-time health check
npm run health:check

# Continuous monitoring (updates every 10 seconds)
npm run health:watch
```

## Manual Service Management

### Individual Service Startup

**Frontend (port 3000):**

```bash
cd frontend
source ~/.nvm/nvm.sh
npm start
```

**Customer Service (port 4004):**

```bash
cd services/customer
source ~/.nvm/nvm.sh
npm run dev
```

**Reservation Service (port 4003):**

```bash
cd services/reservation-service
source ~/.nvm/nvm.sh
npm run dev
```

**Payment Service (port 4005) - Optional:**

```bash
cd services/payment-service
source ~/.nvm/nvm.sh
npm run dev
```

### Service Dependencies

1. **Database**: PostgreSQL must be running on port 5433
2. **Order**: Start backend services before frontend

## Health Monitoring

### Automated Health Monitor

The `health-monitor.js` script checks:

- Service availability (HTTP responses)
- Process counts (detects hangs)
- Port conflicts
- MCP server status

```bash
node scripts/health-monitor.js
```

### Manual Health Checks

```bash
# Check individual services
curl http://localhost:3000                    # Frontend
curl http://localhost:4004/api/customers      # Customer Service
curl http://localhost:4003/health             # Reservation Service

# Check process counts
ps aux | grep -E "(npm|node)" | grep tailtown | wc -l

# Check MCP server
pgrep -f "python3.*server.py"
```

## Troubleshooting

### Common Issues

#### 1. Service Hang (Too Many Processes)

**Symptoms:**

- Slow performance
- Services not responding
- High memory/CPU usage

**Solution:**

```bash
# Force cleanup all Node processes
pkill -f "ts-node-dev" && pkill -f "react-scripts"

# Or use the script
npm run stop:services
npm run start:services
```

#### 2. Port Conflicts

**Symptoms:**

- Service fails to start
- "Port already in use" errors

**Solution:**

```bash
# Find what's using the port
lsof -i :3000  # Frontend
lsof -i :4003  # Reservation service
lsof -i :4004  # Customer service

# Stop all services and restart
npm run stop:services
npm run start:services
```

#### 4. Database Connection Issues

**Symptoms:**

- Services return 500 errors
- "Connection refused" from PostgreSQL

**Solution:**

```bash
# Check PostgreSQL container
docker ps | grep postgres

# Restart database
docker-compose restart postgres

# Check connection
psql -h localhost -p 5433 -U postgres -d customer -c "SELECT 1;"
```

### Service Logs

All services write logs to the `logs/` directory when started via scripts:

```bash
# View service logs
tail -f logs/Frontend.log
```

### Process Management

#### Check Running Processes

```bash
# All Tailtown processes
ps aux | grep tailtown | grep -v grep

# Node.js processes specifically
ps aux | grep -E "(npm|node)" | grep -E "(tailtown|customer|reservation|payment|admin)"

# MCP server processes
ps aux | grep "python3.*server.py"
```

#### Clean Shutdown

```bash
# Graceful stop using PID files
npm run stop:services

# Force cleanup if needed
pkill -f "tailtown"
pkill -f "server.py"
```

## Testing Service Health

### Automated Tests

```bash
# Run service health tests
npm run test:services

# Run MCP server tests
npm run test:mcp

# Run all integration tests
npm run test:integration
```

### Manual Testing Checklist

- [ ] Frontend loads at http://localhost:3000
- [ ] Customer API responds at http://localhost:4004/api/customers
- [ ] Reservation API responds at http://localhost:4003/health
- [ ] MCP server is running (check with `pgrep -f server.py`)
- [ ] Database is accessible (psql connection works)
- [ ] Node process count is reasonable (< 20)
- [ ] No port conflicts between services

## Environment Setup

### Required Environment Variables

**Frontend (.env):**

```bash
REACT_APP_API_URL=http://localhost:3002/api
REACT_APP_RESERVATION_API_URL=http://localhost:4003
REACT_APP_CUSTOMER_API_URL=http://localhost:4004
```

**Customer Service (.env):**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/customer"
PORT=4004
```

**Reservation Service (.env):**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/customer"
PORT=4003
```

### Node Version Management

Always use NVM to ensure consistent Node versions:

```bash
source ~/.nvm/nvm.sh
nvm use 16.20.2
```

## Performance Monitoring

### Memory Usage

```bash
# Check Node.js process memory
ps aux | grep node | awk '{print $4, $11}' | sort -nr

# Check system memory
free -h
```

### Response Times

```bash
# Test API response times
time curl -s http://localhost:4004/api/customers > /dev/null
time curl -s http://localhost:4003/health > /dev/null
```

## Best Practices

1. **Use Scripts**: Always use `npm run start:services` and `npm run stop:services`
2. **Check Health**: Run `npm run health:check` before starting development
3. **Monitor Processes**: Keep an eye on Node process count to prevent hangs
4. **Use Logs**: Check `logs/` directory for debugging service issues
5. **Clean Shutdown**: Always stop services gracefully before system restart
6. **Environment**: Ensure all required environment variables are set
7. **Database**: Verify PostgreSQL is running before starting services

## Recovery Procedures

### Full System Recovery

```bash
# 1. Stop everything
npm run stop:services

# 2. Clean up any remaining processes
pkill -f "tailtown" || true
pkill -f "server.py" || true

# 3. Restart database if needed
docker-compose restart postgres

# 4. Start services fresh
npm run start:services

# 5. Verify health
npm run health:check
```

### Partial Service Recovery

```bash
# Restart specific service
npm run stop:services
npm run start:services

# Or restart manually (find PID first)
kill -TERM <PID>
# Then restart the service using manual commands
```
