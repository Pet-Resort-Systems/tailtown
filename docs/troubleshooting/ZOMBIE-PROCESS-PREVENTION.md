# Zombie Process Prevention Guide

## Problem Overview

Tailtown development servers can accumulate "zombie" processes that:
- Consume 98-100% CPU
- Prevent new servers from starting properly
- Cause Cascade/IDE to hang or crash
- Require manual cleanup

## Root Causes

1. **Improper Server Shutdown**: Ctrl+C doesn't always kill all child processes
2. **Multiple Restarts**: Starting servers without killing previous instances
3. **Development Tools**: `ts-node-dev` and `react-scripts` spawn multiple processes
4. **Port Conflicts**: New servers start but old ones keep running

## Prevention Strategies

### 1. Use the Health Check Script

Run regularly to detect issues early:

```bash
node scripts/health-check.js
```

**Recommended Schedule:**
- Before starting work: Check server health
- After errors: Verify no zombies created
- End of day: Clean shutdown verification

### 2. Proper Server Shutdown

Always use these commands instead of Ctrl+C:

```bash
# Kill all development servers
pkill -9 -f "ts-node-dev"
pkill -9 -f "react-scripts"

# Or use the cleanup script
./scripts/dev-servers.sh cleanup
```

### 3. Use the Server Management Script

The `dev-servers.sh` script handles cleanup automatically:

```bash
# Start all servers (with automatic cleanup)
./scripts/dev-servers.sh start

# Stop all servers (with cleanup)
./scripts/dev-servers.sh stop

# Restart (stop + cleanup + start)
./scripts/dev-servers.sh restart

# Check status
./scripts/dev-servers.sh status

# Manual cleanup
./scripts/dev-servers.sh cleanup
```

### 4. Monitor Process Count

Set up a simple monitoring alias in your `~/.zshrc`:

```bash
alias check-tailtown='ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l'
```

**Healthy State:** 3-6 processes (1-2 per service)
**Warning:** 7-10 processes
**Critical:** >10 processes (cleanup needed)

### 5. Automated Cleanup (Optional)

Add to your `~/.zshrc` for automatic cleanup on terminal close:

```bash
# Cleanup Tailtown processes on terminal exit
trap 'pkill -9 -f "ts-node-dev" 2>/dev/null; pkill -9 -f "react-scripts" 2>/dev/null' EXIT
```

## Detection Methods

### Quick Check
```bash
# Count processes
ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l

# Show details
ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep
```

### CPU Usage Check
```bash
# Find processes using >50% CPU
ps aux | grep -E "(ts-node-dev|react-scripts|node)" | grep -v grep | awk '$3 > 50.0'
```

### Port Check
```bash
# Check what's using our ports
lsof -i :3000 -i :4003 -i :4004 | grep LISTEN
```

## Cleanup Procedures

### Quick Cleanup
```bash
# Kill all zombie processes
pkill -9 -f "ts-node-dev"
pkill -9 -f "react-scripts"

# Kill by port
lsof -ti :4004 | xargs kill -9 2>/dev/null
lsof -ti :4003 | xargs kill -9 2>/dev/null
lsof -ti :3000 | xargs kill -9 2>/dev/null
```

### Full Cleanup
```bash
# Use the management script
./scripts/dev-servers.sh cleanup

# Or manual comprehensive cleanup
pkill -9 -f "ts-node-dev"
pkill -9 -f "react-scripts"
pkill -9 -f "node.*dev"
for port in 3000 3001 4003 4004; do
  lsof -ti :$port | xargs kill -9 2>/dev/null
done
```

## Testing

### Run Health Check Tests
```bash
pnpm test -- scripts/__tests__/health-check.test.js
```

### Manual Testing Checklist
- [ ] Start all servers
- [ ] Check process count (should be 3-6)
- [ ] Stop all servers
- [ ] Verify process count is 0
- [ ] Check no ports are in use
- [ ] Restart servers
- [ ] Verify clean startup

## Best Practices

### Daily Workflow

**Morning:**
1. Run health check: `node scripts/health-check.js`
2. Clean up if needed: `./scripts/dev-servers.sh cleanup`
3. Start servers: `./scripts/dev-servers.sh start`

**During Development:**
1. Use `./scripts/dev-servers.sh restart` instead of manual restarts
2. Check status periodically: `./scripts/dev-servers.sh status`
3. If errors occur, check for zombies immediately

**End of Day:**
1. Stop servers properly: `./scripts/dev-servers.sh stop`
2. Verify cleanup: `node scripts/health-check.js`

### When Things Go Wrong

1. **IDE/Cascade Hangs:**
   - Don't force quit immediately
   - Open terminal, run cleanup commands
   - Wait 10 seconds
   - Try IDE again

2. **Servers Won't Start:**
   - Run health check
   - Kill zombies
   - Wait 5 seconds
   - Try starting again

3. **High CPU Usage:**
   - Check for zombie processes
   - Kill them immediately
   - Restart servers cleanly

## Monitoring Setup

### Add to package.json Scripts

```json
{
  "scripts": {
    "health": "node scripts/health-check.js",
    "cleanup": "./scripts/dev-servers.sh cleanup",
    "dev:start": "./scripts/dev-servers.sh start",
    "dev:stop": "./scripts/dev-servers.sh stop",
    "dev:restart": "./scripts/dev-servers.sh restart",
    "dev:status": "./scripts/dev-servers.sh status"
  }
}
```

### Cron Job (Optional)

Add to crontab for automatic monitoring:

```bash
# Check health every 30 minutes during work hours
*/30 9-18 * * 1-5 cd /path/to/tailtown && node scripts/health-check.js >> .logs/health-check.log 2>&1
```

## Troubleshooting

### Problem: Can't Kill Processes
```bash
# Use force kill with sudo (last resort)
sudo pkill -9 -f "ts-node-dev"
sudo pkill -9 -f "react-scripts"
```

### Problem: Ports Still in Use After Cleanup
```bash
# Force kill by port
sudo lsof -ti :4004 | xargs sudo kill -9
sudo lsof -ti :4003 | xargs sudo kill -9
sudo lsof -ti :3000 | xargs sudo kill -9
```

### Problem: Process Count Keeps Growing
```bash
# Check for runaway processes
ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | awk '{print $2, $3, $11}'

# Kill by PID if needed
kill -9 <PID>
```

## Prevention Checklist

- [ ] Use server management script for all operations
- [ ] Run health check before starting work
- [ ] Never use Ctrl+C to stop servers
- [ ] Always verify cleanup after stopping
- [ ] Monitor process count regularly
- [ ] Clean up at end of day
- [ ] Run tests to verify health check works
- [ ] Document any new zombie scenarios

## Related Files

- `scripts/dev-servers.sh` - Server management script
- `scripts/health-check.js` - Health monitoring script
- `scripts/__tests__/health-check.test.js` - Health check tests
- `KILL-ZOMBIES.md` - Quick reference guide
- `.pids/` - Process ID files (created by management script)
- `.logs/` - Server logs (created by management script)

## Additional Resources

- [Node.js Process Management](https://nodejs.org/api/process.html)
- [Unix Process Signals](https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html)
- [ts-node-dev Documentation](https://github.com/wclr/ts-node-dev)
