# Security Features Implementation Plan

**Date:** November 7, 2025  
**Status:** Test-Driven Security Implementation Guide  
**Priority:** Based on test failures and security criticality

---

## 🎯 Overview

The comprehensive security test suite (380+ tests) has been created and is running successfully. The tests are identifying which security features need to be implemented or configured. This document provides a prioritized implementation plan.

---

## 📊 Test Results Summary

### Current Status
- **Tests Created:** 380+ across 10 test suites ✅
- **Tests Running:** Yes, hitting application endpoints ✅
- **Tests Passing:** ~40-50% (expected for new implementation)
- **Tests Failing:** ~50-60% (identifying missing features)

### What's Working ✅
- Basic authentication (login endpoint)
- Password hashing (bcrypt)
- JWT token generation
- Basic authorization checks
- SQL injection protection (Prisma ORM)
- Error handling (no stack traces)
- Some input validation

### What Needs Implementation 🔧
Based on test failures, here are the security features that need to be added or configured:

---

## 🚨 CRITICAL PRIORITY (Implement First)

### 1. Rate Limiting Middleware ⭐⭐⭐
**Status:** ❌ Not Implemented  
**Impact:** HIGH - Prevents brute force attacks and DDoS

**Issue:**
- Tests expecting rate limiting are getting 429 errors inconsistently
- No rate limiting middleware configured

**Implementation:**
```bash
pnpm add express-rate-limit
```

```typescript
// apps/customer-service/src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

// Strict rate limit for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limit
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts',
});
```

**Apply to routes:**
```typescript
// src/routes/auth.routes.ts
import { authLimiter, passwordResetLimiter } from '../middleware/rate-limit.middleware';

router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
```

**Tests Affected:** 25+ tests in `rate-limiting.test.ts`

---

### 2. Account Lockout Mechanism ⭐⭐⭐
**Status:** ❌ Not Implemented  
**Impact:** HIGH - Prevents brute force password attacks

**Issue:**
- Tests expect account lockout after 5 failed attempts
- Currently no tracking of failed login attempts

**Implementation:**
```typescript
// Add to Staff model (Prisma schema)
model Staff {
  // ... existing fields
  failedLoginAttempts Int @default(0)
  lockedUntil         DateTime?
  lastFailedLogin     DateTime?
}
```

```typescript
// src/controllers/auth.controller.ts
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const staff = await prisma.staff.findUnique({ where: { email } });
  
  if (!staff) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // Check if account is locked
  if (staff.lockedUntil && staff.lockedUntil > new Date()) {
    return res.status(423).json({ 
      message: 'Account is locked due to too many failed attempts',
      lockedUntil: staff.lockedUntil
    });
  }
  
  const isValidPassword = await bcrypt.compare(password, staff.password);
  
  if (!isValidPassword) {
    // Increment failed attempts
    const failedAttempts = staff.failedLoginAttempts + 1;
    const updates: any = {
      failedLoginAttempts: failedAttempts,
      lastFailedLogin: new Date()
    };
    
    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    
    await prisma.staff.update({
      where: { id: staff.id },
      data: updates
    });
    
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // Reset failed attempts on successful login
  if (staff.failedLoginAttempts > 0) {
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null
      }
    });
  }
  
  // Generate token and proceed...
};
```

**Tests Affected:** 3 tests in `authentication-security.test.ts`

---

### 3. Refresh Token Implementation ⭐⭐⭐
**Status:** ❌ Not Implemented  
**Impact:** HIGH - Improves security and user experience

**Issue:**
- Tests expect refresh tokens on login
- No refresh token rotation mechanism

**Implementation:**
```typescript
// Add to Prisma schema
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  staffId   String
  staff     Staff    @relation(fields: [staffId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
  isRevoked Boolean  @default(false)
}
```

```typescript
// src/utils/jwt.ts
export const generateRefreshToken = (payload: any): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d'
  });
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
};
```

```typescript
// src/controllers/auth.controller.ts
export const login = async (req: Request, res: Response) => {
  // ... authentication logic
  
  const accessToken = generateToken({ userId: staff.id, email, role, tenantId });
  const refreshToken = generateRefreshToken({ userId: staff.id });
  
  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      staffId: staff.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });
  
  res.json({ token: accessToken, refreshToken });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if token exists and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { staff: true }
    });
    
    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true }
    });
    
    // Generate new tokens
    const newAccessToken = generateToken({
      userId: storedToken.staff.id,
      email: storedToken.staff.email,
      role: storedToken.staff.role,
      tenantId: storedToken.staff.tenantId
    });
    
    const newRefreshToken = generateRefreshToken({ userId: storedToken.staff.id });
    
    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        staffId: storedToken.staff.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};
```

**Tests Affected:** 4 tests in `authentication-security.test.ts`

---

## 🔶 HIGH PRIORITY (Implement Soon)

### 4. Request Size Limits ⭐⭐
**Status:** ⚠️ Partially Implemented  
**Impact:** MEDIUM - Prevents DoS attacks

**Implementation:**
```typescript
// src/index.ts
import express from 'express';

const app = express();

// Set request size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// URL length limit (handled by server config)
app.use((req, res, next) => {
  if (req.url.length > 2048) {
    return res.status(414).json({ message: 'URL too long' });
  }
  next();
});
```

**Tests Affected:** 4 tests in `api-security.test.ts`

---

### 5. Content-Type Validation ⭐⭐
**Status:** ⚠️ Partially Implemented  
**Impact:** MEDIUM - Prevents content-type attacks

**Implementation:**
```typescript
// src/middleware/content-type.middleware.ts
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return res.status(400).json({ 
        message: 'Content-Type header is required',
        status: 400
      });
    }
    
    if (!contentType.includes('application/json')) {
      return res.status(415).json({ 
        message: 'Unsupported Media Type. Only application/json is accepted',
        status: 415
      });
    }
  }
  
  next();
};

// Apply globally
app.use(validateContentType);
```

**Tests Affected:** 4 tests in `api-security.test.ts`

---

### 6. Security Headers (Helmet) ⭐⭐
**Status:** ❌ Not Implemented  
**Impact:** MEDIUM - Prevents various web vulnerabilities

**Implementation:**
```bash
pnpm add helmet
```

```typescript
// src/index.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Hide server information
app.disable('x-powered-by');
```

**Tests Affected:** 5 tests in `api-security.test.ts`

---

### 7. CORS Configuration ⭐⭐
**Status:** ⚠️ Needs Refinement  
**Impact:** MEDIUM - Prevents unauthorized cross-origin requests

**Implementation:**
```bash
pnpm add cors
```

```typescript
// src/middleware/cors.middleware.ts
import cors from 'cors';

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://tailtown.com',
  'https://www.tailtown.com'
];

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

**Tests Affected:** 3 tests in `api-security.test.ts`

---

## 🔷 MEDIUM PRIORITY (Implement When Ready)

### 8. File Upload Security ⭐
**Status:** ❌ Not Implemented  
**Impact:** MEDIUM - If file uploads are needed

**Implementation:**
```bash
pnpm add multer
pnpm add file-type
```

```typescript
// src/middleware/file-upload.middleware.ts
import multer from 'multer';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as any).tenantId;
    const uploadPath = path.join(__dirname, '../../uploads', tenantId);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const fileFilter = async (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  }
});
```

**Tests Affected:** 40+ tests in `file-upload-security.test.ts`

---

### 9. API Versioning ⭐
**Status:** ❌ Not Implemented  
**Impact:** LOW - Good practice for API evolution

**Implementation:**
```typescript
// src/routes/index.ts
import { Router } from 'express';
import v1Routes from './v1';

const router = Router();

// Add version header middleware
router.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0.0');
  next();
});

// Version 1 routes
router.use('/v1', v1Routes);

// Default to v1
router.use('/', v1Routes);

export default router;
```

**Tests Affected:** 4 tests in `api-security.test.ts`

---

### 10. Enhanced Input Validation ⭐
**Status:** ⚠️ Partially Implemented  
**Impact:** MEDIUM - Prevents invalid data

**Implementation:**
```bash
pnpm add joi
# or
pnpm add zod
```

```typescript
// src/middleware/validation.middleware.ts
import Joi from 'joi';

export const validateCustomer = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9+\-() ]{10,20}$/).required(),
    address: Joi.string().max(200).optional(),
    notes: Joi.string().max(1000).optional()
  });
  
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.details.map(d => d.message),
      status: 400
    });
  }
  
  next();
};
```

**Tests Affected:** 60+ tests in `input-validation.test.ts`

---

## 📋 Implementation Checklist

### Phase 1: Critical Security (Week 1)
- [ ] Implement rate limiting middleware
- [ ] Add account lockout mechanism
- [ ] Implement refresh token system
- [ ] Add Prisma migrations for new fields
- [ ] Test authentication flow end-to-end

### Phase 2: API Security (Week 2)
- [ ] Configure request size limits
- [ ] Add content-type validation
- [ ] Install and configure Helmet
- [ ] Refine CORS configuration
- [ ] Add API versioning

### Phase 3: Data Protection (Week 3)
- [ ] Implement file upload security (if needed)
- [ ] Add comprehensive input validation
- [ ] Implement data masking for PII
- [ ] Add audit logging
- [ ] Configure secure session storage

### Phase 4: Testing & Validation (Week 4)
- [ ] Run all security tests
- [ ] Fix any remaining failures
- [ ] Perform manual security testing
- [ ] Security code review
- [ ] Update documentation

---

## 🚀 Quick Start Commands

### 1. Install Required Packages
```bash
cd apps/customer-service
pnpm add express-rate-limit helmet cors multer joi
pnpm add -D @types/multer @types/cors
```

### 2. Run Migrations
```bash
pnpm exec prisma migrate dev --name add-security-fields
```

### 3. Update Environment Variables
```env
# .env
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
FRONTEND_URL=http://localhost:3000
MAX_CONCURRENT_SESSIONS=5
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Run Security Tests
```bash
pnpm test -- --testPathPattern=security --forceExit
```

---

## 📊 Expected Outcomes

After implementing these features:
- ✅ **95%+ test pass rate** on security tests
- ✅ **Protection against OWASP Top 10** vulnerabilities
- ✅ **Production-ready security posture**
- ✅ **Compliance with industry standards**

---

## 📞 Next Steps

1. **Review this plan** with the team
2. **Prioritize features** based on your timeline
3. **Implement incrementally** - test after each feature
4. **Run security tests** to validate implementation
5. **Update documentation** as you go

---

**Created:** November 7, 2025  
**Status:** Ready for Implementation  
**Estimated Effort:** 3-4 weeks for complete implementation
