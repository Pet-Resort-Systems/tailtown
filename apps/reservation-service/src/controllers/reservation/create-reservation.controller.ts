/**
 * Create Reservation Controller
 *
 * This file contains the controller method for creating new reservations.
 * It implements schema alignment strategy with defensive programming.
 */

import { type RequestHandler, type Response } from 'express';
import { type TenantRequest } from '../../types/request.js';
import { AppError } from '../../utils/service.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { logger } from '../../utils/logger.js';
import { detectReservationConflicts } from '../../utils/reservation-conflicts.js';
import {
  type ExtendedResourceWhereInput,
  type ExtendedReservationInclude,
  type ExtendedServiceWhereInput,
} from '../../types/prisma-extensions.js';
import { safeExecutePrismaQuery, prisma } from './utils/prisma-helpers.js';
import { customerServiceClient } from '../../clients/customer-service.client.js';
import { notificationClient } from '../../clients/notification.client.js';
import { logReservationCreated } from '../../services/reservation-activity.service.js';

/**
 * Helper function to determine suite type based on service type
 */
function determineSuiteType(serviceType: string): string | null {
  const serviceToSuiteMap: Record<string, string> = {
    BOARDING: 'KENNEL',
    DAYCARE: 'PLAY_AREA',
    GROOMING: 'GROOMING_STATION',
    TRAINING: 'TRAINING_AREA',
    VET: 'EXAM_ROOM',
  };

  return serviceToSuiteMap[serviceType.toUpperCase()] || null;
}

/**
 * Create a new reservation
 * Implements schema alignment strategy with defensive programming
 * Uses standardized error handling pattern
 *
 * @route POST /api/v1/reservations
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 */
export const createReservation: RequestHandler = catchAsync(
  async (req: TenantRequest, res: Response) => {
    // Generate a unique request ID for logging
    const requestId = `create-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;
    logger.info(`Processing create reservation request`, { requestId });

    // Get tenant ID from request - added by tenant middleware
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

    if (!tenantId) {
      logger.warn(`Missing tenant ID in request`, { requestId });
      throw AppError.authorizationError('Tenant ID is required');
    }

    // Validate required fields
    const {
      customerId,
      petId,
      startDate,
      endDate,
      serviceId, // Changed from serviceType to serviceId
      serviceType, // Keep this for backward compatibility
      suiteType: requestedSuiteType,
      resourceId: requestedResourceId,
      status,
      price,
      deposit,
      notes,
      staffNotes,
      staffAssignedId, // For groomer/trainer assignment
      addOnServices,
    } = req.body;

    // Validate required fields
    if (!customerId) {
      logger.warn(`Missing required field: customerId`, { requestId });
      throw AppError.validationError('Customer ID is required');
    }

    if (!petId) {
      logger.warn(`Missing required field: petId`, { requestId });
      throw AppError.validationError('Pet ID is required');
    }

    if (!startDate) {
      logger.warn(`Missing required field: startDate`, { requestId });
      throw AppError.validationError('Start date is required');
    }

    if (!endDate) {
      logger.warn(`Missing required field: endDate`, { requestId });
      throw AppError.validationError('End date is required');
    }

    if (!serviceId) {
      logger.warn(`Missing required field: serviceId`, { requestId });
      throw AppError.validationError('Service ID is required');
    }

    // Parse dates
    let parsedStartDate: Date;
    let parsedEndDate: Date;

    try {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        logger.warn(`Invalid start date format: ${startDate}`, { requestId });
        throw AppError.validationError(
          'Invalid start date format. Use YYYY-MM-DD'
        );
      }
    } catch (error) {
      logger.warn(`Error parsing start date: ${startDate}`, {
        requestId,
        error,
      });
      throw AppError.validationError(
        'Invalid start date format. Use YYYY-MM-DD'
      );
    }

    try {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        logger.warn(`Invalid end date format: ${endDate}`, { requestId });
        throw AppError.validationError(
          'Invalid end date format. Use YYYY-MM-DD'
        );
      }
    } catch (error) {
      logger.warn(`Error parsing end date: ${endDate}`, { requestId, error });
      throw AppError.validationError('Invalid end date format. Use YYYY-MM-DD');
    }

    // Check if start date is before end date
    if (parsedStartDate >= parsedEndDate) {
      logger.warn(
        `Start date must be before end date: ${startDate} - ${endDate}`,
        { requestId }
      );
      throw AppError.validationError('Start date must be before end date');
    }

    // Verify customer exists and belongs to tenant via Customer Service API
    try {
      await customerServiceClient.verifyCustomer(customerId, tenantId);
      logger.info(`Verified customer exists via API: ${customerId}`, {
        requestId,
      });
    } catch (error) {
      logger.error(`Customer verification failed: ${customerId}`, {
        error,
        requestId,
      });
      throw error;
    }

    // Verify pet exists and belongs to tenant via Customer Service API
    try {
      await customerServiceClient.verifyPet(petId, tenantId);
      logger.info(`Verified pet exists via API: ${petId}`, { requestId });
    } catch (error) {
      logger.error(`Pet verification failed: ${petId}`, { error, requestId });
      throw error;
    }

    // Determine suite type based on service type if not provided
    let determinedSuiteType = requestedSuiteType;

    // First, get the service details to determine the service type
    let serviceDetails;
    try {
      serviceDetails = await prisma.service.findFirst({
        where: {
          id: serviceId,
          tenantId: tenantId,
        } as ExtendedServiceWhereInput,
      });

      if (!serviceDetails) {
        logger.warn(`Service with ID ${serviceId} not found`, { requestId });
        throw AppError.validationError(
          `Service with ID ${serviceId} not found`
        );
      }

      // Set the serviceType from the service details
      const serviceCategory = serviceDetails.serviceCategory;
      logger.info(`Found service with category: ${serviceCategory}`, {
        requestId,
      });

      // MANDATORY KENNEL ASSIGNMENT VALIDATION
      // For BOARDING and DAYCARE services, resourceId is required (or suiteType for auto-assign)
      const requiresKennel =
        serviceCategory === 'BOARDING' || serviceCategory === 'DAYCARE';

      if (requiresKennel) {
        // Check if resourceId is provided (can be empty string for auto-assign)
        if (requestedResourceId === null || requestedResourceId === undefined) {
          // No resourceId provided, check if suiteType is provided for auto-assignment
          if (!requestedSuiteType) {
            logger.warn(
              `Resource assignment required for ${serviceCategory} service`,
              { requestId }
            );
            throw AppError.validationError(
              `Kennel assignment is required for ${serviceCategory} services. ` +
                `Please provide a resourceId or suiteType for auto-assignment.`
            );
          }
          logger.info(
            `Auto-assignment requested for ${serviceCategory} with suiteType: ${requestedSuiteType}`,
            { requestId }
          );
        } else if (requestedResourceId === '') {
          // Empty string means auto-assign, suiteType is required
          if (!requestedSuiteType) {
            logger.warn(
              `SuiteType required for auto-assignment of ${serviceCategory} service`,
              { requestId }
            );
            throw AppError.validationError(
              `Suite type is required for auto-assignment of ${serviceCategory} services.`
            );
          }
          logger.info(
            `Auto-assignment requested for ${serviceCategory} with suiteType: ${requestedSuiteType}`,
            { requestId }
          );
        } else {
          // Specific resourceId provided
          logger.info(
            `Specific resource requested for ${serviceCategory}: ${requestedResourceId}`,
            { requestId }
          );
        }
      }

      // Determine suite type based on service category
      if (!determinedSuiteType) {
        determinedSuiteType = determineSuiteType(serviceCategory);
        if (!determinedSuiteType) {
          logger.info(
            `Could not determine suite type from service category ${serviceCategory}, using default`,
            { requestId }
          );
          // Use a default suite type instead of throwing an error
          determinedSuiteType = 'KENNEL';
        }
        logger.info(
          `Determined suite type: ${determinedSuiteType} from service category: ${serviceCategory}`,
          { requestId }
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`Error fetching service details: ${error}`, { requestId });
      throw AppError.serverError('Error processing service information');
    }

    if (!determinedSuiteType) {
      // If no suite type could be determined, use a default
      determinedSuiteType = 'KENNEL';
      logger.info(`Using default suite type: ${determinedSuiteType}`, {
        requestId,
      });
    }

    // Warnings to collect during processing
    const warnings: string[] = [];

    // Handle resource assignment
    let assignedResourceId = requestedResourceId;

    if (assignedResourceId) {
      // Verify resource exists and belongs to tenant
      await safeExecutePrismaQuery(
        async () => {
          return await prisma.resource.findFirstOrThrow({
            where: {
              id: assignedResourceId,
              tenantId: tenantId,
              // organizationId removed as it's not in the schema
            } as ExtendedResourceWhereInput,
          });
        },
        null,
        `Error verifying resource with ID ${assignedResourceId}`,
        true // Enable throwError flag
      );

      logger.info(`Verified resource exists: ${assignedResourceId}`, {
        requestId,
      });

      // Check if resource is available for the requested dates
      const conflictResult = await detectReservationConflicts({
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        resourceId: assignedResourceId,
        tenantId,
      });

      if (conflictResult.hasConflicts) {
        logger.warn(
          `Resource ${assignedResourceId} has conflicts for the requested dates`,
          {
            requestId,
            conflicts: conflictResult.warnings,
          }
        );
        throw AppError.conflictError(
          `Resource is not available for the requested dates: ${conflictResult.warnings.join(
            ', '
          )}`
        );
      }
    } else if (determinedSuiteType) {
      // Try to auto-assign a resource if none was specified but we have a suite type
      logger.info(
        `Attempting to auto-assign a resource for suite type: ${determinedSuiteType}`,
        { requestId }
      );

      try {
        // First get all resources matching the suite type
        const resources = await prisma.resource.findMany({
          where: {
            // organizationId removed as it's not in the schema,
            type: determinedSuiteType,
            tenantId: tenantId,
          } as ExtendedResourceWhereInput,
        });

        if (resources.length === 0) {
          logger.warn(
            `No resources found for suite type: ${determinedSuiteType}`,
            { requestId }
          );
          warnings.push(
            `No resources found for suite type: ${determinedSuiteType}. The reservation will be created without a resource assignment.`
          );
        } else {
          // Then filter out resources with overlapping reservations
          const availableResources = [];

          for (const resource of resources) {
            try {
              const resourceConflict = await detectReservationConflicts({
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                resourceId: resource.id,
                tenantId,
              });

              if (!resourceConflict.hasConflicts) {
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
            assignedResourceId = availableResources[0];
            logger.info(`Auto-assigned resource: ${assignedResourceId}`, {
              requestId,
            });
          } else {
            // Check if the pet already has a reservation during this time
            const petConflictResult = await detectReservationConflicts({
              startDate: parsedStartDate,
              endDate: parsedEndDate,
              tenantId,
              petId,
            });

            if (petConflictResult.hasConflicts) {
              logger.warn(`Pet has conflicts for the requested dates`, {
                requestId,
                conflicts: petConflictResult.warnings,
              });
              throw AppError.conflictError(
                `Pet already has a reservation during this time: ${petConflictResult.warnings.join(
                  ', '
                )}`
              );
            }

            logger.warn(
              `No available resources found for suite type: ${determinedSuiteType}`,
              { requestId }
            );
            warnings.push(
              `No available resources found for suite type: ${determinedSuiteType}. The reservation will be created without a resource assignment.`
            );
          }
        }
      } catch (error) {
        if (error instanceof AppError) {
          throw error; // Re-throw AppErrors (like conflicts)
        }

        logger.warn(`Error auto-assigning resource:`, { requestId, error });
        warnings.push(
          'Failed to auto-assign a resource. The reservation will be created without a resource assignment.'
        );
      }
    }

    // Create the reservation
    logger.info(`Creating reservation`, {
      requestId,
      customerId,
      petId,
      resourceId: assignedResourceId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      suiteType: determinedSuiteType,
      serviceType,
    });

    // Prepare reservation data
    const reservationData: any = {
      tenantId: tenantId,
      customer: {
        connect: { id: customerId },
      },
      pet: {
        connect: { id: petId },
      },
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      service: {
        connect: { id: serviceId },
      },
      // suiteType is handled through resource assignment
      // organizationId removed as it's not in the schema
      status: status || 'PENDING',
    };

    // Add optional fields if provided
    if (assignedResourceId) {
      reservationData.resource = {
        connect: { id: assignedResourceId },
      };
    }
    if (staffAssignedId) {
      reservationData.staffAssigned = {
        connect: { id: staffAssignedId },
      };
    }
    if (price !== undefined) reservationData.price = parseFloat(String(price));
    if (deposit !== undefined)
      reservationData.deposit = parseFloat(String(deposit));
    if (notes !== undefined) reservationData.notes = notes;
    if (staffNotes !== undefined) reservationData.staffNotes = staffNotes;

    // Create reservation with safe execution and error propagation
    const newReservation = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.create({
          data: reservationData,
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
      null,
      `Error creating reservation`,
      true // Enable throwError flag
    );

    // Process add-on services if provided
    if (addOnServices && Array.isArray(addOnServices) && newReservation) {
      try {
        logger.info(`Processing ${addOnServices.length} add-on services`, {
          requestId,
        });

        for (const addOn of addOnServices) {
          if (addOn.serviceId) {
            await safeExecutePrismaQuery(
              async () => {
                return await prisma.reservationAddOn.create({
                  data: {
                    tenantId: tenantId,
                    reservationId: newReservation.id,
                    serviceId: addOn.serviceId,
                    quantity: addOn.quantity || 1,
                    notes: addOn.notes || '',
                    // organizationId removed as it's not in the schema
                  } as any,
                });
              },
              null,
              `Error adding add-on service ${addOn.serviceId} to reservation ${newReservation.id}`
            );
          }
        }
      } catch (error) {
        logger.warn(`Error processing add-on services:`, { requestId, error });
        warnings.push(
          'There was an issue processing add-on services, but the reservation was created successfully.'
        );
      }
    }

    // Add null check for newReservation before accessing id
    logger.success(`Reservation created successfully`, {
      requestId,
      reservationId: newReservation?.id || 'unknown',
    });

    // Log the activity
    if (newReservation?.id) {
      // Determine actor type - if staffAssignedId is provided, it's likely an employee booking
      // Otherwise assume it's a customer online booking or system
      const actorType = staffAssignedId ? 'EMPLOYEE' : 'CUSTOMER';

      logReservationCreated(
        tenantId as string,
        newReservation.id,
        actorType,
        staffAssignedId || customerId,
        undefined, // actorName will be fetched or defaulted
        {
          customerId,
          petId,
          serviceId,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          resourceId: assignedResourceId,
          status: status || 'PENDING',
        },
        req.ip,
        req.get('user-agent')
      ).catch((err) =>
        logger.warn('Failed to log reservation creation activity', { err })
      );
    }

    // Send confirmation notifications (async, don't block response)
    if (newReservation?.id && tenantId) {
      notificationClient
        .sendReservationConfirmation({
          reservationId: newReservation.id,
          tenantId: tenantId as string,
        })
        .catch((err) => {
          logger.warn(
            `Failed to send confirmation notifications: ${err.message}`,
            { requestId }
          );
        });
    }

    // Prepare response with warnings if any
    const responseData: any = {
      success: true,
      status: 'success',
      data: {
        reservation: newReservation,
      },
    };

    // Add message about resource assignment if needed
    if (!assignedResourceId) {
      responseData.data.message =
        'Reservation created without a specific resource assignment. Please assign a resource when available.';
    }

    // Add warnings to response if any were detected
    if (warnings.length > 0) {
      responseData.warnings = warnings;
      logger.warn(`Response includes warnings`, {
        requestId,
        warningCount: warnings.length,
      });
    }

    res.status(201).json(responseData);
  }
);
