# Development Best Practices

Quick reference for writing good code in Tailtown.

---

## 🎯 Core Principles

1. **Security First** - Validate all inputs, authenticate all requests
2. **Test Everything** - Write tests before pushing
3. **Keep It Simple** - Prefer simple solutions over clever ones
4. **DRY** - Don't Repeat Yourself (reuse existing code)
5. **Fail Fast** - Validate early, return errors clearly

---

## 🔒 Security

### Always Validate Input
```typescript
// ❌ Bad - No validation
router.post('/users', createUser);

// ✅ Good - Validated
router.post('/users', validateBody(createUserSchema), createUser);
```

### Always Authenticate
```typescript
// ❌ Bad - No auth
router.get('/sensitive-data', getData);

// ✅ Good - Authenticated
router.get('/sensitive-data', authenticate, getData);
```

### Never Trust User Input
```typescript
// ❌ Bad - Direct use
const name = req.body.name;
await db.query(`SELECT * FROM users WHERE name = '${name}'`);

// ✅ Good - Validated + parameterized
const { name } = req.body; // Already validated by middleware
await prisma.user.findMany({ where: { name } }); // Prisma prevents SQL injection
```

---

## 🧪 Testing

### Test Before You Push
```bash
# Always run tests
pnpm test

# Run specific tests
pnpm test -- myFeature.test.ts
```

### Write Tests for New Features
```typescript
// Test happy path
test('creates user successfully', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ name: 'John', email: 'john@example.com' });
  
  expect(response.status).toBe(201);
});

// Test error cases
test('rejects invalid email', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ name: 'John', email: 'invalid' });
  
  expect(response.status).toBe(400);
});
```

### Test Edge Cases
- Empty strings
- Very long strings
- Special characters
- Null/undefined
- Wrong types

---

## 💾 Database

### Use Migrations, Never Manual Changes
```bash
# ❌ Bad - Manual SQL
psql -c "ALTER TABLE users ADD COLUMN age INT"

# ✅ Good - Migration
pnpm exec prisma migrate dev --name add_age_to_users
```

### Use Transactions for Multiple Operations
```typescript
// ✅ Good - Atomic operation
await prisma.$transaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.profile.create({ data: profileData });
});
```

### Index Frequently Queried Fields
```prisma
model User {
  id    String @id
  email String @unique // ✅ Indexed
  
  @@index([tenantId, createdAt]) // ✅ Composite index
}
```

---

## 🛣️ API Design

### Use Consistent Naming
```typescript
// ✅ Good - RESTful
GET    /api/users       // List users
GET    /api/users/:id   // Get one user
POST   /api/users       // Create user
PUT    /api/users/:id   // Update user
DELETE /api/users/:id   // Delete user
```

### Return Consistent Responses
```typescript
// ✅ Good - Consistent format
res.status(200).json({
  status: 'success',
  data: user
});

// Error format
res.status(400).json({
  status: 'error',
  message: 'Validation failed',
  code: 'VALIDATION_ERROR',
  errors: [...]
});
```

### Use Proper HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (logged in, but no permission)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 📝 Code Style

### Use TypeScript Types
```typescript
// ❌ Bad - No types
const createUser = (data) => {
  return prisma.user.create({ data });
};

// ✅ Good - Typed
interface CreateUserData {
  name: string;
  email: string;
}

const createUser = async (data: CreateUserData): Promise<User> => {
  return prisma.user.create({ data });
};
```

### Destructure for Clarity
```typescript
// ❌ Bad - Unclear
const user = await getUser(req.body.id, req.user.tenantId);

// ✅ Good - Clear
const { id } = req.body;
const { tenantId } = req.user;
const user = await getUser(id, tenantId);
```

### Use Async/Await, Not Callbacks
```typescript
// ❌ Bad - Callback hell
getUser(id, (err, user) => {
  if (err) return handleError(err);
  getProfile(user.id, (err, profile) => {
    if (err) return handleError(err);
    // ...
  });
});

// ✅ Good - Async/await
try {
  const user = await getUser(id);
  const profile = await getProfile(user.id);
  // ...
} catch (error) {
  handleError(error);
}
```

---

## 🚨 Error Handling

### Use Try/Catch
```typescript
export const myHandler = async (req, res, next) => {
  try {
    const data = await someOperation();
    res.json({ status: 'success', data });
  } catch (error) {
    next(error); // Let error middleware handle it
  }
};
```

### Don't Leak Sensitive Info
```typescript
// ❌ Bad - Leaks stack trace
catch (error) {
  res.status(500).json({ error: error.stack });
}

// ✅ Good - Generic message
catch (error) {
  next(error); // Error middleware handles it safely
}
```

### Log Errors, Not Sensitive Data
```typescript
// ❌ Bad - Logs password
console.log('Login attempt:', { email, password });

// ✅ Good - No sensitive data
console.log('Login attempt:', { email, timestamp: new Date() });
```

---

## 🔄 Git Workflow

### Write Clear Commit Messages
```bash
# ❌ Bad
git commit -m "fix stuff"

# ✅ Good
git commit -m "fix: prevent duplicate user creation

- Add unique constraint on email
- Add validation in controller
- Add test for duplicate email"
```

### Use Conventional Commits
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance

### Keep Commits Small
```bash
# ❌ Bad - One huge commit
git commit -m "feat: add entire user management system"

# ✅ Good - Small, focused commits
git commit -m "feat: add user validation schema"
git commit -m "feat: add user controller"
git commit -m "feat: add user routes"
git commit -m "test: add user tests"
```

---

## 🎨 Code Organization

### One Responsibility Per File
```
// ✅ Good structure
/validators/user.validators.ts    // User validation schemas
/controllers/user.controller.ts   // User business logic
/routes/user.routes.ts            // User routes
/__tests__/user.test.ts           // User tests
```

### Keep Files Under 300 Lines
```typescript
// If file is too long, split it:
user.controller.ts (500 lines)
  ↓
user.controller.ts (200 lines)
user.service.ts (200 lines)
user.helpers.ts (100 lines)
```

### Group Related Code
```typescript
// ✅ Good - Grouped by feature
/features/
  /users/
    user.routes.ts
    user.controller.ts
    user.validators.ts
    user.test.ts
```

---

## ⚡ Performance

### Use Pagination
```typescript
// ❌ Bad - Returns all records
const users = await prisma.user.findMany();

// ✅ Good - Paginated
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit
});
```

### Select Only Needed Fields
```typescript
// ❌ Bad - Returns everything
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Good - Select specific fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true }
});
```

### Use Indexes for Queries
```prisma
// If you query by tenantId + createdAt often:
model User {
  @@index([tenantId, createdAt])
}
```

---

## 🔍 Code Review Checklist

Before submitting a PR:

- [ ] Tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm run build`)
- [ ] Input validation added
- [ ] Authentication/authorization checked
- [ ] Error handling implemented
- [ ] No console.log in production code
- [ ] No sensitive data in logs
- [ ] Database migrations safe (IF NOT EXISTS)
- [ ] Commit messages clear
- [ ] Code follows existing patterns

---

## 🚫 Common Mistakes to Avoid

### Don't Use `any` Type
```typescript
// ❌ Bad
const data: any = req.body;

// ✅ Good
const data: CreateUserData = req.body; // Validated by middleware
```

### Don't Ignore Errors
```typescript
// ❌ Bad
try {
  await riskyOperation();
} catch (error) {
  // Silent failure
}

// ✅ Good
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  next(error);
}
```

### Don't Hardcode Values
```typescript
// ❌ Bad
const apiUrl = 'https://api.example.com';

// ✅ Good
const apiUrl = process.env.API_URL;
```

### Don't Use `prisma db push` in Production
```bash
# ❌ Bad - Can cause data loss
pnpm exec prisma db push

# ✅ Good - Safe migrations
pnpm exec prisma migrate deploy
```

---

## 📚 More Information

- **Security Details:** [SECURITY.md](./SECURITY.md)
- **Common Tasks:** [COMMON-TASKS.md](./COMMON-TASKS.md)
- **Full Guidelines:** [/docs/DEVELOPMENT-BEST-PRACTICES.md](../DEVELOPMENT-BEST-PRACTICES.md)
- **AI Context:** [/docs/ai-context/](../ai-context/)

---

**Remember:** When in doubt, look at existing code for patterns! 🎯
