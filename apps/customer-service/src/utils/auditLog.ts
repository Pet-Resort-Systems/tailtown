/**
 * Audit Logging Utility
 * 
 * Tracks all tenant actions for compliance and debugging
 */

import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export enum AuditAction {
  // Customer actions
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  CUSTOMER_VIEWED = 'customer.viewed',
  
  // Pet actions
  PET_CREATED = 'pet.created',
  PET_UPDATED = 'pet.updated',
  PET_DELETED = 'pet.deleted',
  
  // Reservation actions
  RESERVATION_CREATED = 'reservation.created',
  RESERVATION_UPDATED = 'reservation.updated',
  RESERVATION_CANCELLED = 'reservation.cancelled',
  
  // Authentication actions
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILED = 'auth.login.failed',
  LOGOUT = 'auth.logout',
  PASSWORD_RESET = 'auth.password_reset',
  
  // Admin actions
  SETTINGS_UPDATED = 'admin.settings.updated',
  USER_ROLE_CHANGED = 'admin.user.role_changed',
  
  // System actions
  RATE_LIMIT_HIT = 'system.rate_limit.hit',
  ERROR_OCCURRED = 'system.error.occurred',
}

export interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

class AuditLogger {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // In production, this would write to a dedicated audit_logs table
      // For now, we'll log to console and could extend to database
      
      const logEntry = {
        ...entry,
        timestamp: entry.timestamp || new Date(),
      };

      // Log to console (structured logging)
      console.log('[AUDIT]', JSON.stringify(logEntry));

      // TODO: Write to database
      // await prisma.auditLog.create({ data: logEntry });

      // TODO: Send to external audit service (e.g., AWS CloudTrail, Datadog)
      // await sendToAuditService(logEntry);
    } catch (error) {
      // Never let audit logging break the application
      console.error('[AUDIT ERROR]', error);
    }
  }

  /**
   * Log from Express request
   */
  async logFromRequest(
    req: Request,
    action: AuditAction,
    resourceType?: string,
    resourceId?: string,
    changes?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      tenantId: (req as any).tenantId || 'unknown',
      userId: (req as any).user?.id,
      action,
      resourceType,
      resourceId,
      changes,
      metadata: {
        method: req.method,
        path: req.path,
        query: req.query,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    };

    await this.log(entry);
  }

  /**
   * Log customer action
   */
  async logCustomerAction(
    tenantId: string,
    action: AuditAction,
    customerId: string,
    changes?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      resourceType: 'customer',
      resourceId: customerId,
      changes,
      timestamp: new Date(),
    });
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: AuditAction,
    userId: string,
    tenantId: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      metadata: {
        ...metadata,
        success,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log rate limit hit
   */
  async logRateLimitHit(
    tenantId: string,
    endpoint: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      action: AuditAction.RATE_LIMIT_HIT,
      metadata: {
        endpoint,
      },
      ipAddress,
      timestamp: new Date(),
    });
  }

  /**
   * Log error
   */
  async logError(
    tenantId: string,
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId,
      action: AuditAction.ERROR_OCCURRED,
      metadata: {
        error: error.message,
        stack: error.stack,
        ...context,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    tenantId?: string;
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    // TODO: Implement database query
    // For now, return empty array
    console.log('[AUDIT QUERY]', filters);
    return [];
  }

  /**
   * Get audit trail for a resource
   */
  async getResourceAuditTrail(
    tenantId: string,
    resourceType: string,
    resourceId: string
  ): Promise<AuditLogEntry[]> {
    return this.query({
      tenantId,
      resourceType,
      resourceId,
    });
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    tenantId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLogEntry[]> {
    return this.query({
      tenantId,
      userId,
      startDate,
      endDate,
    });
  }

  /**
   * Get tenant activity summary
   */
  async getTenantActivitySummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>> {
    // TODO: Implement aggregation
    console.log('[AUDIT SUMMARY]', { tenantId, startDate, endDate });
    return {};
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

/**
 * Express middleware for automatic audit logging
 */
export function auditMiddleware() {
  return async (req: Request, res: any, next: any) => {
    // Skip health checks and monitoring endpoints
    if (req.path.includes('/health') || req.path.includes('/monitoring')) {
      return next();
    }

    // Capture original send function
    const originalSend = res.send;

    // Override send to log after response
    res.send = function (data: any) {
      // Determine action based on method and status
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let action: AuditAction | undefined;

        if (req.method === 'POST') {
          action = AuditAction.CUSTOMER_CREATED; // Generic, should be more specific
        } else if (req.method === 'PUT' || req.method === 'PATCH') {
          action = AuditAction.CUSTOMER_UPDATED; // Generic
        } else if (req.method === 'DELETE') {
          action = AuditAction.CUSTOMER_DELETED; // Generic
        }

        if (action) {
          auditLogger.logFromRequest(req, action).catch(console.error);
        }
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
}
