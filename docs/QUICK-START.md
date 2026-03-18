# Quick Start Guide

**Time to productivity:** < 10 minutes

---

## 🌐 For End Users (No Setup Required!)

**Just visit the production site:**

- **Tailtown (Production):** https://tailtown.canicloud.com
- **BranGro (Demo):** https://brangro.canicloud.com

No installation needed! 🎉

---

## 💻 For Developers (Local Development Setup)

### Prerequisites

1. Node.js (versión especificada en [.nvmrc](/.nvmrc))
2. Package manager [`pnpm`](https://pnpm.io/) (versión especificada en [package.json](/package.json): `"packageManager"` field).
    - Check out **_why_** and how to install it [here](https://gist.github.com/daguttt/89adeb45ef3cf6483c394e135ce6e9ec).
3. Docker
4. PostgreSQL 14+
5. Redis

### 🚀 Get Running

### 1. Clone and Install

```bash
git clone https://github.com/moosecreates/tailtown.git
cd tailtown
pnpm install
```

### 2. Setup Environment

```bash
# Sript to copy .env.example files to .env files
pnpm run env:setup
```

- Replace `username` and `password` placeholders with your actual credentials for the `DATABASE_URL` and `TEST_DATABASE_URL`.

### 3. Setup Databases

1. **Verify your local PostgreSQL instance does not have objects (tables, functions, etc.) in the `template1` database**
    <details>
    <summary>Why?</summary>

    The `template1` database is used as a template for creating new databases. If it contains objects, those objects will be copied to any new database created from it. This can cause issues with database migrations and schema management and can cause `prisma migrate dev` to fail with P3005.

    </details>

2. **Create PostgreSQL databases and apply migrations**

```bash
pnpm run db:setup
```

### 4. Start Development Servers

```bash
pnpm run dev
```

### 5. Verify Local Development Works

- **Frontend:** http://localhost:3000
- **Customer API:** http://localhost:4004/health
- **Reservation API:** http://localhost:4003/health

**Note:** These are LOCAL development URLs. Production uses https://canicloud.com

### 6. Create a Super Admin (Development Only)

```bash
pnpm --filter @tailtown/customer-service exec tsx src/scripts/create-super-admin.ts
```

**Note:** Use this script only in local development. Do not run it against production.

1. Check the credentials in the script [`create-super-admin.ts`](../apps/customer-service/src/scripts/create-super-admin.ts).
2. Login in by going to http://localhost:3000/admin-portal/login
3. (Optional) You could continue by setting up a demo tenant using [DEMO-TEST-DATA-SETUP.md](DEMO-TEST-DATA-SETUP.md)

---

## 🧪 Run Tests

```bash
pnpm test

pnpm --filter @tailtown/customer-service test

pnpm --filter @tailtown/customer-service test -- --testPathPattern=security
```

---

## 📚 Next Steps

- **Demo test data:** [DEMO-TEST-DATA-SETUP.md](DEMO-TEST-DATA-SETUP.md)
- **Best practices:** [development/DEVELOPMENT-BEST-PRACTICES.md](development/DEVELOPMENT-BEST-PRACTICES.md)
- **Security:** [security/SECURITY.md](security/SECURITY.md)
- **Testing:** [testing/TESTING.md](testing/TESTING.md)
- **Roadmap:** [ROADMAP.md](ROADMAP.md)

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

## 📚 Documentation

- **[Service Startup Guide](troubleshooting/SERVICE-STARTUP-GUIDE.md)** - Detailed troubleshooting
- **[Architecture Overview](architecture/OVERVIEW.md)** - System design
- **[API Documentation](api/README.md)** - API endpoints
- **[Development Guide](development/GUIDE.md)** - Development workflow
- **[MCP Server Setup](../mcp-server/README.md)** - AI-enhanced code search

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
