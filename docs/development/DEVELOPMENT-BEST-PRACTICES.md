# Development Best Practices

Concise reference for building Tailtown safely and consistently. Prefer the existing patterns in the codebase over inventing new ones.

## Core Rules

- Security first: validate input, authenticate protected routes, and never trust request data.
- Keep tenant boundaries explicit: every tenant-scoped query must include `tenantId`.
- Prefer simple, testable code over clever abstractions.
- Reuse existing services, validators, and route patterns before adding new ones.
- Run the relevant tests before pushing.

## Tailtown-Critical Patterns

### 1. Do not apply auth to an entire router if it has public endpoints

```typescript
// Wrong: blocks login and password reset
app.use('/api/staff', requireTenant, authenticate, requireTenantAdmin, staffRoutes);

// Correct
app.use('/api/staff', requireTenant, staffRoutes);

router.post('/login', loginStaff);
router.get('/profile', authenticate, getProfile);
```

Use route-level auth for mixed public and protected routers.

### 2. Always preserve tenant isolation

```typescript
const customers = await prisma.customer.findMany({
  where: { tenantId: req.tenantId },
});
```

Rules:

- Include `tenantId` on all tenant-scoped reads, writes, counts, and updates.
- Treat missing tenant filters as a security bug.
- Test that tenant A cannot access tenant B data.

### 3. Use the tenant UUID in the database, not the subdomain

```typescript
await prisma.customer.create({
  data: {
    tenantId: tenant.id,
    name: 'John Doe',
  },
});
```

- The frontend may send a subdomain or stored tenant identifier.
- Middleware resolves that to the canonical tenant UUID.
- Persist only the UUID in database relations.

### 4. Never hardcode the frontend tenant

```typescript
const tenantId =
  localStorage.getItem('tailtown_tenant_id') ||
  localStorage.getItem('tenantId') ||
  'dev';
```

Hardcoded values like `'dev'` break impersonation, testing, and production behavior.

### 5. Trust the proxy in deployed environments

```typescript
const app = express();
app.set('trust proxy', 1);
```

Required behind nginx or any reverse proxy so rate limiting, logging, and IP detection work correctly.

### 6. Build the frontend with the correct environment

```bash
NODE_ENV=production pnpm run build
pnpm run test:localhost
```

`NODE_ENV` must be set at build time, not only at runtime.

## API and Backend Standards

### Validate all external input

```typescript
router.post('/users', validateBody(createUserSchema), createUser);
```

- Validate params, body, and query input.
- Return clear client errors for validation failures.
- Do not interpolate raw input into SQL or shell commands.

### Use the right auth mode

```typescript
router.get('/announcements', optionalAuth, getAnnouncements);
router.get('/profile', authenticate, getProfile);
```

- `optionalAuth` for public endpoints enhanced by user context.
- `authenticate` for protected data.

### Use transactions for multi-step writes

```typescript
await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({ data: invoiceData });
  const payment = await tx.payment.create({ data: paymentData });
  return { invoice, payment };
});
```

If one step failing would leave bad data behind, use a transaction.

### Keep responses and status codes consistent

- `200` success
- `201` created
- `400` validation or malformed request
- `401` unauthenticated
- `403` unauthorized
- `404` not found
- `429` rate limited
- `500` unexpected server error

Let shared error middleware format server failures. Do not leak stack traces or secrets in responses.

## Code Quality

- Prefer TypeScript types over `any`.
- Use `async/await` rather than callbacks.
- Keep files focused; split large files by responsibility.
- Select only the database fields you need.
- Paginate list endpoints by default.
- Add indexes for frequently filtered fields.

## Testing Expectations

Run the smallest relevant test scope while developing, then the broader suite before pushing:

```bash
pnpm test
pnpm run build
```

For new endpoints or data flows, cover:

- Happy path
- Validation failures
- Authentication and authorization
- Tenant isolation
- Edge cases for empty, invalid, and unexpected input

## Pre-PR Checklist

- Validation added for user input
- Authentication and authorization are correct
- Tenant isolation is enforced in queries and tests
- No sensitive data is logged
- Multi-step writes use transactions where needed
- Tests pass
- Build succeeds
- New code follows existing project patterns

## Related Docs

- `docs/development/TESTING-GUIDE.md`
- `docs/development/error-handling.md`
- `docs/deployment/DEPLOYMENT-GUIDE.md`
- `docs/development/timezone-handling.md`
