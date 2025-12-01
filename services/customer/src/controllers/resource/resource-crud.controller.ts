/**
 * Resource CRUD Controller
 *
 * Handles basic CRUD operations:
 * - getAllResources
 * - getResource
 * - createResource
 * - updateResource
 * - deleteResource
 */

import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import AppError from "../../utils/appError";
import { TenantRequest } from "../../middleware/tenant.middleware";
import { logger } from "../../utils/logger";
import {
  getCache,
  setCache,
  deleteCache,
  getCacheKey,
  deleteCachePattern,
} from "../../utils/redis";

const prisma = new PrismaClient();

// Valid resource types and aliases
const validTypeMap: Record<string, string> = {
  KENNEL: "KENNEL",
  DOG_KENNEL: "KENNEL",
  RUN: "RUN",
  SUITE: "SUITE",
  STANDARD_SUITE: "STANDARD_SUITE",
  STANDARD_PLUS_SUITE: "STANDARD_PLUS_SUITE",
  VIP_SUITE: "VIP_SUITE",
  LUXURY_SUITE: "VIP_SUITE",
  PLAY_AREA: "PLAY_AREA",
  INDOOR_PLAY_YARD: "PLAY_AREA",
  OUTDOOR_PLAY_YARD: "OUTDOOR_PLAY_YARD",
  PRIVATE_PLAY_AREA: "PRIVATE_PLAY_AREA",
  GROOMING_TABLE: "GROOMING_TABLE",
  BATHING_STATION: "BATHING_STATION",
  DRYING_STATION: "DRYING_STATION",
  TRAINING_ROOM: "TRAINING_ROOM",
  AGILITY_COURSE: "AGILITY_COURSE",
  GROOMER: "GROOMER",
  TRAINER: "TRAINER",
  ATTENDANT: "ATTENDANT",
  BATHER: "BATHER",
  OTHER: "OTHER",
};

/**
 * Validate and normalize resource type
 */
export const validateResourceType = (type: string): string => {
  const normalizedType = type.toUpperCase().trim();

  if (validTypeMap[normalizedType]) {
    return validTypeMap[normalizedType];
  }

  const similarTypes = Object.keys(validTypeMap).filter((validType) => {
    return (
      normalizedType.includes(validType) || validType.includes(normalizedType)
    );
  });

  if (similarTypes.length > 0) {
    logger.debug("Resource type matched with alias", {
      inputType: type,
      matchedType: similarTypes[0],
    });
    return validTypeMap[similarTypes[0]];
  }

  throw new AppError(
    `Invalid resource type: ${type}. Valid types are: ${Object.keys(
      validTypeMap
    ).join(", ")}`,
    400
  );
};

/**
 * Get all resources
 */
export const getAllResources = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { sortBy, sortOrder, type } = req.query;

    const isSimpleQuery = !sortBy && !sortOrder && !type;
    const cacheKey = getCacheKey(tenantId, "resources", "all");

    if (isSimpleQuery) {
      const cachedResources = await getCache<any>(cacheKey);
      if (cachedResources) {
        logger.debug("Resource list cache hit", { tenantId });
        return res.status(200).json(cachedResources);
      }
    }

    const query: any = {
      where: { tenantId },
      include: {
        availabilitySlots: {
          where: { endTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
        },
      },
    };

    if (type) {
      const typeStr = type as string;
      if (typeStr.includes(",")) {
        const types = typeStr.split(",").map((t) => t.trim().toUpperCase());
        query.where.type = { in: types };
      } else if (typeStr.toLowerCase() === "suite") {
        query.where.AND = [
          { tenantId },
          {
            OR: [
              { type: "SUITE" },
              { type: "STANDARD_SUITE" },
              { type: "STANDARD_PLUS_SUITE" },
              { type: "VIP_SUITE" },
            ],
          },
        ];
        delete query.where.tenantId;
      } else {
        query.where.type = typeStr.toUpperCase();
      }
    }

    if (sortBy && sortOrder) {
      query.orderBy = {
        [sortBy as string]: sortOrder === "desc" ? "desc" : "asc",
      };
    }

    const resources = await prisma.resource.findMany(query);

    const response = { status: "success", data: resources };

    if (isSimpleQuery) {
      await setCache(cacheKey, response, 900);
      logger.debug("Resource list cached", {
        tenantId,
        count: resources.length,
        ttl: 900,
      });
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single resource
 */
export const getResource = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const cacheKey = getCacheKey(tenantId, "resource", id);
    const cachedResource = await getCache<any>(cacheKey);
    if (cachedResource) {
      logger.debug("Resource cache hit", { tenantId, resourceId: id });
      return res.status(200).json({ status: "success", data: cachedResource });
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        availabilitySlots: {
          where: { endTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!resource) {
      return next(new AppError("Resource not found", 404));
    }

    await setCache(cacheKey, resource, 900);
    logger.debug("Resource cached", { tenantId, resourceId: id, ttl: 900 });

    res.status(200).json({ status: "success", data: resource });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new resource
 */
export const createResource = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { maintenanceSchedule, capacity, type, ...resourceData } = req.body;

    let validType;
    try {
      validType = validateResourceType(type);
    } catch (typeError) {
      return next(typeError);
    }

    logger.info("Creating resource", {
      tenantId,
      name: resourceData.name,
      type: validType,
      capacity: capacity ? parseInt(capacity, 10) : 1,
    });

    const resource = await prisma.resource.create({
      data: {
        ...resourceData,
        tenantId,
        type: validType as any,
        capacity: capacity ? parseInt(capacity, 10) : 1,
        maintenanceSchedule: undefined,
        attributes: resourceData.attributes || {},
        isActive: resourceData.isActive ?? true,
      },
      include: { availabilitySlots: true },
    });

    await deleteCachePattern(`${tenantId}:resources:*`);
    logger.debug("Resource list cache invalidated", {
      tenantId,
      resourceId: resource.id,
    });

    res.status(201).json({ status: "success", data: resource });
  } catch (error: any) {
    logger.error("Error creating resource", {
      tenantId: req.tenantId,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Update a resource
 */
export const updateResource = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const resourceData = req.body;

    const existingResource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!existingResource) {
      return next(new AppError(`Resource not found with id: ${id}`, 404));
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        name: resourceData.name,
        type: resourceData.type,
        description: resourceData.description,
        capacity: resourceData.capacity,
        availability: resourceData.availability,
        location: resourceData.location,
        maintenanceSchedule: resourceData.maintenanceSchedule,
        attributes: resourceData.attributes,
        isActive: resourceData.isActive ?? existingResource.isActive,
        notes: resourceData.notes,
      },
      include: { availabilitySlots: true },
    });

    const cacheKey = getCacheKey(req.tenantId!, "resource", id);
    await deleteCache(cacheKey);
    await deleteCachePattern(`${req.tenantId}:resources:*`);
    logger.debug("Resource caches invalidated", {
      tenantId: req.tenantId,
      resourceId: id,
    });

    res.status(200).json({ status: "success", data: resource });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a resource
 */
export const deleteResource = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.resource.delete({ where: { id } });

    res.status(204).json({ status: "success", data: null });
  } catch (error) {
    next(error);
  }
};
