# DevOps Guide

## Server Management

### Development Environment Setup

1. Node.js Environment
```bash
# Always source nvm before starting servers
source ~/.nvm/nvm.sh
```

2. Starting Services
```bash
# Start customer service (Terminal 1)
cd apps/customer-service
source ~/.nvm/nvm.sh
pnpm run dev

# Start reservation service (Terminal 2)
cd apps/reservation-service
source ~/.nvm/nvm.sh
PORT=4003 pnpm run dev

# Start frontend (Terminal 3)
cd apps/frontend
source ~/.nvm/nvm.sh
pnpm start
```

### Process Management

#### Checking Running Processes
```bash
# Check frontend server (port 3000)
lsof -i :3000

# Check customer service (port 4004)
lsof -i :4004

# Check reservation service (port 4003)
lsof -i :4003
```

#### Killing Processes
```bash
# Kill a process
kill -9 [PID]

# Example:
kill -9 58875
```

### Best Practices

1. Server Start Order
   - Start customer service first (port 4004)
   - Start reservation service second (port 4003)
   - Start frontend last (port 3000)
   - Wait for each service to fully initialize before starting the next
   - Verify all three services are running before testing

2. Process Management
   - Always check for existing processes before starting servers
   - Kill existing processes to avoid port conflicts
   - Use proper process termination commands

3. Environment
   - Use nvm to ensure correct Node.js version
   - Verify .env files are properly configured
   - Check database connection before starting servers

## Deployment Considerations

1. Environment Variables
   - Use .env.example as template
   - Never commit actual .env files
   - Verify all required variables are set

2. File Storage
   - Regular backup of uploads directory
   - Monitor disk space usage
   - Clean up temporary files

3. Database
   - Run migrations before deployment
   - Verify backup systems are in place
   - Monitor database connections
