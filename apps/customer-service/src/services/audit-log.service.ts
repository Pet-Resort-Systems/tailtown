/**
 * Audit Log Service
 * 
 * Handles logging of all super admin actions for security and compliance.
 * Automatically captures IP address, user agent, and action details.
 */

import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditLogData {
  superAdminId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  tenantId?: string;
  details?: any;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  data: AuditLogData,
  req?: Request
): Promise<void> {
  try {
    const ipAddress = req ? getClientIp(req) : null;
    const userAgent = req?.get('user-agent') || null;

    await prisma.auditLog.create({
      data: {
        superAdminId: data.superAdminId,
        action: data.action,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        tenantId: data.tenantId || null,
        details: data.details || null,
        ipAddress,
        userAgent
      }
    });

    console.log(`[Audit] ${data.action} by ${data.superAdminId}`, {
      entityType: data.entityType,
      entityId: data.entityId,
      tenantId: data.tenantId
    });
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    console.error('[Audit] Failed to create audit log:', error);
  }
}

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
  
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Audit action types
 */
export const AuditAction = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  
  // Tenant Management
  CREATE_TENANT: 'CREATE_TENANT',
  UPDATE_TENANT: 'UPDATE_TENANT',
  DELETE_TENANT: 'DELETE_TENANT',
  SUSPEND_TENANT: 'SUSPEND_TENANT',
  ACTIVATE_TENANT: 'ACTIVATE_TENANT',
  CLONE_TENANT: 'CLONE_TENANT',
  
  // Impersonation
  START_IMPERSONATION: 'START_IMPERSONATION',
  END_IMPERSONATION: 'END_IMPERSONATION',
  
  // Super Admin Management
  CREATE_SUPER_ADMIN: 'CREATE_SUPER_ADMIN',
  UPDATE_SUPER_ADMIN: 'UPDATE_SUPER_ADMIN',
  DELETE_SUPER_ADMIN: 'DELETE_SUPER_ADMIN',
  
  // Data Operations
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA',
  
  // System
  CHANGE_SETTINGS: 'CHANGE_SETTINGS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS'
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];
