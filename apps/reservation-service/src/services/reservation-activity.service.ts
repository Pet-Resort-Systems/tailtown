/**
 * Reservation Activity Log Service
 *
 * Handles logging of all reservation activities including:
 * - Who created/modified the reservation (customer, employee, or system)
 * - What changes were made
 * - When the changes occurred
 */

import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

export type ReservationActivityType =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'NOTE_ADDED'
  | 'RESOURCE_ASSIGNED'
  | 'STAFF_ASSIGNED'
  | 'ADDON_ADDED'
  | 'ADDON_REMOVED';

export type ActivityActorType = 'CUSTOMER' | 'EMPLOYEE' | 'SYSTEM';

export interface ActivityLogInput {
  tenantId: string;
  reservationId: string;
  activityType: ReservationActivityType;
  actorType: ActivityActorType;
  actorId?: string;
  actorName?: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a reservation activity
 */
export async function logReservationActivity(
  input: ActivityLogInput
): Promise<void> {
  try {
    await prisma.reservationActivityLog.create({
      data: {
        tenantId: input.tenantId,
        reservationId: input.reservationId,
        activityType: input.activityType as any,
        actorType: input.actorType as any,
        actorId: input.actorId,
        actorName: input.actorName || getDefaultActorName(input.actorType),
        description: input.description,
        previousValue: input.previousValue
          ? JSON.stringify(input.previousValue)
          : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    logger.debug(
      `Activity logged for reservation ${input.reservationId}: ${input.activityType}`
    );
  } catch (error) {
    // Don't fail the main operation if logging fails
    logger.error('Failed to log reservation activity:', error);
  }
}

/**
 * Get activity logs for a reservation
 */
export async function getReservationActivityLogs(
  tenantId: string,
  reservationId: string,
  limit: number = 50
) {
  return prisma.reservationActivityLog.findMany({
    where: {
      tenantId,
      reservationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Get recent activity logs for a tenant
 */
export async function getTenantActivityLogs(
  tenantId: string,
  limit: number = 100,
  actorType?: ActivityActorType
) {
  return prisma.reservationActivityLog.findMany({
    where: {
      tenantId,
      ...(actorType && { actorType: actorType as any }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Get default actor name based on type
 */
function getDefaultActorName(actorType: ActivityActorType): string {
  switch (actorType) {
    case 'CUSTOMER':
      return 'Customer (Online)';
    case 'EMPLOYEE':
      return 'Staff Member';
    case 'SYSTEM':
      return 'System';
    default:
      return 'Unknown';
  }
}

/**
 * Helper to create a status change log
 */
export async function logStatusChange(
  tenantId: string,
  reservationId: string,
  previousStatus: string,
  newStatus: string,
  actorType: ActivityActorType,
  actorId?: string,
  actorName?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const activityType = getActivityTypeForStatus(newStatus);

  await logReservationActivity({
    tenantId,
    reservationId,
    activityType,
    actorType,
    actorId,
    actorName,
    description: `Status changed from ${previousStatus} to ${newStatus}`,
    previousValue: { status: previousStatus },
    newValue: { status: newStatus },
    ipAddress,
    userAgent,
  });
}

/**
 * Map status to activity type
 */
function getActivityTypeForStatus(status: string): ReservationActivityType {
  switch (status.toUpperCase()) {
    case 'CHECKED_IN':
      return 'CHECKED_IN';
    case 'CHECKED_OUT':
    case 'COMPLETED':
      return 'CHECKED_OUT';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'CANCELLED';
    case 'CONFIRMED':
      return 'CONFIRMED';
    default:
      return 'STATUS_CHANGED';
  }
}

/**
 * Helper to create a reservation creation log
 */
export async function logReservationCreated(
  tenantId: string,
  reservationId: string,
  actorType: ActivityActorType,
  actorId?: string,
  actorName?: string,
  reservationDetails?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logReservationActivity({
    tenantId,
    reservationId,
    activityType: 'CREATED',
    actorType,
    actorId,
    actorName,
    description: `Reservation created`,
    newValue: reservationDetails,
    ipAddress,
    userAgent,
  });
}

/**
 * Helper to create a reservation update log
 */
export async function logReservationUpdated(
  tenantId: string,
  reservationId: string,
  changes: { field: string; from: any; to: any }[],
  actorType: ActivityActorType,
  actorId?: string,
  actorName?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const changedFields = changes.map((c) => c.field).join(', ');

  await logReservationActivity({
    tenantId,
    reservationId,
    activityType: 'UPDATED',
    actorType,
    actorId,
    actorName,
    description: `Reservation updated: ${changedFields}`,
    previousValue: Object.fromEntries(changes.map((c) => [c.field, c.from])),
    newValue: Object.fromEntries(changes.map((c) => [c.field, c.to])),
    ipAddress,
    userAgent,
  });
}

export default {
  logReservationActivity,
  getReservationActivityLogs,
  getTenantActivityLogs,
  logStatusChange,
  logReservationCreated,
  logReservationUpdated,
};
