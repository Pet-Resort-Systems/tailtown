# Development Workflow Guide

**Last Updated**: November 3, 2025

This guide covers the complete development workflow for Tailtown, from starting services to debugging issues.

## Table of Contents
- [Quick Start](#quick-start)
- [Daily Workflow](#daily-workflow)
- [Service Management](#service-management)
- [Environment Management](#environment-management)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Quick Start

### First Time Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Start Databases**
   ```bash
   docker-compose up -d
   ```

3. **Verify Environment Files**
   ```bash
   pnpm run dev:check
   ```

4. **Start All Services**
   ```bash
   pnpm run dev:start
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - Customer API: http://localhost:4004
   - Reservation API: http://localhost:4003

---

## Daily Workflow

### Morning Routine

```bash
# 1. Check service status
pnpm run dev:status

# 2. Run pre-flight checks
pnpm run dev:check

# 3. Start services (if not running)
pnpm run dev:start

# 4. Verify health
pnpm run health:check
```

### During Development

```bash
# Check what's running
pnpm run dev:status

# View live logs
pnpm run dev:logs

# Restart a specific service (manual)
cd apps/customer-service && pnpm run dev

# Restart all services
pnpm run dev:restart
```

### End of Day

```bash
# Stop all services
pnpm run dev:stop

# Or let them run overnight (they'll auto-cleanup zombies)
```

---

## Service Management

### Available Commands

| Command                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `pnpm run dev:start`    | Start all development services with pre-flight checks |
| `pnpm run dev:stop`     | Stop all services gracefully                          |
| `pnpm run dev:restart`  | Restart all services                                  |
| `pnpm run dev:status`   | Show detailed status of all services                  |
| `pnpm run dev:check`    | Run pre-flight checks without starting                |
| `pnpm run dev:cleanup`  | Clean up zombie processes                             |
| `pnpm run dev:logs`     | View live logs from all services                      |
| `pnpm run health:check` | Check health endpoints                                |

### Service Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend                       │
│            http://localhost:3000                │
│              (React + TypeScript)               │
└────────────┬────────────────────┬───────────────┘
             │                    │
             ▼                    ▼
┌────────────────────┐  ┌────────────────────────┐
│  Customer Service  │  │  Reservation Service   │
│  localhost:4004    │  │    localhost:4003      │
│  (customers, pets, │  │  (reservations,        │
│   staff, services) │  │   resources, avail.)   │
└─────────┬──────────┘  └──────────┬─────────────┘
          │                        │
          └────────┬───────────────┘
                   ▼
          ┌────────────────┐
          │   PostgreSQL   │
          │  localhost:5433│
          │  (customer DB) │
          └────────────────┘
```

### Port Assignments

- **3000**: Frontend (React)
- **4003**: Reservation Service API
- **4004**: Customer Service API
- **5433**: PostgreSQL (main database)
- **5435**: PostgreSQL (secondary database)

---

## Environment Management

### Quick Environment Commands

```bash
pnpm run env:status    # Check current environment
pnpm run env:dev       # Switch to development (localhost)
pnpm run env:prod      # Switch to production (Digital Ocean)
pnpm run env:backups   # List environment backups
```

### Switching Environments

The environment manager safely switches between development and production:

**Development** (default):
```bash
pnpm run env:dev
pnpm run dev:restart
```

**Production** (requires confirmation):
```bash
pnpm run env:prod
pnpm run dev:restart
```

### Safety Features

- ✅ Automatic backup of current configuration
- ✅ Production switch requires confirmation
- ✅ Validates configuration files
- ✅ Reminds you to restart services
- ✅ Shows clear status of current environment

### Best Practice

**Always verify your environment before starting work:**

```bash
# Check environment
pnpm run env:status

# If not in development, switch
pnpm run env:dev

# Then start services
pnpm run dev:start
```

**📖 See [ENVIRONMENT-MANAGEMENT.md](./ENVIRONMENT-MANAGEMENT.md) for complete guide**

---

## Environment Configuration

### Development vs Production

**Development** (localhost):
```bash
# apps/frontend/.env
REACT_APP_TENANT_ID=dev
REACT_APP_API_URL=http://localhost:4004
REACT_APP_RESERVATION_API_URL=http://localhost:4003
```

**Production** (Digital Ocean):
```bash
# apps/frontend/.env
REACT_APP_TENANT_ID=dev
REACT_APP_API_URL=http://129.212.178.244:4004
REACT_APP_RESERVATION_API_URL=http://129.212.178.244:4003
```

### Backend Services

Both services use the same database configuration:

```bash
# apps/customer-service/.env
# apps/reservation-service/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/customer"
PORT=4004  # or 4003 for reservation service
NODE_ENV=development
```

### Switching Environments

**⚠️ CRITICAL**: Always verify your `.env` files before starting development:

```bash
# Check frontend configuration
grep "REACT_APP_API_URL" apps/frontend/.env

# Should show: http://localhost:4004 (NOT production IP)
```

The `pnpm run dev:check` command automatically validates this.

---

## Troubleshooting

### Common Issues

#### 1. Services Won't Start

**Symptom**: Port already in use errors

**Solution**:
```bash
# Clean up zombie processes
pnpm run dev:cleanup

# Check what's using the ports
lsof -i :3000 -i :4003 -i :4004

# Force restart
pnpm run dev:restart
```

#### 2. Database Connection Errors

**Symptom**: `ECONNREFUSED` or `connection refused`

**Solution**:
```bash
# Check if databases are running
docker ps --filter "name=tailtown"

# Start databases
docker-compose up -d

# Verify connection
pnpm run dev:check
```

#### 3. Frontend Shows Production IP Error

**Symptom**: `ERR_CONNECTION_REFUSED` to `129.212.178.244`

**Solution**:
```bash
# Fix frontend .env
echo "REACT_APP_API_URL=http://localhost:4004" > apps/frontend/.env
echo "REACT_APP_RESERVATION_API_URL=http://localhost:4003" >> apps/frontend/.env

# Restart frontend
pnpm run dev:restart
```

#### 4. Zombie Processes Consuming CPU

**Symptom**: High CPU usage, multiple `ts-node-dev` processes

**Solution**:
```bash
# Automatic cleanup (recommended)
pnpm run dev:cleanup

# Manual cleanup
pkill -9 -f "ts-node-dev"
pkill -9 -f "react-scripts"

# Enable automatic daemon (optional)
pnpm run daemon:start
```

#### 5. Service Health Check Fails

**Symptom**: Health endpoint returns errors

**Solution**:
```bash
# Check service logs
pnpm run dev:logs

# Or check individual service
tail -f .logs/customer-service.log
tail -f .logs/reservation-service.log
tail -f .logs/frontend.log

# Restart specific service
cd apps/customer-service && pnpm run dev
```

### Debug Mode

For detailed debugging:

```bash
# Start services with verbose logging
cd apps/customer-service
DEBUG=* pnpm run dev

# Or check the log files
tail -f .logs/*.log
```

---

## Best Practices

### 1. Always Use pnpm Scripts

✅ **Do this**:
```bash
pnpm run dev:start
pnpm run dev:stop
```

❌ **Not this**:
```bash
cd apps/customer-service && pnpm run dev &
cd apps/reservation-service && pnpm run dev &
cd apps/frontend && pnpm start &
```

**Why**: pnpm scripts include proper cleanup, health checks, and logging.

### 2. Check Status Before Starting

```bash
# Always check first
pnpm run dev:status

# Then start if needed
pnpm run dev:start
```

### 3. Use Pre-flight Checks

```bash
# Before starting work
pnpm run dev:check
```

This validates:
- Node.js and pnpm versions
- Database containers running
- Environment files exist and are correct
- No zombie processes
- Ports are available

### 4. Monitor Logs During Development

```bash
# Keep a terminal open with logs
pnpm run dev:logs

# Or use health checks
pnpm run health:check
```

### 5. Clean Shutdown

```bash
# Always stop services properly
pnpm run dev:stop

# Not Ctrl+C on individual terminals (creates zombies)
```

### 6. Regular Cleanup

```bash
# Run cleanup if you notice performance issues
pnpm run dev:cleanup

# Check for zombies
ps aux | grep -E '(ts-node-dev|react-scripts)' | grep -v grep
```

### 7. Keep Environment Files Updated

- Never commit `.env` files (they're gitignored)
- Use `.env.example` as template
- Verify configuration with `pnpm run dev:check`
- Keep `DEVELOPMENT-STATUS.md` updated

### 8. Branch Workflow

```bash
# Always work on development branch
git checkout development

# Create feature branches from development
git checkout -b feature/my-feature

# Merge back to development
git checkout development
git merge feature/my-feature

# Push to GitHub
git push origin development
```

### 9. Database Migrations

```bash
# Generate migration
cd apps/customer-service
pnpm exec prisma migrate dev --name description

# Apply to reservation service too
cd ../reservation-service
pnpm exec prisma migrate dev --name description

# Regenerate clients
pnpm exec prisma generate
```

### 10. Testing Before Commits

```bash
# Run pre-flight checks
pnpm run dev:check

# Check service health
pnpm run health:check

# Run tests (if available)
pnpm test
```

---

## Advanced Workflows

### Working with Multiple Features

```bash
# Terminal 1: Services
pnpm run dev:start

# Terminal 2: Logs
pnpm run dev:logs

# Terminal 3: Development work
git checkout -b feature/new-feature
# ... make changes ...

# Terminal 4: Testing
pnpm run health:check
```

### Hot Reload Behavior

- **Frontend**: Auto-reloads on file changes
- **Backend Services**: Auto-restart on file changes (ts-node-dev)
- **Database Schema**: Requires manual Prisma regeneration

### Performance Monitoring

```bash
# Check for zombie processes
pnpm run dev:status

# Monitor resource usage
pnpm run health:check

# View detailed logs
pnpm run dev:logs
```

---

## Quick Reference

### One-Line Commands

```bash
# Full restart
pnpm run dev:restart

# Status check
pnpm run dev:status && pnpm run health:check

# Clean start
pnpm run dev:cleanup && pnpm run dev:start

# View logs
pnpm run dev:logs

# Pre-flight
pnpm run dev:check
```

### Emergency Recovery

```bash
# Nuclear option - clean everything and restart
pnpm run dev:stop
pnpm run dev:cleanup
docker-compose restart
sleep 5
pnpm run dev:check
pnpm run dev:start
```

---

## Getting Help

### Check These First

1. Run `pnpm run dev:check` - validates environment
2. Run `pnpm run dev:status` - shows what's running
3. Check `DEVELOPMENT-STATUS.md` - current configuration
4. View logs: `pnpm run dev:logs`

### Common Commands Cheat Sheet

```bash
# Start/Stop
pnpm run dev:start      # Start all services
pnpm run dev:stop       # Stop all services
pnpm run dev:restart    # Restart everything

# Status
pnpm run dev:status     # Detailed status
pnpm run health:check   # Health endpoints
pnpm run dev:check      # Pre-flight checks

# Debugging
pnpm run dev:logs       # Live logs
pnpm run dev:cleanup    # Clean zombies

# Database
docker ps              # Check containers
docker-compose up -d   # Start databases
docker-compose restart # Restart databases
```

---

## Related Documentation

- [DEVELOPMENT-STATUS.md](../../DEVELOPMENT-STATUS.md) - Current environment status
- [README.md](../../README.md) - Project overview
- [SETUP.md](../operations/SETUP.md) - Initial setup guide
- [FormGuidelines.md](./FormGuidelines.md) - Frontend development patterns

---

**Remember**: When in doubt, run `pnpm run dev:check` first!
