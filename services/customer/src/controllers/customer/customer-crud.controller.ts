/**
 * Customer CRUD Controller
 *
 * Handles basic CRUD operations:
 * - getAllCustomers
 * - getCustomerById
 * - getCustomerPets
 * - createCustomer
 * - updateCustomer
 * - deleteCustomer
 * - lookupCustomerByEmail
 */

import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware";
import { TenantRequest } from "../../middleware/tenant.middleware";
import { logger } from "../../utils/logger";
import {
  getCache,
  setCache,
  deleteCache,
  getCacheKey,
} from "../../utils/redis";
import {
  tenantAuditLog,
  AuditAction,
  AuditCategory,
} from "../../services/tenant-audit-log.service";
import {
  customerSelectFull,
  petSelectMinimal,
  petSelectFull,
} from "../../utils/prisma-optimized";

const prisma = new PrismaClient();

/**
 * Get all customers with pagination and filtering
 */
export const getAllCustomers = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;
    const tags = req.query.tags
      ? (req.query.tags as string).split(",")
      : undefined;

    const tenantId = req.tenantId!;

    // Build where condition with tenant filter
    const where: any = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];

      // Phone number format matching
      const digitsOnly = search.replace(/\D/g, "");
      if (digitsOnly.length >= 3) {
        if (digitsOnly.length === 7) {
          const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
          where.OR.push({ phone: { contains: formatted } });
        } else if (digitsOnly.length === 10) {
          const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(
            3,
            6
          )}-${digitsOnly.slice(6)}`;
          where.OR.push({ phone: { contains: formatted } });
        } else if (digitsOnly.length >= 4) {
          const last4 = digitsOnly.slice(-4);
          where.OR.push({ phone: { endsWith: last4 } });
          where.OR.push({ phone: { endsWith: `-${last4}` } });
        }
      }
    }

    // Use optimized select for list view - only fetch needed fields
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      select: {
        ...customerSelectFull,
        pets: { select: petSelectMinimal },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.customer.count({ where });

    res.status(200).json({
      status: "success",
      results: customers.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single customer by ID
 */
export const getCustomerById = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    // Try cache first
    const cacheKey = getCacheKey(tenantId, "customer", id);
    let customer = await getCache<any>(cacheKey);

    if (!customer) {
      // Use optimized select for detail view
      customer = await prisma.customer.findFirst({
        where: { id, tenantId },
        select: {
          ...customerSelectFull,
          pets: { select: petSelectFull },
        },
      });

      if (customer) {
        await setCache(cacheKey, customer, 300);
        logger.debug("Customer cached", { tenantId, customerId: id });
      }
    } else {
      logger.debug("Customer cache hit", { tenantId, customerId: id });
    }

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pets for a customer
 */
export const getCustomerPets = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customerExists = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    const pets = await prisma.pet.findMany({
      where: { customerId: id },
    });

    res.status(200).json({
      status: "success",
      results: pets.length,
      data: pets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new customer
 */
export const createCustomer = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerData = req.body;
    const tenantId = req.tenantId!;
    logger.debug("Creating customer", {
      tenantId,
      customerEmail: customerData.email,
    });

    const newCustomer = await prisma.$transaction(async (prismaClient) => {
      const { emergencyContacts, pets, ...customerFields } = customerData;

      // Sanitize data
      const sanitizedCustomerData = { ...customerFields };
      Object.keys(sanitizedCustomerData).forEach((key) => {
        if (
          sanitizedCustomerData[key] === null ||
          sanitizedCustomerData[key] === undefined ||
          sanitizedCustomerData[key] === ""
        ) {
          delete sanitizedCustomerData[key];
        }
        if (
          Array.isArray(sanitizedCustomerData[key]) &&
          sanitizedCustomerData[key].length === 0
        ) {
          delete sanitizedCustomerData[key];
        }
      });

      delete sanitizedCustomerData.id;
      sanitizedCustomerData.tenantId = tenantId;

      const customer = await prismaClient.customer.create({
        data: sanitizedCustomerData,
      });

      // Create pets if provided
      if (pets && Array.isArray(pets) && pets.length > 0) {
        for (const pet of pets) {
          await prismaClient.pet.create({
            data: { ...pet, customerId: customer.id },
          });
        }
      }

      return prismaClient.customer.findUnique({
        where: { id: customer.id },
        include: { pets: true },
      });
    });

    logger.info("Customer created successfully", {
      tenantId,
      customerId: newCustomer?.id,
    });

    await tenantAuditLog.logCustomer(
      req,
      AuditAction.CREATE,
      newCustomer?.id || "",
      `${newCustomer?.firstName} ${newCustomer?.lastName}`,
      { newValue: newCustomer }
    );

    res.status(201).json({
      status: "success",
      data: newCustomer,
    });
  } catch (error: any) {
    logger.error("Error creating customer", {
      tenantId: req.tenantId,
      error: error.message,
      code: error.code,
    });

    if (error.code === "P2002") {
      return next(
        new AppError("A customer with this email already exists", 400)
      );
    } else if (error.code === "P2000") {
      return next(
        new AppError("Input value is too long for one or more fields", 400)
      );
    }

    next(error);
  }
};

/**
 * Update a customer
 */
export const updateCustomer = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const customerData = req.body;

    const customerExists = await prisma.customer.findFirst({
      where: { id, tenantId: req.tenantId },
      include: { pets: true },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    const updatedCustomer = await prisma.$transaction(async (prismaClient) => {
      const { pets, ...basicCustomerData } = customerData;

      const customer = await prismaClient.customer.update({
        where: { id },
        data: basicCustomerData,
      });

      if (pets && Array.isArray(pets) && pets.length > 0) {
        for (const pet of pets) {
          if (pet.id) {
            await prismaClient.pet.update({
              where: { id: pet.id },
              data: pet,
            });
          } else {
            await prismaClient.pet.create({
              data: { ...pet, customerId: id },
            });
          }
        }
      }

      return prismaClient.customer.findUnique({
        where: { id },
        include: { pets: true },
      });
    });

    // Invalidate cache
    const cacheKey = getCacheKey(req.tenantId!, "customer", id);
    await deleteCache(cacheKey);

    await tenantAuditLog.logCustomer(
      req,
      AuditAction.UPDATE,
      id,
      `${updatedCustomer?.firstName} ${updatedCustomer?.lastName}`,
      { previousValue: customerExists, newValue: updatedCustomer }
    );

    res.status(200).json({
      status: "success",
      data: updatedCustomer,
    });
  } catch (error: any) {
    logger.error("Error updating customer", {
      tenantId: req.tenantId,
      customerId: req.params.id,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Delete a customer
 */
export const deleteCustomer = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const customerExists = await prisma.customer.findFirst({
      where: { id, tenantId: req.tenantId },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    if (permanent === "true") {
      await prisma.$transaction(async (prismaClient) => {
        await prismaClient.pet.deleteMany({ where: { customerId: id } });
        await prismaClient.customer.delete({ where: { id } });
      });

      await tenantAuditLog.logFromRequest(
        req,
        AuditAction.DELETE,
        AuditCategory.CUSTOMER,
        "customer",
        id,
        `${customerExists.firstName} ${customerExists.lastName}`,
        { previousValue: customerExists, severity: "CRITICAL" as any }
      );

      res.status(204).json({ status: "success", data: null });
    } else {
      await tenantAuditLog.logCustomer(
        req,
        AuditAction.UPDATE,
        id,
        `${customerExists.firstName} ${customerExists.lastName}`,
        { metadata: { action: "deactivated" } }
      );

      res.status(200).json({
        status: "success",
        data: { message: "Customer has been deactivated" },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Public customer lookup by email - for booking portal login
 */
export const lookupCustomerByEmail = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const tenantId = req.tenantId!;

    if (!email || typeof email !== "string") {
      return next(new AppError("Email is required", 400));
    }

    const normalizedEmail = email.toLowerCase().trim();

    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        email: { equals: normalizedEmail, mode: "insensitive" },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        portalEnabled: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
        message: "No customer found with this email address",
      });
    }

    if (customer.portalEnabled === false) {
      return res.status(403).json({
        success: false,
        error: "Portal access disabled",
        message:
          "Your account does not have portal access. Please contact the business.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    logger.error("Customer lookup error", { error });
    next(error);
  }
};
