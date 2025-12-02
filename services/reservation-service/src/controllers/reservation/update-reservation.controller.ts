/**
 * Update Reservation Controller
 *
 * This file contains the controller method for updating existing reservations.
 * It implements schema alignment strategy with defensive programming.
 */

import { Request, Response } from "express";
import { AppError } from "../../utils/service";
import { catchAsync } from "../../middleware/catchAsync";
import { logger } from "../../utils/logger";
import { detectReservationConflicts } from "../../utils/reservation-conflicts";
import {
  ExtendedReservationWhereInput,
  ExtendedResourceWhereInput,
  ExtendedReservationInclude,
  ExtendedServiceWhereInput,
} from "../../types/prisma-extensions";
import { safeExecutePrismaQuery, prisma } from "./utils/prisma-helpers";
import { customerServiceClient } from "../../clients/customer-service.client";
import { notificationClient } from "../../clients/notification.client";

/**
 * Helper function to determine suite type based on service type
 */
function determineSuiteType(serviceType: string): string | null {
  const serviceToSuiteMap: Record<string, string> = {
    BOARDING: "KENNEL",
    DAYCARE: "PLAY_AREA",
    GROOMING: "GROOMING_STATION",
    TRAINING: "TRAINING_AREA",
    VET: "EXAM_ROOM",
  };

  return serviceToSuiteMap[serviceType.toUpperCase()] || null;
}

/**
 * Update a reservation
 * Implements schema alignment strategy with defensive programming
 * Uses standardized error handling pattern
 *
 * @route PATCH /api/v1/reservations/:id
 * @param {string} req.params.id - Reservation ID
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 */
export const updateReservation = catchAsync(
  async (req: Request, res: Response) => {
    // Generate a unique request ID for logging
    const requestId = `update-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;
    logger.info(
      `Processing update reservation request for ID: ${req.params.id}`,
      { requestId }
    );

    // Get tenant ID from request - added by tenant middleware
    // In development mode, use a default tenant ID if not provided
    const isDev = process.env.NODE_ENV === "development";
    const tenantId = req.tenantId || (isDev ? "dev-tenant-001" : undefined);
    if (!tenantId) {
      logger.warn(`Missing tenant ID in request`, { requestId });
      throw AppError.authorizationError("Tenant ID is required");
    }

    const { id } = req.params;
    if (!id) {
      logger.warn(`Missing reservation ID in request`, { requestId });
      throw AppError.validationError("Reservation ID is required");
    }

    // First, check if the reservation exists and belongs to this tenant
    const existingReservation = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.findFirst({
          where: {
            id,
            tenantId: tenantId,
          } as ExtendedReservationWhereInput,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            pet: {
              select: {
                id: true,
                name: true,
              },
            },
            resource: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          } as unknown as ExtendedReservationInclude,
        });
      },
      null,
      `Error finding reservation with ID ${id}`,
      true // Enable throwError flag
    );

    if (!existingReservation) {
      logger.warn(
        `Reservation not found or does not belong to tenant: ${tenantId}`,
        { requestId }
      );
      throw AppError.notFoundError("Reservation not found");
    }

    logger.info(`Found existing reservation: ${id}`, { requestId });

    // Extract fields to update
    const {
      customerId,
      petId,
      serviceId,
      resourceId,
      startDate,
      endDate,
      suiteType,
      serviceType,
      status,
      price,
      deposit,
      notes,
      staffNotes,
      staffAssignedId,
      addOnServices,
    } = req.body;

    // Prepare update data
    const updateData: any = {};
    const warnings: string[] = [];

    // Validate customerId if provided
    if (customerId !== undefined) {
      if (!customerId) {
        logger.warn(`Invalid customer ID provided`, { requestId });
        throw AppError.validationError("Valid customer ID is required");
      }

      // Verify customer exists and belongs to tenant via Customer Service API
      try {
        await customerServiceClient.verifyCustomer(customerId, tenantId);
        logger.info(`Verified customer exists via API: ${customerId}`, {
          requestId,
        });
        updateData.customerId = customerId;
      } catch (error) {
        logger.error(`Customer verification failed: ${customerId}`, {
          error,
          requestId,
        });
        throw error;
      }
    }

    // Validate petId if provided
    if (petId !== undefined) {
      if (!petId) {
        logger.warn(`Invalid pet ID provided`, { requestId });
        throw AppError.validationError("Valid pet ID is required");
      }

      // Verify pet exists and belongs to tenant via Customer Service API
      try {
        await customerServiceClient.verifyPet(petId, tenantId);
        logger.info(`Verified pet exists via API: ${petId}`, { requestId });
        updateData.petId = petId;
      } catch (error) {
        logger.error(`Pet verification failed: ${petId}`, { error, requestId });
        throw error;
      }
    }

    // Validate serviceId if provided
    if (serviceId !== undefined) {
      if (!serviceId) {
        logger.warn(`Invalid service ID provided`, { requestId });
        throw AppError.validationError("Valid service ID is required");
      }

      // Verify service exists
      await safeExecutePrismaQuery(
        async () => {
          return await prisma.service.findFirst({
            where: {
              id: serviceId,
              tenantId: tenantId,
            },
          });
        },
        null,
        `Error verifying service with ID ${serviceId}`,
        true // Enable throwError flag
      );

      updateData.serviceId = serviceId;
    }

    // Process dates if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      try {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          logger.warn(`Invalid start date format: ${startDate}`, { requestId });
          throw AppError.validationError(
            "Invalid start date format. Use YYYY-MM-DD"
          );
        }
        updateData.startDate = parsedStartDate;
      } catch (error) {
        logger.warn(`Error parsing start date: ${startDate}`, {
          requestId,
          error,
        });
        throw AppError.validationError(
          "Invalid start date format. Use YYYY-MM-DD"
        );
      }
    } else if (existingReservation.startDate) {
      parsedStartDate = new Date(existingReservation.startDate);
    }

    if (endDate) {
      try {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          logger.warn(`Invalid end date format: ${endDate}`, { requestId });
          throw AppError.validationError(
            "Invalid end date format. Use YYYY-MM-DD"
          );
        }
        updateData.endDate = parsedEndDate;
      } catch (error) {
        logger.warn(`Error parsing end date: ${endDate}`, { requestId, error });
        throw AppError.validationError(
          "Invalid end date format. Use YYYY-MM-DD"
        );
      }
    } else if (existingReservation.endDate) {
      parsedEndDate = new Date(existingReservation.endDate);
    }

    // Validate date logic if both dates are provided
    if (parsedStartDate && parsedEndDate) {
      // Check if start date is before end date
      if (parsedStartDate >= parsedEndDate) {
        logger.warn(
          `Start date must be before end date: ${startDate} - ${endDate}`,
          { requestId }
        );
        throw AppError.validationError("Start date must be before end date");
      }

      // Check if start date is in the past
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset time to start of day

      if (parsedStartDate < currentDate) {
        logger.warn(`Start date is in the past: ${startDate}`, { requestId });
        warnings.push(
          "Start date is in the past. This is allowed but may indicate an error."
        );
      }
    }

    // Determine suite type based on service type if provided
    let determinedSuiteType = suiteType;

    if (!determinedSuiteType && serviceType) {
      // Set suite type based on service type
      const suiteTypeFromService = determineSuiteType(serviceType);
      if (suiteTypeFromService) {
        determinedSuiteType = suiteTypeFromService;
        logger.info(
          `Set suite type to ${determinedSuiteType} based on service type ${serviceType}`,
          { requestId }
        );
      } else {
        logger.warn(
          `Could not determine suite type from service type ${serviceType}`,
          { requestId }
        );
        warnings.push(
          `Could not determine suite type from service type ${serviceType}`
        );
      }
    }

    if (determinedSuiteType) {
      // Note: suiteType is not a field in the Reservation model
      // The suite type is determined by the resource assigned to the reservation
      logger.info(
        `Suite type ${determinedSuiteType} determined but not stored directly on reservation`,
        { requestId }
      );
    }

    // MANDATORY KENNEL ASSIGNMENT VALIDATION FOR UPDATES
    // Get the service category to check if kennel is required
    let serviceCategory: string | undefined;

    if (serviceId) {
      // New service being assigned
      const serviceDetails = await prisma.service.findFirst({
        where: {
          id: serviceId,
          tenantId: tenantId,
        } as ExtendedServiceWhereInput,
      });
      serviceCategory = serviceDetails?.serviceCategory;
    } else if (existingReservation.serviceId) {
      // Use existing service
      const serviceDetails = await prisma.service.findFirst({
        where: {
          id: existingReservation.serviceId,
          tenantId: tenantId,
        } as ExtendedServiceWhereInput,
      });
      serviceCategory = serviceDetails?.serviceCategory;
    }

    const requiresKennel =
      serviceCategory === "BOARDING" || serviceCategory === "DAYCARE";

    // Check if trying to remove resourceId from a boarding/daycare reservation
    if (
      requiresKennel &&
      resourceId === null &&
      existingReservation.resourceId
    ) {
      logger.warn(
        `Cannot remove kennel assignment from ${serviceCategory} reservation`,
        { requestId }
      );
      throw AppError.validationError(
        `Cannot remove kennel assignment from ${serviceCategory} reservations. ` +
          `Kennel assignment is mandatory for this service type.`
      );
    }

    // Handle resource assignment
    let assignedResourceId = resourceId;

    if (assignedResourceId) {
      // Check if resource exists and belongs to tenant
      await safeExecutePrismaQuery(
        async () => {
          return await prisma.resource.findFirst({
            where: {
              id: assignedResourceId,
              tenantId: tenantId,
            } as ExtendedResourceWhereInput,
          });
        },
        null,
        `Error verifying resource with ID ${assignedResourceId}`,
        true // Enable throwError flag
      );

      // Check if resource is available for the requested dates using the conflict detection utility
      if (parsedStartDate && parsedEndDate) {
        const conflictResult = await detectReservationConflicts({
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          resourceId: assignedResourceId,
          reservationId: id, // Exclude current reservation
          tenantId,
          petId,
        });

        if (conflictResult.hasConflicts) {
          logger.warn(
            `Resource ${assignedResourceId} has conflicts for the requested dates`,
            {
              requestId,
              conflicts: conflictResult.warnings,
            }
          );
          // Add all warnings to our warnings array
          warnings.push(...conflictResult.warnings);
        }
      }

      updateData.resourceId = assignedResourceId;
    } else if (
      determinedSuiteType &&
      !assignedResourceId &&
      !existingReservation.resourceId &&
      parsedStartDate &&
      parsedEndDate
    ) {
      // Try to auto-assign a resource if none was specified but we have a suite type
      logger.info(
        `Attempting to auto-assign a resource for suite type: ${determinedSuiteType}`,
        { requestId }
      );

      try {
        // First get all resources matching the suite type
        const resources = await prisma.resource.findMany({
          where: {
            type: determinedSuiteType,
            tenantId: tenantId,
          } as ExtendedResourceWhereInput,
        });

        // Then filter out resources with overlapping reservations using the conflict detection utility
        const availableResources = [];

        for (const resource of resources) {
          try {
            const conflictResult = await detectReservationConflicts({
              startDate: parsedStartDate,
              endDate: parsedEndDate,
              resourceId: resource.id,
              reservationId: id, // Exclude current reservation
              tenantId,
              petId,
            });

            if (!conflictResult.hasConflicts) {
              availableResources.push(resource.id);
            }
          } catch (error) {
            logger.error(
              `Error checking availability for resource ${resource.id}:`,
              {
                requestId,
                error,
                resourceId: resource.id,
              }
            );
          }
        }

        if (availableResources.length > 0) {
          // Assign the first available resource
          updateData.resourceId = availableResources[0];
          logger.info(`Auto-assigned resource: ${availableResources[0]}`, {
            requestId,
          });
        } else {
          // Check if the pet already has a reservation during this time (excluding this reservation)
          const petConflictResult = await detectReservationConflicts({
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            tenantId,
            petId,
            reservationId: id,
            suiteType: determinedSuiteType,
          });

          if (
            petConflictResult.hasConflicts &&
            petConflictResult.warnings.some((w) =>
              w.includes("Pet already has")
            )
          ) {
            logger.warn(
              `Pet already has another reservation during this time`,
              { requestId }
            );
            warnings.push(
              petConflictResult.warnings.find((w) =>
                w.includes("Pet already has")
              ) || "Pet already has another reservation during this time"
            );
          }

          logger.warn(
            `No available resources found for suite type: ${determinedSuiteType}`,
            { requestId }
          );
          warnings.push(
            `No available resources found for suite type: ${determinedSuiteType}. The reservation will be updated without a resource assignment.`
          );
        }
      } catch (error) {
        logger.warn(`Error auto-assigning resource:`, { requestId, error });
        warnings.push(
          "Failed to auto-assign a resource. The reservation will be updated without a resource assignment."
        );
      }
    }

    // Handle other fields
    if (status) updateData.status = status;
    if (price !== undefined) updateData.price = parseFloat(String(price));
    if (deposit !== undefined) updateData.deposit = parseFloat(String(deposit));
    if (notes !== undefined) updateData.notes = notes;
    if (staffNotes !== undefined) updateData.staffNotes = staffNotes;
    if (staffAssignedId !== undefined) {
      if (staffAssignedId) {
        updateData.staffAssignedId = staffAssignedId;
      } else {
        // Allow unsetting the staff assignment
        updateData.staffAssignedId = null;
      }
    }

    logger.info(`Updating reservation with data:`, { requestId, updateData });

    // Update reservation with safe execution
    const updatedReservation = await safeExecutePrismaQuery(
      async () => {
        // For update operations, we need to handle the extended where input differently
        // First verify the reservation exists and belongs to this tenant
        const reservationToUpdate = await prisma.reservation.findFirst({
          where: {
            id,
            tenantId: tenantId,
          } as ExtendedReservationWhereInput,
          select: { id: true },
        });

        if (!reservationToUpdate) {
          throw AppError.notFoundError(
            `Reservation ${id} not found or does not belong to organization ${tenantId}`
          );
        }

        // Then use only the ID for the update operation which accepts a WhereUniqueInput
        return await prisma.reservation.update({
          where: { id },
          data: updateData,
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            pet: {
              select: {
                name: true,
                breed: true,
                birthdate: true, // Changed from age to birthdate as age doesn't exist in schema
              },
            },
            resource: {
              select: {
                name: true,
                type: true,
                location: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
              },
            },
          } as unknown as ExtendedReservationInclude,
        });
      },
      null, // Null fallback if there's an error
      `Error updating reservation with ID ${id}`,
      true // Enable throwError flag
    );

    // Process add-on services if provided
    if (addOnServices && Array.isArray(addOnServices)) {
      try {
        logger.info(`Processing ${addOnServices.length} add-on services`, {
          requestId,
        });

        // First remove existing add-on services
        await safeExecutePrismaQuery(
          async () => {
            return await prisma.reservationAddOn.deleteMany({
              where: {
                reservationId: id,
                // organizationId removed as it's not in the schema
              } as any,
            });
          },
          null,
          `Error removing existing add-on services for reservation ${id}`
        );

        // Then add new ones
        for (const addOn of addOnServices) {
          if (addOn.serviceId) {
            await safeExecutePrismaQuery(
              async () => {
                return await prisma.reservationAddOn.create({
                  data: {
                    reservationId: id,
                    serviceId: addOn.serviceId,
                    quantity: addOn.quantity || 1,
                    notes: addOn.notes || "",
                    // organizationId removed as it's not in the schema
                  } as any,
                });
              },
              null,
              `Error adding add-on service ${addOn.serviceId} to reservation ${id}`
            );
          }
        }
      } catch (error) {
        logger.warn(`Error processing add-on services:`, { requestId, error });
        warnings.push(
          "There was an issue processing add-on services, but the reservation was updated successfully."
        );
      }
    }

    logger.success(`Successfully updated reservation: ${id}`, { requestId });

    // Send notifications for status changes (async, don't block response)
    if (status && existingReservation.status !== status && tenantId) {
      const oldStatus = existingReservation.status || "PENDING";

      if (status === "CHECKED_IN") {
        notificationClient
          .sendCheckInNotification({
            reservationId: id,
            tenantId: tenantId as string,
          })
          .catch((err) => {
            logger.warn(
              `Failed to send check-in notifications: ${err.message}`,
              { requestId }
            );
          });
      } else if (status === "CHECKED_OUT") {
        notificationClient
          .sendCheckOutNotification({
            reservationId: id,
            tenantId: tenantId as string,
          })
          .catch((err) => {
            logger.warn(
              `Failed to send check-out notifications: ${err.message}`,
              { requestId }
            );
          });
      } else if (status === "CONFIRMED") {
        notificationClient
          .sendReservationConfirmation({
            reservationId: id,
            tenantId: tenantId as string,
          })
          .catch((err) => {
            logger.warn(
              `Failed to send confirmation notifications: ${err.message}`,
              { requestId }
            );
          });
      } else {
        notificationClient
          .sendStatusChangeNotification({
            reservationId: id,
            tenantId: tenantId as string,
            oldStatus,
            newStatus: status,
          })
          .catch((err) => {
            logger.warn(
              `Failed to send status change notifications: ${err.message}`,
              { requestId }
            );
          });
      }
    }

    // Prepare response message
    let message = "Reservation updated successfully";
    if (warnings.length > 0) {
      message += ` with warnings: ${warnings.join(" ")}`;
    }

    res.status(200).json({
      status: "success",
      message,
      data: {
        reservation: updatedReservation,
      },
    });
  }
);
