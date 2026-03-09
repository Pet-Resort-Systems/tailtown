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

### 🚀 Get Running

### 1. Clone and Install

```bash
git clone https://github.com/moosecreates/tailtown.git
cd tailtown
pnpm install
```

### 2. Setup Environment

```bash
# Use the environment manager to set up development
pnpm run env:dev

# Or manually copy templates:
cp apps/customer-service/.env.example apps/customer-service/.env
cp apps/reservation-service/.env.example apps/reservation-service/.env

# Edit .env files and set:
# - DATABASE_URL (PostgreSQL connection)
# - JWT_SECRET (any random string)
# - JWT_REFRESH_SECRET (different random string)
```

### 3. Setup Database

```bash
# Customer service database
cd apps/customer-service
pnpm exec prisma migrate dev
pnpm exec prisma generate

# Reservation service database (uses same DB)
cd ../reservation-service
pnpm exec prisma generate
```

### 4. Start Development Server

**Option A: Use the dev workflow (recommended)**

```bash
# Start all services at once
pnpm run dev:restart

# Check status
pnpm run dev:status

# View logs
pnpm run dev:logs

# Stop all services
pnpm run dev:stop
```

**Option B: Start services manually**

```bash
# Terminal 1: Customer Service
cd apps/customer-service
pnpm run dev

# Terminal 2: Reservation Service
cd apps/reservation-service
pnpm run dev

# Terminal 3: Frontend
cd apps/frontend
pnpm start
```

### 5. Verify Local Development Works

- **Frontend:** http://localhost:3000
- **Customer API:** http://localhost:4004/health
- **Reservation API:** http://localhost:4003/health

**Note:** These are LOCAL development URLs. Production uses https://canicloud.com

---

## 🧪 Run Tests

```bash
# All tests
pnpm test

# Specific service
cd apps/customer-service && pnpm test

# Security tests
cd apps/customer-service && pnpm test -- --testPathPattern=security
```

---

## 🛠️ Make Your First Change

### Add a New API Endpoint

1. **Create route** in `apps/customer-service/src/routes/`:

```typescript
router.get("/my-endpoint", myHandler);
```

2. **Create controller** in `apps/customer-service/src/controllers/`:

```typescript
export const myHandler = async (req, res) => {
  res.json({ message: "Hello!" });
};
```

3. **Add test** in `apps/customer-service/src/__tests__/`:

```typescript
test("my endpoint works", async () => {
  const response = await request(app).get("/api/my-endpoint");
  expect(response.status).toBe(200);
});
```

4. **Run test**:

```bash
pnpm test
```

---

## 📚 Next Steps

- **Common Tasks:** [COMMON-TASKS.md](./COMMON-TASKS.md)
- **Security:** [SECURITY.md](./SECURITY.md)
- **Testing:** [TESTING.md](./TESTING.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🆘 Troubleshooting

**Database connection fails:**

```bash
# Check PostgreSQL is running
psql -h localhost -p 5432 -U postgres

# Update DATABASE_URL in .env
```

**Port already in use:**

```bash
# Find process using port
lsof -i :4004

# Kill it
kill -9 <PID>
```

**Tests failing:**

```bash
# Clear and rebuild
rm -rf node_modules
pnpm install
pnpm test
```

---

**Need more details?** See [AI Context Docs](/docs/ai-context/)
