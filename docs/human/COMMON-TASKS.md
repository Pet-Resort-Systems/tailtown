# Common Development Tasks

Quick recipes for frequent tasks.

---

## 🔧 Database Tasks

### Add a New Field
```bash
# 1. Edit schema
vim apps/customer-service/prisma/schema.prisma

# 2. Create migration
cd apps/customer-service
pnpm exec prisma migrate dev --name add_my_field

# 3. Regenerate client
pnpm exec prisma generate
```

### Reset Database
```bash
cd apps/customer-service
pnpm exec prisma migrate reset
```

---

## 🛣️ API Tasks

### Add a New Endpoint

**1. Create validation schema** (`/validators/myFeature.validators.ts`):
```typescript
import { z } from 'zod';

export const mySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email()
});
```

**2. Create controller** (`/controllers/myFeature.controller.ts`):
```typescript
export const createItem = async (req, res, next) => {
  try {
    const data = req.body; // Already validated
    const item = await prisma.myModel.create({ data });
    res.status(201).json({ status: 'success', data: item });
  } catch (error) {
    next(error);
  }
};
```

**3. Create route** (`/routes/myFeature.routes.ts`):
```typescript
import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import { mySchema } from '../validators/myFeature.validators';
import { createItem } from '../controllers/myFeature.controller';

const router = Router();
router.post('/', validateBody(mySchema), createItem);
export default router;
```

**4. Register route** (`/index.ts`):
```typescript
import myFeatureRoutes from './routes/myFeature.routes';
app.use('/api/my-feature', myFeatureRoutes);
```

---

## 🧪 Testing Tasks

### Add a Test
```typescript
// apps/customer-service/src/__tests__/myFeature.test.ts
import request from 'supertest';
import app from '../index';

describe('My Feature', () => {
  test('creates item', async () => {
    const response = await request(app)
      .post('/api/my-feature')
      .send({ name: 'Test', email: 'test@example.com' });
    
    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('Test');
  });
});
```

### Run Specific Tests
```bash
# Single file
pnpm test -- myFeature.test.ts

# Pattern
pnpm test -- --testPathPattern=security

# Watch mode
pnpm test -- --watch
```

---

## 🔒 Security Tasks

### Add Input Validation
```typescript
// 1. Import
import { validateBody } from '../middleware/validation.middleware';
import { mySchema } from '../validators/mySchema';

// 2. Apply to route
router.post('/endpoint', validateBody(mySchema), handler);
```

### Add Rate Limiting
```typescript
// 1. Import
import { loginRateLimiter } from '../middleware/rateLimiter.middleware';

// 2. Apply to route
router.post('/login', loginRateLimiter, loginHandler);
```

---

## 🚀 Deployment Tasks

### Deploy to Staging
```bash
git push origin develop
# Auto-deploys via CI/CD
```

### Deploy to Production
```bash
git checkout main
git merge develop
git push origin main
# Auto-deploys via CI/CD
```

### Run Migrations in Production
```bash
# SSH to production
ssh production-server

# Run migrations
cd /app/apps/customer-service
pnpm exec prisma migrate deploy
```

---

## 🐛 Debugging Tasks

### View Logs
```bash
# Development
pnpm run dev # Logs to console

# Production
pm2 logs customer-service
```

### Debug Tests
```typescript
// Add to test
console.log('Debug:', variable);

// Or use debugger
debugger; // Then run: node --inspect-brk
```

### Check Database
```bash
cd apps/customer-service
pnpm exec prisma studio
# Opens GUI at http://localhost:5555
```

---

## 📦 Dependency Tasks

### Add a Package
```bash
cd apps/customer-service
pnpm add package-name

# Dev dependency
pnpm add -D package-name
```

### Update Packages
```bash
pnpm update

# Check outdated
pnpm outdated
```

---

## 🔄 Git Tasks

### Create Feature Branch
```bash
git checkout -b feature/my-feature
```

### Commit Changes
```bash
git add .
git commit -m "feat: add my feature"
```

### Update from Main
```bash
git checkout main
git pull
git checkout feature/my-feature
git rebase main
```

---

## 📚 More Information

- **Security Details:** [/docs/human/SECURITY.md](./SECURITY.md)
- **Testing Guide:** [/docs/human/TESTING.md](./TESTING.md)
- **Full Context:** [/docs/ai-context/](../ai-context/)
