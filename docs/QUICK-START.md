# Tailtown Quick Start Guide

**Last Updated**: December 2, 2025

## 🚀 Get Started in 5 Minutes

### Prerequisites

- Node.js 24.x
- Docker Desktop
- Git

### Quick Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd tailtown
pnpm install

# 2. Start PostgreSQL (if not running)
docker ps | grep postgres || docker start tailtown-postgres

# 3. Start all services (use 3 separate terminals)
```

### Terminal 1: Customer Service

```bash
cd apps/customer-service
source ~/.nvm/nvm.sh
pnpm run dev
# Wait for: "Customer service running on port 4004"
```

### Terminal 2: Reservation Service

```bash
cd apps/reservation-service
source ~/.nvm/nvm.sh
PORT=4003 pnpm run dev
# Wait for: "Reservation service running on port 4003"
```

### Terminal 3: Frontend

```bash
cd apps/frontend
source ~/.nvm/nvm.sh
pnpm start
# Wait for: "Compiled successfully!"
# Browser opens automatically at http://localhost:3000
```

---

## ✅ Verify Everything Works

### Check Services

```bash
# All should return success
curl http://localhost:4003/health  # Reservation service
curl http://localhost:4004/health  # Customer service
curl http://localhost:3000         # Frontend (HTML response)
```

### Test Login

1. Open http://localhost:3000
2. Login with: `admin@tailtown.com` / `bypass`
3. You should see the dashboard

---

## 🔧 Common Commands

### Service Status

```bash
# Check what's running
lsof -i :3000  # Frontend
lsof -i :4003  # Reservation
lsof -i :4004  # Customer

# Quick health check
curl -s http://localhost:4003/health | grep "up" && echo "✅ Reservation OK"
curl -s http://localhost:4004/health | grep "up" && echo "✅ Customer OK"
```

### Restart Services

```bash
# Kill all services
pkill -f "node"
pkill -f "react-scripts"

# Restart individual service
pkill -f "reservation-service"
cd apps/reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev
```

### Database

```bash
# Check PostgreSQL
docker ps | grep postgres

# Connect to database
psql -h localhost -p 5433 -U postgres -d customer

# Run migrations
cd apps/customer-service
pnpm exec prisma migrate deploy

cd ../reservation-service
pnpm exec prisma migrate deploy
```

---

## 📍 Key URLs

| Service           | URL                                     | Purpose               |
| ----------------- | --------------------------------------- | --------------------- |
| Frontend          | http://localhost:3000                   | Main application      |
| Dashboard         | http://localhost:3000/dashboard         | Home page             |
| Grooming Calendar | http://localhost:3000/calendar/grooming | Grooming reservations |
| Boarding Calendar | http://localhost:3000/calendar          | Boarding/daycare      |
| Customer API      | http://localhost:4004/api/customers     | Customer data         |
| Reservation API   | http://localhost:4003/api/reservations  | Reservation data      |
| Health Checks     | :4003/health, :4004/health              | Service status        |

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# 1. Check if port is in use
lsof -i :4003

# 2. Kill the process
kill -9 <PID>

# 3. Ensure NVM is loaded
source ~/.nvm/nvm.sh

# 4. Try starting again
PORT=4003 pnpm run dev
```

### ERR_CONNECTION_REFUSED

```bash
# Service isn't running - start it
cd apps/reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Start if needed
docker start tailtown-postgres

# Verify connection
psql -h localhost -p 5433 -U postgres -d customer -c "SELECT 1;"
```

### Frontend Shows Errors

```bash
# Clear cache and restart
cd apps/frontend
rm -rf node_modules/.cache
pnpm start
```

---

## 🤖 MCP RAG Server (Optional)

The MCP RAG server provides AI-enhanced code search capabilities for Windsurf/Cascade.

### Quick Setup

```bash
# Install Python dependencies
cd mcp-server
pip install -r requirements.txt

# Configure in Windsurf
# Edit ~/.codeium/windsurf/mcp_config.json
# See mcp-server/README.md for full configuration

# Test it works
# In Windsurf, try: mcp0_list_indexed_files()
```

**Documentation**: See [MCP Server README](../mcp-server/README.md) for complete setup.

---

## 📚 Documentation

- **[Service Startup Guide](troubleshooting/SERVICE-STARTUP-GUIDE.md)** - Detailed troubleshooting
- **[Architecture Overview](architecture/OVERVIEW.md)** - System design
- **[API Documentation](api/README.md)** - API endpoints
- **[Development Guide](development/GUIDE.md)** - Development workflow
- **[MCP Server Setup](../mcp-server/README.md)** - AI-enhanced code search

---

## 🎯 Quick Tasks

### Create a Grooming Reservation

1. Go to http://localhost:3000/calendar/grooming
2. Click on a time slot
3. Fill in customer, pet, and grooming service
4. Submit → Add-ons dialog appears
5. Skip or add services → Redirects to checkout

### View All Reservations

1. Go to http://localhost:3000/reservations
2. See list of all reservations
3. Click status chip to change status
4. Click reservation to view details

### Add a New Customer

1. Go to http://localhost:3000/customers
2. Click "Add Customer" button
3. Fill in customer details
4. Save → Customer created

---

## ⚡ Development Tips

### Hot Reload

- Frontend: Auto-reloads on file changes
- Backend: Uses `ts-node-dev` for auto-restart
- Database: Requires manual migration after schema changes

### Debugging

```bash
# Enable verbose logging
DEBUG=* pnpm run dev

# Watch API calls in browser
# Open DevTools → Network tab → Filter by "localhost:4003"

# Check service logs
# View terminal where service is running
```

### Testing API Endpoints

```bash
# Get reservations
curl -H "x-tenant-id: dev" \
  "http://localhost:4003/api/reservations?page=1&limit=5"

# Get customers
curl "http://localhost:4004/api/customers?page=1&limit=5"

# Create reservation (POST)
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: dev" \
  -d '{"customerId":"...","petId":"...","serviceId":"..."}' \
  http://localhost:4003/api/reservations
```

---

## 🆘 Getting Help

1. **Check logs** in the terminal where service is running
2. **Review documentation** in `/docs` folder
3. **Search issues** in the repository
4. **Ask for help** with error messages and steps taken

---

## 🎉 You're Ready!

All services should now be running. Open http://localhost:3000 and start exploring!

**Next Steps:**

- Explore the dashboard
- Create a test reservation
- Try the grooming calendar
- Review the documentation

**Happy coding! 🚀**
