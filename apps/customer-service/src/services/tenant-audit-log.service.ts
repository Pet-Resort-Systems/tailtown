import { env } from '../env.js';
/**
 * Tenant Audit Log Service
 *
 * Comprehensive audit logging for all tenant operations.
 * Tracks who did what, when, and from where for compliance and security.
 *
 * Features:
 * - Logs all CRUD operations on sensitive data
 * - Tracks authentication events
 * - Records permission changes
 * - Captures before/after state for changes
 * - Supports 7-year retention for compliance
 */

import { type Request } from 'express';
import { prisma } from '../config/prisma.js';

// ============================================
// TYPES AND INTERFACES
// ============================================

export enum AuditAction {
  // CRUD Operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',

  // Status Changes
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  CANCEL = 'CANCEL',
  CONFIRM = 'CONFIRM',

  // Financial
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  REFUND_ISSUED = 'REFUND_ISSUED',
  INVOICE_CREATED = 'INVOICE_CREATED',

  // Settings
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',

  // Data Operations
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
}

export enum AuditCategory {
  CUSTOMER = 'CUSTOMER',
  PET = 'PET',
  RESERVATION = 'RESERVATION',
  PAYMENT = 'PAYMENT',
  INVOICE = 'INVOICE',
  STAFF = 'STAFF',
  SERVICE = 'SERVICE',
  RESOURCE = 'RESOURCE',
  AUTH = 'AUTH',
  SETTINGS = 'SETTINGS',
  SYSTEM = 'SYSTEM',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogData {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: AuditAction;
  category: AuditCategory;
  entityType: string;
  entityId?: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  changedFields?: string[];
  metadata?: any;
  severity?: AuditSeverity;
}

export interface AuditQueryFilters {
  tenantId: string;
  userId?: string;
  action?: AuditAction;
  category?: AuditCategory;
  entityType?: string;
  entityId?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Extract user info from request
 */
function getUserFromRequest(req: Request): {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
} {
  const user = (req as any).user;
  if (!user) return {};

  return {
    userId: user.id,
    userEmail: user.email,
    userName:
      user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    userRole: user.role,
  };
}

/**
 * Calculate changed fields between two objects
 */
function getChangedFields(previous: any, current: any): string[] {
  if (!previous || !current) return [];

  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const key of allKeys) {
    // Skip internal fields
    if (['updatedAt', 'createdAt', 'id'].includes(key)) continue;

    const prevValue = JSON.stringify(previous[key]);
    const currValue = JSON.stringify(current[key]);

    if (prevValue !== currValue) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Sanitize sensitive data from audit logs
 * Removes passwords, tokens, etc.
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'refreshToken',
    'accessToken',
    'apiKey',
    'secret',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// ============================================
// MAIN AUDIT LOG SERVICE
// ============================================

class TenantAuditLogService {
  /**
   * Create an audit log entry
   */
  async log(data: AuditLogData, req?: Request): Promise<void> {
    try {
      const ipAddress = req ? getClientIp(req) : null;
      const userAgent = req?.get('user-agent') || null;
      const requestMethod = req?.method || null;
      const requestPath = req?.path || null;

      // Get user info from request if not provided
      const userInfo = req ? getUserFromRequest(req) : {};

      await prisma.tenantAuditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId || userInfo.userId,
          userEmail: data.userEmail || userInfo.userEmail,
          userName: data.userName || userInfo.userName,
          userRole: data.userRole || userInfo.userRole,
          action: data.action,
          category: data.category,
          entityType: data.entityType,
          entityId: data.entityId || null,
          entityName: data.entityName || null,
          previousValue: data.previousValue
            ? sanitizeData(data.previousValue)
            : null,
          newValue: data.newValue ? sanitizeData(data.newValue) : null,
          changedFields: data.changedFields || [],
          ipAddress,
          userAgent,
          requestMethod,
          requestPath,
          metadata: data.metadata || null,
          severity: data.severity || AuditSeverity.INFO,
        },
      });

      // Also log to console for debugging (can be disabled in production)
      if (env.NODE_ENV !== 'production') {
        console.log(
          `[TenantAudit] ${data.action} ${data.entityType} by ${
            data.userEmail || 'system'
          }`,
          {
            tenantId: data.tenantId,
            entityId: data.entityId,
            severity: data.severity || 'INFO',
          }
        );
      }
    } catch (error) {
      // Never let audit logging break the application
      console.error('[TenantAudit] Failed to create audit log:', error);
    }
  }

  /**
   * Log from Express request with automatic user extraction
   */
  async logFromRequest(
    req: Request,
    action: AuditAction,
    category: AuditCategory,
    entityType: string,
    entityId?: string,
    entityName?: string,
    options?: {
      previousValue?: any;
      newValue?: any;
      metadata?: any;
      severity?: AuditSeverity;
    }
  ): Promise<void> {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      console.warn(
        '[TenantAudit] No tenantId found in request, skipping audit log'
      );
      return;
    }

    const changedFields =
      options?.previousValue && options?.newValue
        ? getChangedFields(options.previousValue, options.newValue)
        : [];

    await this.log(
      {
        tenantId,
        action,
        category,
        entityType,
        entityId,
        entityName,
        previousValue: options?.previousValue,
        newValue: options?.newValue,
        changedFields,
        metadata: options?.metadata,
        severity: options?.severity,
      },
      req
    );
  }

  // ============================================
  // CONVENIENCE METHODS FOR COMMON OPERATIONS
  // ============================================

  /**
   * Log customer operation
   */
  async logCustomer(
    req: Request,
    action: AuditAction,
    customerId: string,
    customerName?: string,
    options?: { previousValue?: any; newValue?: any; metadata?: any }
  ): Promise<void> {
    await this.logFromRequest(
      req,
      action,
      AuditCategory.CUSTOMER,
      'customer',
      customerId,
      customerName,
      options
    );
  }

  /**
   * Log pet operation
   */
  async logPet(
    req: Request,
    action: AuditAction,
    petId: string,
    petName?: string,
    options?: { previousValue?: any; newValue?: any; metadata?: any }
  ): Promise<void> {
    await this.logFromRequest(
      req,
      action,
      AuditCategory.PET,
      'pet',
      petId,
      petName,
      options
    );
  }

  /**
   * Log reservation operation
   */
  async logReservation(
    req: Request,
    action: AuditAction,
    reservationId: string,
    reservationName?: string,
    options?: {
      previousValue?: any;
      newValue?: any;
      metadata?: any;
      severity?: AuditSeverity;
    }
  ): Promise<void> {
    await this.logFromRequest(
      req,
      action,
      AuditCategory.RESERVATION,
      'reservation',
      reservationId,
      reservationName,
      options
    );
  }

  /**
   * Log payment operation
   */
  async logPayment(
    req: Request,
    action: AuditAction,
    paymentId: string,
    options?: { previousValue?: any; newValue?: any; metadata?: any }
  ): Promise<void> {
    // Payments are always CRITICAL severity
    await this.logFromRequest(
      req,
      action,
      AuditCategory.PAYMENT,
      'payment',
      paymentId,
      undefined,
      {
        ...options,
        severity: AuditSeverity.CRITICAL,
      }
    );
  }

  /**
   * Log staff operation
   */
  async logStaff(
    req: Request,
    action: AuditAction,
    staffId: string,
    staffName?: string,
    options?: { previousValue?: any; newValue?: any; metadata?: any }
  ): Promise<void> {
    await this.logFromRequest(
      req,
      action,
      AuditCategory.STAFF,
      'staff',
      staffId,
      staffName,
      {
        ...options,
        severity: AuditSeverity.WARNING, // Staff changes are sensitive
      }
    );
  }

  /**
   * Log authentication event
   */
  async logAuth(
    req: Request,
    action: AuditAction,
    userId?: string,
    userEmail?: string,
    options?: { metadata?: any; success?: boolean }
  ): Promise<void> {
    const severity =
      action === AuditAction.LOGIN_FAILED
        ? AuditSeverity.WARNING
        : AuditSeverity.INFO;

    await this.logFromRequest(
      req,
      action,
      AuditCategory.AUTH,
      'auth',
      userId,
      userEmail,
      {
        metadata: { ...options?.metadata, success: options?.success },
        severity,
      }
    );
  }

  /**
   * Log settings change
   */
  async logSettings(
    req: Request,
    settingType: string,
    options?: { previousValue?: any; newValue?: any; metadata?: any }
  ): Promise<void> {
    await this.logFromRequest(
      req,
      AuditAction.SETTINGS_CHANGED,
      AuditCategory.SETTINGS,
      settingType,
      undefined,
      undefined,
      {
        ...options,
        severity: AuditSeverity.WARNING,
      }
    );
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Query audit logs with filters
   */
  async query(
    filters: AuditQueryFilters
  ): Promise<{ logs: any[]; total: number }> {
    const where: any = {
      tenantId: filters.tenantId,
    };

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.category) where.category = filters.category;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.severity) where.severity = filters.severity;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters.searchTerm) {
      where.OR = [
        { entityName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { userEmail: { contains: filters.searchTerm, mode: 'insensitive' } },
        { userName: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.tenantAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.tenantAuditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<any[]> {
    return prisma.tenantAuditLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
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
  ): Promise<any[]> {
    const where: any = {
      tenantId,
      userId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return prisma.tenantAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Get activity summary for a tenant
   */
  async getActivitySummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ action: string; category: string; count: number }[]> {
    const result = await prisma.tenantAuditLog.groupBy({
      by: ['action', 'category'],
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    return result.map((r) => ({
      action: r.action,
      category: r.category,
      count: r._count,
    }));
  }

  /**
   * Get critical events (for security monitoring)
   */
  async getCriticalEvents(
    tenantId: string,
    limit: number = 50
  ): Promise<any[]> {
    return prisma.tenantAuditLog.findMany({
      where: {
        tenantId,
        severity: AuditSeverity.CRITICAL,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed login attempts (for security monitoring)
   */
  async getFailedLogins(tenantId: string, since: Date): Promise<any[]> {
    return prisma.tenantAuditLog.findMany({
      where: {
        tenantId,
        action: AuditAction.LOGIN_FAILED,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Export singleton instance
export const tenantAuditLog = new TenantAuditLogService();
