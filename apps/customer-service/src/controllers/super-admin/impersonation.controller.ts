/**
 * Tenant Impersonation Controller
 * 
 * Allows super admins to "login as" a tenant for support and debugging.
 * All impersonation sessions are tracked and audited.
 * Sessions expire after 30 minutes by default.
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, AuditAction } from '../../services/audit-log.service';
import { SuperAdminRequest } from '../../middleware/require-super-admin.middleware';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const IMPERSONATION_TIMEOUT_MINUTES = 30;

/**
 * POST /api/super-admin/impersonate/:tenantId
 * Start impersonating a tenant
 */
export const startImpersonation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reason for impersonation is required'
      });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check if tenant is active
    if (!tenant.isActive || tenant.status === 'DELETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot impersonate inactive or deleted tenant'
      });
    }

    // Calculate expiration time (30 minutes from now)
    const expiresAt = new Date(Date.now() + IMPERSONATION_TIMEOUT_MINUTES * 60 * 1000);

    // Create impersonation session
    const session = await prisma.impersonationSession.create({
      data: {
        superAdminId,
        tenantId,
        reason: reason.trim(),
        expiresAt,
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent') || null,
        isActive: true
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId,
      action: AuditAction.START_IMPERSONATION,
      entityType: 'TENANT',
      entityId: tenantId,
      tenantId: tenant.subdomain,
      details: {
        reason: reason.trim(),
        sessionId: session.id,
        expiresAt,
        businessName: tenant.businessName
      }
    }, req);

    // Generate impersonation token
    const impersonationToken = jwt.sign(
      {
        sessionId: session.id,
        superAdminId,
        tenantId,
        subdomain: tenant.subdomain,
        type: 'impersonation'
      },
      JWT_SECRET,
      { expiresIn: `${IMPERSONATION_TIMEOUT_MINUTES}m` }
    );

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          tenantId,
          subdomain: tenant.subdomain,
          businessName: tenant.businessName,
          expiresAt,
          reason: session.reason
        },
        impersonationToken
      }
    });
  } catch (error) {
    console.error('[SuperAdmin] Start impersonation error:', error);
    next(error);
  }
};

/**
 * POST /api/super-admin/impersonate/end/:sessionId
 * End an active impersonation session
 */
export const endImpersonation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Find session
    const session = await prisma.impersonationSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify session belongs to this super admin
    if (session.superAdminId !== superAdminId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to end this session'
      });
    }

    // End session
    const updatedSession = await prisma.impersonationSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        isActive: false
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId,
      action: AuditAction.END_IMPERSONATION,
      entityType: 'TENANT',
      entityId: session.tenantId,
      tenantId: session.tenantId,
      details: {
        sessionId,
        duration: Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000 / 60), // minutes
        reason: session.reason
      }
    }, req);

    res.status(200).json({
      success: true,
      message: 'Impersonation session ended',
      data: updatedSession
    });
  } catch (error) {
    console.error('[SuperAdmin] End impersonation error:', error);
    next(error);
  }
};

/**
 * GET /api/super-admin/impersonate/active
 * Get all active impersonation sessions for current super admin
 */
export const getActiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const sessions = await prisma.impersonationSession.findMany({
      where: {
        superAdminId,
        isActive: true,
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('[SuperAdmin] Get active sessions error:', error);
    next(error);
  }
};

/**
 * GET /api/super-admin/impersonate/history
 * Get impersonation history for current super admin
 */
export const getImpersonationHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const sessions = await prisma.impersonationSession.findMany({
      where: {
        superAdminId
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.impersonationSession.count({
      where: { superAdminId }
    });

    res.status(200).json({
      success: true,
      data: {
        sessions,
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error('[SuperAdmin] Get impersonation history error:', error);
    next(error);
  }
};

/**
 * Helper to get client IP
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
