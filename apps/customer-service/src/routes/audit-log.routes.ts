/**
 * Audit Log Routes
 *
 * API endpoints for viewing and querying audit logs.
 * Restricted to admin users only.
 */

import { Router } from 'express';
import {
  getAuditLogs,
  getEntityAuditTrail,
  getUserActivity,
  getActivitySummary,
  getCriticalEvents,
  getFailedLogins,
} from '../controllers/audit-log.controller';
import {
  authenticate,
  requireTenantAdmin,
} from '../middleware/auth.middleware';

const router = Router();

// All audit log routes require authentication and admin privileges
router.use(authenticate);
router.use(requireTenantAdmin);

/**
 * GET /api/audit-logs
 * Query audit logs with filters
 * Query params: action, category, entityType, entityId, userId, severity, startDate, endDate, search, limit, offset
 */
router.get('/', getAuditLogs);

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit trail for a specific entity
 */
router.get('/entity/:entityType/:entityId', getEntityAuditTrail);

/**
 * GET /api/audit-logs/user/:userId
 * Get activity for a specific user
 * Query params: startDate, endDate
 */
router.get('/user/:userId', getUserActivity);

/**
 * GET /api/audit-logs/summary
 * Get activity summary for the tenant
 * Query params: startDate, endDate (required)
 */
router.get('/summary', getActivitySummary);

/**
 * GET /api/audit-logs/critical
 * Get critical events for security monitoring
 * Query params: limit
 */
router.get('/critical', getCriticalEvents);

/**
 * GET /api/audit-logs/failed-logins
 * Get failed login attempts
 * Query params: since (ISO date string)
 */
router.get('/failed-logins', getFailedLogins);

export default router;
