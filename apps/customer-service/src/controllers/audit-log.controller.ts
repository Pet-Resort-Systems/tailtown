/**
 * Audit Log Controller
 *
 * Handles API requests for viewing and querying audit logs.
 * All endpoints require admin authentication.
 */

import { type Request, type Response, type NextFunction } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';
import {
  tenantAuditLog,
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from '../services/tenant-audit-log.service.js';
import { AppError } from '../middleware/error.middleware.js';

/**
 * GET /api/audit-logs
 * Query audit logs with filters
 */
export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const {
      action,
      category,
      entityType,
      entityId,
      userId,
      severity,
      startDate,
      endDate,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const filters = {
      tenantId,
      action: action as AuditAction | undefined,
      category: category as AuditCategory | undefined,
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
      userId: userId as string | undefined,
      severity: severity as AuditSeverity | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      searchTerm: search as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const result = await tenantAuditLog.query(filters);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + result.logs.length < result.total,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Error querying audit logs:', error);
    next(error);
  }
};

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit trail for a specific entity
 */
export const getEntityAuditTrail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const entityType = assertStringRouteParam(
      req.params.entityType,
      req.originalUrl,
      AppError.validationError,
      'Entity type is required'
    );
    const entityId = assertStringRouteParam(
      req.params.entityId,
      req.originalUrl,
      AppError.validationError,
      'Entity ID is required'
    );

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const logs = await tenantAuditLog.getEntityAuditTrail(
      tenantId,
      entityType,
      entityId
    );

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[AuditLog] Error getting entity audit trail:', error);
    next(error);
  }
};

/**
 * GET /api/audit-logs/user/:userId
 * Get activity for a specific user
 */
export const getUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = assertStringRouteParam(
      req.params.userId,
      req.originalUrl,
      AppError.validationError,
      'User ID is required'
    );
    const { startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const logs = await tenantAuditLog.getUserActivity(
      tenantId,
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[AuditLog] Error getting user activity:', error);
    next(error);
  }
};

/**
 * GET /api/audit-logs/summary
 * Get activity summary for the tenant
 */
export const getActivitySummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const summary = await tenantAuditLog.getActivitySummary(
      tenantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[AuditLog] Error getting activity summary:', error);
    next(error);
  }
};

/**
 * GET /api/audit-logs/critical
 * Get critical events for security monitoring
 */
export const getCriticalEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { limit = '50' } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const logs = await tenantAuditLog.getCriticalEvents(
      tenantId,
      parseInt(limit as string, 10)
    );

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[AuditLog] Error getting critical events:', error);
    next(error);
  }
};

/**
 * GET /api/audit-logs/failed-logins
 * Get failed login attempts
 */
export const getFailedLogins = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { since } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    // Default to last 24 hours if no date provided
    const sinceDate = since
      ? new Date(since as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const logs = await tenantAuditLog.getFailedLogins(tenantId, sinceDate);

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[AuditLog] Error getting failed logins:', error);
    next(error);
  }
};
