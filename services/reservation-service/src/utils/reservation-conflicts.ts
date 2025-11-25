import {
  ExtendedReservationWhereInput,
  ExtendedReservationStatus,
} from "../types/prisma-extensions";
import { prisma } from "../config/prisma";
import { logger } from "./logger";

/**
 * Interface for conflict detection parameters
 */
export interface ConflictDetectionParams {
  startDate: Date;
  endDate: Date;
  resourceId?: string;
  reservationId?: string; // For updates - exclude current reservation
  tenantId: string;
  petId?: string; // For pet-specific conflict detection
  suiteType?: string; // For suite type specific conflicts
}

/**
 * Interface for conflict detection results
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflictingReservations: any[];
  warnings: string[];
}

/**
 * Check for reservation date conflicts
 * This function detects conflicts for a given date range and resource
 *
 * @param params Parameters for conflict detection
 * @returns Object containing conflict status, conflicting reservations, and warnings
 */
export async function detectReservationConflicts(
  params: ConflictDetectionParams
): Promise<ConflictDetectionResult> {
  const {
    startDate,
    endDate,
    resourceId,
    reservationId,
    tenantId,
    petId,
    suiteType,
  } = params;
  const warnings: string[] = [];
  const result: ConflictDetectionResult = {
    hasConflicts: false,
    conflictingReservations: [],
    warnings: [],
  };

  // Generate a unique request ID for logging
  const requestId = `conflict-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;

  // Validate date logic
  if (startDate >= endDate) {
    result.warnings.push("Start date must be before end date");
    result.hasConflicts = true;
    return result;
  }

  // Check if start date is in the past
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Reset time to start of day

  if (startDate < currentDate) {
    result.warnings.push(
      "Start date is in the past. This is allowed but may indicate an error."
    );
  }

  // Build the base query conditions
  const baseConditions: any = {
    tenantId: tenantId,
    AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
    status: {
      in: [
        ExtendedReservationStatus.CONFIRMED,
        ExtendedReservationStatus.CHECKED_IN,
        ExtendedReservationStatus.PENDING_PAYMENT,
        ExtendedReservationStatus.PARTIALLY_PAID,
      ] as any,
    },
  };

  // Exclude current reservation if updating
  if (reservationId) {
    baseConditions.id = { not: reservationId };
  }

  // Resource-specific conflict detection
  if (resourceId) {
    baseConditions.resourceId = resourceId;

    try {
      const conflictingReservations = await prisma.reservation.findMany({
        where: baseConditions as ExtendedReservationWhereInput,
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          customerId: true, // Use customerServiceClient to fetch customer details if needed
          petId: true, // Use customerServiceClient to fetch pet details if needed
        },
      });

      if (conflictingReservations.length > 0) {
        logger.warn(
          `[${requestId}] Found ${conflictingReservations.length} conflicting reservations for resource ${resourceId}`
        );
        result.hasConflicts = true;
        result.conflictingReservations = conflictingReservations;
        result.warnings.push(
          `Resource is not available for the requested dates. There are ${conflictingReservations.length} overlapping reservations.`
        );
      }
    } catch (error) {
      logger.error(`[${requestId}] Error checking resource conflicts:`, {
        error,
      });
      result.warnings.push(
        "Error checking resource availability. Please try again."
      );
    }
  }

  // Pet-specific conflict detection (pet can't be in two places at once)
  if (petId) {
    const petConflictConditions = {
      ...baseConditions,
      petId,
      // Remove resourceId from conditions for pet conflict check
      resourceId: undefined,
    };

    if (resourceId) {
      // If we're checking a specific resource, exclude it from pet conflict check
      petConflictConditions.resourceId = { not: resourceId };
    }

    try {
      const petConflicts = await prisma.reservation.findMany({
        where: petConflictConditions as ExtendedReservationWhereInput,
        include: {
          resource: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      });

      if (petConflicts.length > 0) {
        logger.warn(
          `[${requestId}] Found ${petConflicts.length} conflicting reservations for pet ${petId}`
        );
        result.hasConflicts = true;
        result.conflictingReservations = [
          ...result.conflictingReservations,
          ...petConflicts.filter(
            (pc) =>
              !result.conflictingReservations.some((cr) => cr.id === pc.id)
          ),
        ];
        result.warnings.push(
          `Pet already has ${petConflicts.length} overlapping reservation(s) during the requested dates.`
        );
      }
    } catch (error) {
      logger.error(`[${requestId}] Error checking pet conflicts:`, { error });
      result.warnings.push(
        "Error checking pet availability. Please try again."
      );
    }
  }

  // Suite type availability check (if no specific resource requested)
  if (!resourceId && suiteType) {
    try {
      // Find all resources of the requested suite type
      const resources = await prisma.resource.findMany({
        where: {
          tenantId: tenantId,
          type: suiteType,
        } as any,
      });

      if (resources.length === 0) {
        result.warnings.push(`No resources found for suite type: ${suiteType}`);
        return result;
      }

      // Check availability for each resource
      let allResourcesBooked = true;

      for (const resource of resources) {
        const resourceConflicts = await prisma.reservation.findMany({
          where: {
            ...baseConditions,
            resourceId: resource.id,
          } as ExtendedReservationWhereInput,
        });

        if (resourceConflicts.length === 0) {
          // Found at least one available resource
          allResourcesBooked = false;
          break;
        }
      }

      if (allResourcesBooked) {
        logger.warn(
          `[${requestId}] All resources of type ${suiteType} are booked for the requested dates`
        );
        result.hasConflicts = true;
        result.warnings.push(
          `All ${suiteType} suites are booked for the requested dates.`
        );
      }
    } catch (error) {
      logger.error(`[${requestId}] Error checking suite type availability:`, {
        error,
      });
      result.warnings.push(
        `Error checking ${suiteType} suite availability. Please try again.`
      );
    }
  }

  return result;
}
