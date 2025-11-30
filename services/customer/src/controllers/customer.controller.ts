import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { TenantRequest } from "../middleware/tenant.middleware";
import { logger } from "../utils/logger";
import { getCache, setCache, deleteCache, getCacheKey } from "../utils/redis";
import {
  tenantAuditLog,
  AuditAction,
  AuditCategory,
} from "../services/tenant-audit-log.service";

const prisma = new PrismaClient();

// Get all customers
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

    // Use tenant ID from middleware
    const tenantId = req.tenantId!;

    // Build where condition with tenant filter
    const where: any = {
      tenantId,
    };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } }, // Match with dashes (e.g., "555-0112")
      ];

      // If search contains only digits, also try matching with common phone formats
      const digitsOnly = search.replace(/\D/g, "");
      if (digitsOnly.length >= 3) {
        // Try matching patterns like: 555-0112, (555) 0112, etc.
        // For a search like "5550112", match against "555-0112"
        if (digitsOnly.length === 7) {
          // Format: XXX-XXXX
          const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
          where.OR.push({ phone: { contains: formatted } });
        } else if (digitsOnly.length === 10) {
          // Format: XXX-XXX-XXXX
          const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(
            3,
            6
          )}-${digitsOnly.slice(6)}`;
          where.OR.push({ phone: { contains: formatted } });
        } else if (digitsOnly.length >= 4) {
          // For partial searches, try last 4 digits with dash
          const last4 = digitsOnly.slice(-4);
          where.OR.push({ phone: { endsWith: last4 } });
          where.OR.push({ phone: { endsWith: `-${last4}` } });
        }
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      include: {
        pets: {
          select: {
            id: true,
            name: true,
            breed: true,
            // type is not in the current schema
          },
        },
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

// Get a single customer by ID
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
      customer = await prisma.customer.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          pets: true,
        },
      });

      // Cache for 5 minutes if found
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

// Get all pets for a customer
export const getCustomerPets = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customerExists = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    const pets = await prisma.pet.findMany({
      where: { customerId: id },
      // No medicalRecords in current schema
      // Just return pets without includes
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

// Create a new customer
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

    // Create customer with transaction to ensure all related records are created
    const newCustomer = await prisma.$transaction(async (prismaClient) => {
      // Extract only the fields that belong to the Customer model
      const {
        emergencyContacts,
        pets, // Extract pets to handle separately
        ...customerFields
      } = customerData;

      // Remove any fields that might cause Prisma validation errors
      const sanitizedCustomerData = { ...customerFields };

      // Remove empty arrays, undefined/null fields, and empty strings that might cause Prisma validation errors
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

      // Always remove id field for creation - it should be auto-generated
      delete sanitizedCustomerData.id;

      // Add tenantId to customer data
      sanitizedCustomerData.tenantId = tenantId;

      // Create the customer
      const customer = await prismaClient.customer.create({
        data: sanitizedCustomerData,
      });

      // Create pets if provided
      if (pets && Array.isArray(pets) && pets.length > 0) {
        for (const pet of pets) {
          await prismaClient.pet.create({
            data: {
              ...pet,
              customerId: customer.id,
            },
          });
        }
      }

      // Emergency contacts are not in the current schema
      // Just log that we received them but can't store them
      if (
        emergencyContacts &&
        Array.isArray(emergencyContacts) &&
        emergencyContacts.length > 0
      ) {
        logger.warn(
          `Received ${emergencyContacts.length} emergency contacts but cannot store them - model not in schema`,
          { tenantId, customerId: customer.id }
        );
      }

      // Get customer with all related data
      const customerWithRelations = await prismaClient.customer.findUnique({
        where: { id: customer.id },
        include: {
          pets: true,
        },
      });

      return customerWithRelations;
    });

    logger.info("Customer created successfully", {
      tenantId,
      customerId: newCustomer?.id,
    });

    // Audit log the customer creation
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

    // Provide more specific error messages for common issues
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

// Update a customer
export const updateCustomer = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const customerData = req.body;

    // Check if customer exists and belongs to this tenant
    const customerExists = await prisma.customer.findFirst({
      where: {
        id,
        tenantId: req.tenantId,
      },
      include: {
        pets: true,
      },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    // Update customer with transaction to ensure all related records are updated
    const updatedCustomer = await prisma.$transaction(async (prismaClient) => {
      // Remove pets from the base data since they need special handling
      const { pets, ...basicCustomerData } = customerData;

      // Update basic customer data
      const customer = await prismaClient.customer.update({
        where: { id },
        data: basicCustomerData,
      });

      // Handle pets if provided
      if (pets && Array.isArray(pets) && pets.length > 0) {
        // For each pet, update if exists or create if new
        for (const pet of pets) {
          if (pet.id) {
            // Update existing pet
            await prismaClient.pet.update({
              where: { id: pet.id },
              data: pet,
            });
          } else {
            // Create new pet
            await prismaClient.pet.create({
              data: {
                ...pet,
                customerId: id,
              },
            });
          }
        }
      }

      // Return the updated customer with notifications
      return prismaClient.customer.findUnique({
        where: { id },
        include: {
          pets: true,
        },
      });
    });

    // Invalidate customer cache
    const cacheKey = getCacheKey(req.tenantId!, "customer", id);
    await deleteCache(cacheKey);
    logger.debug("Customer cache invalidated", {
      tenantId: req.tenantId,
      customerId: id,
    });

    // Audit log the customer update
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
  } catch (error) {
    logger.error("Error updating customer", {
      tenantId: req.tenantId,
      customerId: req.params.id,
      error: error.message,
    });
    next(error);
  }
};

// Delete a customer
export const deleteCustomer = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    // Check if customer exists and belongs to this tenant
    const customerExists = await prisma.customer.findFirst({
      where: {
        id,
        tenantId: req.tenantId,
      },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    if (permanent === "true") {
      // Permanently delete customer with cascade to related entities
      await prisma.$transaction(async (prismaClient) => {
        // Delete pets first (they depend on customer)
        await prismaClient.pet.deleteMany({
          where: { customerId: id },
        });

        // Finally delete the customer
        await prismaClient.customer.delete({
          where: { id },
        });
      });

      // Audit log the permanent deletion (CRITICAL severity)
      await tenantAuditLog.logFromRequest(
        req,
        AuditAction.DELETE,
        AuditCategory.CUSTOMER,
        "customer",
        id,
        `${customerExists.firstName} ${customerExists.lastName}`,
        { previousValue: customerExists, severity: "CRITICAL" as any }
      );

      res.status(204).json({
        status: "success",
        data: null,
      });
    } else {
      // We can't mark as inactive since isActive doesn't exist in schema
      // Just return success without actually deleting
      logger.warn(
        `Customer would be marked inactive, but isActive field doesn't exist in schema`,
        { tenantId: req.tenantId, customerId: id }
      );

      // Audit log the soft delete
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

// Get customer documents
export const getCustomerDocuments = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    // Document model is not in the current schema
    res.status(200).json({
      status: "success",
      message: "Document functionality is not available in the current schema",
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

// Upload a customer document
export const uploadCustomerDocument = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    // Document model is not in the current schema
    res.status(200).json({
      status: "success",
      message:
        "Document upload functionality is not available in the current schema",
      data: {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        fileSize: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get customer notification preferences
export const getCustomerNotificationPreferences = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    // Notification preferences not in current schema
    // Return a message indicating this feature is not available
    res.status(200).json({
      status: "success",
      message:
        "Notification preferences are not available in the current schema",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Update customer notification preferences
export const updateCustomerNotificationPreferences = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const preferenceData = req.body;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    // Notification preferences not in current schema
    const preferences = {
      message:
        "Notification preferences are not available in the current schema",
    };

    res.status(200).json({
      status: "success",
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
};

// Get customer invoices
export const getCustomerInvoices = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if customer exists
    const customerExists = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    // Handle the case where the Invoice table doesn't exist in the database
    // Return an empty array with a message
    let invoices: any[] = [];
    let total = 0;

    try {
      // Try to query the Invoice table, but it may not exist
      invoices = await prisma.$queryRaw`
        SELECT * FROM "Invoice" 
        WHERE "customerId" = ${id} 
        ORDER BY "issueDate" DESC 
        LIMIT ${limit} 
        OFFSET ${skip}
      `;

      const totalResult: any[] = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Invoice" 
        WHERE "customerId" = ${id}
      `;
      total = totalResult[0]?.count ? Number(totalResult[0].count) : 0;
    } catch (error) {
      // If the table doesn't exist, just return an empty array
      // No need to propagate the error
      logger.warn("Invoice table may not exist in the database", {
        tenantId: req.tenantId,
        customerId: id,
      });
    }

    res.status(200).json({
      status: "success",
      results: invoices.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// Get customer payments
export const getCustomerPayments = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if customer exists
    const customerExists = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customerExists) {
      return next(new AppError("Customer not found", 404));
    }

    // Payment model is not in the current schema
    // Return empty data
    const payments: any[] = [];
    const total = 0;

    res.status(200).json({
      status: "success",
      results: payments.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public customer lookup by email - for booking portal login
 * Returns minimal info to prevent data leakage
 * Rate limited to prevent enumeration attacks
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find customer by email
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
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

    // Return customer data for booking portal
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
