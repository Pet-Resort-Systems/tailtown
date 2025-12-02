# Audit Logging Guide

## Overview

Comprehensive audit logging system for tracking all tenant actions, ensuring compliance, and enabling debugging.

## Features

### 📝 What Gets Logged

1. **Customer Actions**
   - Create, update, delete, view

2. **Pet Actions**
   - Create, update, delete

3. **Reservation Actions**
   - Create, update, cancel

4. **Authentication Events**
   - Login success/failure
   - Logout
   - Password reset

5. **Admin Actions**
   - Settings changes
   - Role modifications

6. **System Events**
   - Rate limit hits
   - Errors

### 🔍 Audit Log Entry Structure

```typescript
{
  tenantId: "tenant-123",
  userId: "user-456",
  action: "customer.created",
  resourceType: "customer",
  resourceId: "cust-789",
  changes: {
    before: { name: "Old Name" },
    after: { name: "New Name" }
  },
  metadata: {
    method: "POST",
    path: "/api/customers",
    query: {}
  },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: "2025-11-08T19:00:00.000Z"
}
```

## Usage

### 1. Basic Logging

```typescript
import { auditLogger, AuditAction } from './utils/auditLog';

// Log a customer creation
await auditLogger.logCustomerAction(
  'tenant-123',
  AuditAction.CUSTOMER_CREATED,
  'customer-id',
  { email: 'new@example.com' },
  'user-id'
);
```

### 2. Log from Request

```typescript
// In your route handler
await auditLogger.logFromRequest(
  req,
  AuditAction.CUSTOMER_UPDATED,
  'customer',
  customerId,
  { before: oldData, after: newData }
);
```

### 3. Log Authentication

```typescript
await auditLogger.logAuth(
  AuditAction.LOGIN_SUCCESS,
  userId,
  tenantId,
  true,
  { method: 'email' }
);
```

### 4. Log Rate Limit Hit

```typescript
await auditLogger.logRateLimitHit(
  tenantId,
  '/api/customers',
  req.ip
);
```

### 5. Log Errors

```typescript
try {
  // Your code
} catch (error) {
  await auditLogger.logError(
    tenantId,
    error,
    { context: 'customer-creation' }
  );
  throw error;
}
```

## Automatic Logging

### Middleware

Add audit middleware to automatically log all requests:

```typescript
import { auditMiddleware } from './utils/auditLog';

app.use(auditMiddleware());
```

This will automatically log:
- All successful POST/PUT/PATCH/DELETE requests
- Request metadata (method, path, query)
- User and tenant information

## Querying Audit Logs

### Get Resource Audit Trail

```typescript
const trail = await auditLogger.getResourceAuditTrail(
  'tenant-123',
  'customer',
  'customer-id'
);

// Returns all actions performed on this customer
```

### Get User Activity

```typescript
const activity = await auditLogger.getUserActivity(
  'tenant-123',
  'user-id',
  new Date('2025-11-01'),
  new Date('2025-11-30')
);

// Returns all actions by this user in November
```

### Get Tenant Summary

```typescript
const summary = await auditLogger.getTenantActivitySummary(
  'tenant-123',
  new Date('2025-11-01'),
  new Date('2025-11-30')
);

// Returns: { "customer.created": 50, "customer.updated": 100, ... }
```

## Database Schema

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  changes JSONB,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at)
);
```

### Prisma Schema

```prisma
model AuditLog {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  userId       String?  @map("user_id")
  action       String
  resourceType String?  @map("resource_type")
  resourceId   String?  @map("resource_id")
  changes      Json?
  metadata     Json?
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([tenantId])
  @@index([userId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

## Compliance

### GDPR Compliance

Audit logs help with GDPR compliance by:
- Tracking data access (Article 30)
- Recording data modifications
- Providing audit trails for data subject requests

### SOC 2 Compliance

Audit logs support SOC 2 by:
- Tracking security events
- Recording access control changes
- Monitoring system activity

### HIPAA Compliance

For healthcare data:
- Log all PHI access
- Track data modifications
- Record authentication events

## Retention Policy

### Recommended Retention

| Log Type | Retention Period |
|----------|------------------|
| Authentication | 1 year |
| Data Access | 90 days |
| Data Modification | 7 years |
| System Events | 30 days |
| Errors | 90 days |

### Implementation

```typescript
// Archive old logs
await prisma.auditLog.deleteMany({
  where: {
    createdAt: {
      lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
    },
    action: {
      notIn: [
        AuditAction.CUSTOMER_CREATED,
        AuditAction.CUSTOMER_UPDATED,
        AuditAction.CUSTOMER_DELETED,
      ]
    }
  }
});
```

## Security

### Access Control

Only admins should access audit logs:

```typescript
router.get('/audit-logs', requireAdmin, async (req, res) => {
  const logs = await auditLogger.query({
    tenantId: req.tenantId,
    limit: 100,
  });
  res.json(logs);
});
```

### Immutability

Audit logs should never be modified or deleted (except for retention):

```typescript
// No update or delete endpoints for audit logs
// Only create and read
```

### Encryption

Sensitive data in audit logs should be encrypted:

```typescript
const encryptedChanges = encrypt(JSON.stringify(changes));
await auditLogger.log({
  ...entry,
  changes: encryptedChanges,
});
```

## Monitoring

### Alert on Suspicious Activity

```typescript
// Alert on multiple failed logins
const failedLogins = await auditLogger.query({
  action: AuditAction.LOGIN_FAILED,
  userId: userId,
  startDate: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
});

if (failedLogins.length > 5) {
  await sendSecurityAlert('Multiple failed login attempts', userId);
}
```

### Track Data Access Patterns

```typescript
// Monitor who's accessing sensitive data
const sensitiveAccess = await auditLogger.query({
  resourceType: 'customer',
  action: AuditAction.CUSTOMER_VIEWED,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
});
```

## Reporting

### Generate Compliance Report

```typescript
async function generateComplianceReport(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  const summary = await auditLogger.getTenantActivitySummary(
    tenantId,
    startDate,
    endDate
  );

  return {
    period: { start: startDate, end: endDate },
    totalActions: Object.values(summary).reduce((a, b) => a + b, 0),
    actionBreakdown: summary,
    complianceStatus: 'compliant',
  };
}
```

### Export Audit Logs

```typescript
router.get('/audit-logs/export', requireAdmin, async (req, res) => {
  const logs = await auditLogger.query({
    tenantId: req.tenantId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
  
  const csv = convertToCSV(logs);
  res.send(csv);
});
```

## Best Practices

### 1. Log Everything Important
- All data modifications
- Authentication events
- Admin actions
- Security events

### 2. Include Context
- Who (userId)
- What (action)
- When (timestamp)
- Where (ipAddress)
- Why (metadata)

### 3. Never Block on Logging
```typescript
// Log asynchronously, don't await
auditLogger.log(entry).catch(console.error);
```

### 4. Sanitize Sensitive Data
```typescript
// Don't log passwords, tokens, etc.
const sanitized = { ...data };
delete sanitized.password;
await auditLogger.log({ changes: sanitized });
```

### 5. Regular Review
- Review logs weekly
- Look for anomalies
- Update retention policies
- Archive old logs

## Troubleshooting

### Logs Not Appearing
1. Check database connection
2. Verify table exists
3. Check for errors in console
4. Ensure middleware is added

### Performance Issues
1. Add database indexes
2. Implement log batching
3. Use async logging
4. Archive old logs

### Storage Growing Too Fast
1. Implement retention policy
2. Compress old logs
3. Move to cold storage
4. Sample non-critical logs

## Next Steps

1. ✅ Audit logging system implemented
2. ⏭️ Create database table
3. ⏭️ Add Prisma model
4. ⏭️ Implement database storage
5. ⏭️ Create audit log viewer UI
6. ⏭️ Set up automated reports
7. ⏭️ Configure retention policy

## Resources

- [GDPR Audit Requirements](https://gdpr.eu/article-30-record-of-processing-activities/)
- [SOC 2 Logging](https://www.vanta.com/resources/soc-2-logging-requirements)
- [Audit Log Best Practices](https://www.loggly.com/ultimate-guide/audit-logging-best-practices/)
