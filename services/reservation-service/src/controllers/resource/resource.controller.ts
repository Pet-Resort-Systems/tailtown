/**
 * Resource Controller
 *
 * This controller handles CRUD operations for resources (kennels, suites, etc.)
 * It implements our schema alignment strategy with defensive programming
 * and graceful error handling for potential schema mismatches.
 *
 * Updated to use standardized error handling with AppError factory methods
 * and catchAsync wrapper for consistent error handling across services.
 */

import { Response } from "express";
import { ResourceType } from "@prisma/client";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../middleware/errorHandler";
import { logger } from "../../utils/logger";
import { TenantRequest } from "../../types/request";
import {
  prisma,
  safeExecutePrismaQuery,
} from "../reservation/utils/prisma-helpers";

/**
 * Get all resources with pagination and filtering
 * Implements schema alignment strategy with fallback to empty array
 * Updated to use standardized error handling pattern
 */
export const getAllResources = catchAsync(
  async (req: TenantRequest, res: Response) => {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    if (!tenantId) {
      throw AppError.authorizationError("Tenant ID is required");
    }

    logger.info(
      `[RESOURCES] Getting resources for tenantId: ${tenantId}, header: ${req.headers["x-tenant-id"]}`
    );

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter conditions (tenant-scoped)
    const whereConditions: any = { tenantId };

    logger.info(
      `[RESOURCES] Where conditions: ${JSON.stringify(whereConditions)}`
    );

    // Add type filter if provided
    if (req.query.type) {
      try {
        const typeStr = String(req.query.type);

        // Handle comma-separated types or single type
        if (typeStr.includes(",")) {
          const types = typeStr.split(",").map((t) => t.trim().toUpperCase());
          const validTypes = types.filter((t) =>
            Object.values(ResourceType).includes(t as ResourceType)
          );

          if (validTypes.length > 0) {
            whereConditions.type = {
              in: validTypes as ResourceType[],
            };
            logger.debug(
              `Multiple types filter applied: ${JSON.stringify(
                whereConditions.type
              )}`
            );
          } else {
            logger.warn(
              `No valid resource types found in filter: ${JSON.stringify(
                types
              )}`
            );
          }
        } else {
          // Single type - handle 'suite' as a wildcard for all suite types
          if (typeStr.toLowerCase() === "suite") {
            whereConditions.type = {
              in: [
                ResourceType.SUITE,
                ResourceType.STANDARD_SUITE,
                ResourceType.STANDARD_PLUS_SUITE,
                ResourceType.VIP_SUITE,
              ],
            };
            logger.debug(
              `Suite wildcard filter applied: all suite types including SUITE`
            );
          } else if (typeStr.toLowerCase() === "kennel") {
            // Handle 'kennel' as a wildcard for all kennel types
            whereConditions.type = {
              in: [
                ResourceType.JUNIOR_KENNEL,
                ResourceType.QUEEN_KENNEL,
                ResourceType.KING_KENNEL,
                ResourceType.VIP_ROOM,
                ResourceType.CAT_CONDO,
                ResourceType.KENNEL,
              ],
            };
            logger.debug(`Kennel wildcard filter applied: all kennel types`);
          } else {
            const upperType = typeStr.toUpperCase();
            if (
              Object.values(ResourceType).includes(upperType as ResourceType)
            ) {
              whereConditions.type = upperType as ResourceType;
              logger.debug(
                `Single type filter applied: ${whereConditions.type}`
              );
            } else {
              logger.warn(`Invalid resource type in filter: ${typeStr}`);
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing resource type filter: ${error}`);
      }
    }

    // Add name search if provided
    if (req.query.search) {
      whereConditions.name = {
        contains: req.query.search as string,
        mode: "insensitive",
      };
    }

    // Log the query parameters
    logger.info(
      `Fetching resources with filters: ${JSON.stringify({
        tenantId,
        page,
        limit,
        type: req.query.type,
        search: req.query.search,
      })}`
    );

    // Get total count with safe execution
    const totalCount = await safeExecutePrismaQuery(
      async () => {
        return await prisma.resource.count({
          where: whereConditions as any, // Type assertion to handle organizationId
        });
      },
      0, // Zero fallback if there's an error
      "Error counting resources"
    );

    // Get resources with safe execution
    const resources = await safeExecutePrismaQuery(
      async () => {
        return await prisma.resource.findMany({
          where: whereConditions, // No need for type assertion since we're not using organizationId yet
          skip,
          take: limit,
          orderBy: {
            name: "asc",
          },
        });
      },
      [], // Empty array fallback if there's an error
      "Error fetching resources"
    );

    logger.success(
      `Successfully retrieved ${resources?.length || 0} resources`
    );

    // Return paginated results
    res.status(200).json({
      success: true,
      status: "success",
      results: resources?.length || 0,
      totalPages: Math.ceil((totalCount || 0) / limit),
      currentPage: page,
      data: resources || [],
    });
  }
);

/**
 * Get a single resource by ID
 * Implements schema alignment strategy with fallback to null
 * Updated to use standardized error handling pattern
 */
export const getResourceById = catchAsync(
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    if (!tenantId) {
      throw AppError.authorizationError("Tenant ID is required");
    }

    if (!id) {
      throw AppError.validationError("Resource ID is required");
    }

    logger.info(`Fetching resource with ID: ${id} for tenant: ${tenantId}`);

    // Get resource with safe execution
    const resource = await safeExecutePrismaQuery(
      async () => {
        return await prisma.resource.findFirst({
          where: {
            id,
            tenantId,
          },
        });
      },
      null, // Null fallback if there's an error
      `Error fetching resource with ID: ${id}`
    );

    if (!resource) {
      throw AppError.notFoundError("Resource", id);
    }

    logger.success(`Successfully retrieved resource: ${id}`);

    res.status(200).json({
      success: true,
      status: "success",
      data: resource,
    });
  }
);

/**
 * Create a new resource
 * Implements schema alignment strategy with proper error handling
 * Updated to use standardized error handling pattern
 */
export const createResource = catchAsync(
  async (req: TenantRequest, res: Response) => {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    if (!tenantId) {
      throw AppError.authorizationError("Tenant ID is required");
    }

    const {
      name,
      type,
      size,
      capacity,
      maxPets,
      description,
      isActive,
      suiteNumber,
    } = req.body;

    // Validate required fields with factory methods
    if (!name) {
      throw AppError.validationError("Name is required");
    }

    if (!type) {
      throw AppError.validationError("Type is required");
    }

    logger.info(
      `Creating new resource of type: ${type} for tenant: ${tenantId}`
    );

    // Create resource with safe execution and throw errors
    const newResource = await safeExecutePrismaQuery(
      async () => {
        // Use type assertion to handle fields not in the base Prisma schema
        const data: any = {
          name,
          type,
          size: size || undefined, // Room size (JUNIOR, QUEEN, KING, etc.)
          capacity: capacity ? parseInt(capacity) : undefined,
          maxPets: maxPets ? parseInt(maxPets) : 1,
          description,
          isActive: isActive !== undefined ? isActive : true,
          tenantId: tenantId,
        };

        if (suiteNumber !== undefined) {
          const parsedSuiteNumber = parseInt(String(suiteNumber), 10);
          if (!Number.isNaN(parsedSuiteNumber)) {
            data.suiteNumber = parsedSuiteNumber;
          }
        }

        return await prisma.resource.create({
          data,
        });
      },
      null, // Null fallback if there's an error
      "Error creating resource",
      true // Throw error instead of returning fallback
    );

    if (!newResource) {
      throw AppError.serverError("Failed to create resource", {
        resourceData: req.body,
      });
    }

    logger.success(`Successfully created resource: ${newResource.id}`);

    res.status(201).json({
      success: true,
      status: "success",
      data: newResource,
    });
  }
);

/**
 * Update an existing resource
 * Implements schema alignment strategy with proper error handling
 * Updated to use standardized error handling pattern
 */
export const updateResource = catchAsync(
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    if (!tenantId) {
      throw AppError.authorizationError("Tenant ID is required");
    }

    if (!id) {
      throw AppError.validationError("Resource ID is required");
    }

    const {
      name,
      type,
      size,
      capacity,
      maxPets,
      description,
      isActive,
      suiteNumber,
    } = req.body;

    // Validate that at least one field is being updated
    if (
      name === undefined &&
      type === undefined &&
      size === undefined &&
      capacity === undefined &&
      maxPets === undefined &&
      description === undefined &&
      isActive === undefined &&
      suiteNumber === undefined
    ) {
      throw AppError.validationError(
        "At least one field must be provided for update"
      );
    }

    logger.info(`Updating resource with ID: ${id} for tenant: ${tenantId}`);

    // Build update data object
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (size !== undefined) updateData.size = size;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (maxPets !== undefined) updateData.maxPets = parseInt(maxPets);
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (suiteNumber !== undefined) {
      const parsedSuiteNumber = parseInt(String(suiteNumber), 10);
      if (!Number.isNaN(parsedSuiteNumber)) {
        updateData.suiteNumber = parsedSuiteNumber;
      } else {
        updateData.suiteNumber = null;
      }
    }

    // Ensure resource belongs to tenant before update
    const existingResource = await safeExecutePrismaQuery(
      async () => {
        return await prisma.resource.findFirst({
          where: { id, tenantId },
        });
      },
      null,
      `Error verifying resource ownership before update: ${id}`
    );
    if (!existingResource) {
      throw AppError.notFoundError("Resource", id);
    }

    // Update resource with safe execution and throw errors
    const updatedResource = await safeExecutePrismaQuery(
      async () => {
        // Use type assertion for where clause to handle organizationId
        const whereClause: any = {
          id,
        };

        // Prepare for multi-tenancy but don't add the field yet
        // This will be uncommented when the schema includes organizationId
        // const multiTenancyEnabled = false;
        // if (multiTenancyEnabled) {
        //   whereClause.organizationId = tenantId;
        // }

        return await prisma.resource.update({
          where: whereClause,
          data: updateData,
        });
      },
      null, // Null fallback if there's an error
      `Error updating resource with ID: ${id}`,
      true // Throw error instead of returning fallback
    );

    logger.success(`Successfully updated resource: ${id}`);

    res.status(200).json({
      success: true,
      status: "success",
      data: updatedResource,
    });
  }
);

/**
 * Delete a resource
 * Implements schema alignment strategy with proper error handling
 * Updated to use standardized error handling pattern
 */
export const deleteResource = catchAsync(
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    if (!tenantId) {
      throw AppError.authorizationError("Tenant ID is required");
    }

    if (!id) {
      throw AppError.validationError("Resource ID is required");
    }

    logger.info(
      `Attempting to delete resource with ID: ${id} for tenant: ${tenantId}`
    );

    // Check if resource is used in any reservations
    const reservationsUsingResource = await safeExecutePrismaQuery(
      async () => {
        const whereConditions: any = {
          resourceId: id,
          tenantId: tenantId,
        };

        return await prisma.reservation.count({
          where: whereConditions,
        });
      },
      0, // Zero fallback if there's an error
      `Error checking reservations for resource with ID: ${id}`
    );

    if (reservationsUsingResource && reservationsUsingResource > 0) {
      throw AppError.conflictError(
        "Cannot delete resource that is used in reservations",
        { resourceId: id, reservationCount: reservationsUsingResource }
      );
    }

    // Verify resource belongs to tenant before deletion
    const existingResource = await safeExecutePrismaQuery(
      async () => {
        return await prisma.resource.findFirst({
          where: { id, tenantId },
        });
      },
      null,
      `Error verifying resource ownership before deletion: ${id}`
    );

    if (!existingResource) {
      throw AppError.notFoundError("Resource", id);
    }

    // Delete resource with safe execution
    const deleteResult = await safeExecutePrismaQuery(
      async () => {
        return await prisma.resource.deleteMany({
          where: { id, tenantId },
        });
      },
      { count: 0 }, // Fallback if there's an error
      `Error deleting resource with ID: ${id}`
    );

    if (!deleteResult || deleteResult.count === 0) {
      throw AppError.notFoundError("Resource", id);
    }

    logger.success(`Successfully deleted resource: ${id}`);

    res.status(200).json({
      success: true,
      status: "success",
      message: "Resource deleted successfully",
    });
  }
);

/**
 * Get resource availability for a date range
 * This is a convenience method that wraps the availability controller
 * Updated to use standardized error handling pattern
 */
export const getResourceAvailability = catchAsync(
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    if (!tenantId) {
      throw AppError.authorizationError("Tenant ID is required");
    }
    const { startDate, endDate } = req.query;

    if (!id) {
      throw AppError.validationError("Resource ID is required");
    }

    if (!startDate || !endDate) {
      throw AppError.validationError("Start date and end date are required");
    }

    // Parse dates
    const parsedStartDate = new Date(startDate as string);
    const parsedEndDate = new Date(endDate as string);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      throw AppError.validationError("Invalid date format", {
        startDate,
        endDate,
      });
    }

    logger.info(
      `Checking availability for resource ID: ${id} from ${parsedStartDate} to ${parsedEndDate}`
    );

    // Ensure resource exists and belongs to tenant
    const resourceRecord = await safeExecutePrismaQuery(
      async () => {
        return await prisma.resource.findFirst({
          where: { id, tenantId },
        });
      },
      null,
      `Error verifying resource before availability check: ${id}`
    );
    if (!resourceRecord) {
      throw AppError.notFoundError("Resource", id);
    }

    // Check for overlapping reservations with safe execution
    const overlappingReservations = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.findMany({
          where: {
            tenantId: tenantId,
            resourceId: id,
            // organizationId removed as it's not in the schema
            OR: [
              {
                // Reservation starts during the requested period
                startDate: {
                  gte: parsedStartDate,
                  lte: parsedEndDate,
                },
              },
              {
                // Reservation ends during the requested period
                endDate: {
                  gte: parsedStartDate,
                  lte: parsedEndDate,
                },
              },
              {
                // Reservation spans the entire requested period
                AND: [
                  {
                    startDate: {
                      lte: parsedStartDate,
                    },
                  },
                  {
                    endDate: {
                      gte: parsedEndDate,
                    },
                  },
                ],
              },
            ],
          } as any, // Type assertion to handle organizationId
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        });
      },
      [], // Empty array fallback if there's an error
      `Error checking availability for resource with ID: ${id}`
    );

    // Determine if resource is available
    const isAvailable =
      !overlappingReservations || overlappingReservations.length === 0;

    logger.success(
      `Successfully checked availability for resource: ${id}. Available: ${isAvailable}`
    );

    res.status(200).json({
      success: true,
      status: "success",
      data: {
        resourceId: id,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        isAvailable,
        overlappingReservations: overlappingReservations || [],
      },
    });
  }
);
