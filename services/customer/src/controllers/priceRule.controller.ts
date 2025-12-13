import { Request, Response, NextFunction } from "express";
import {
  PrismaClient,
  PriceRuleType,
  DiscountType,
  PriceAdjustmentType,
  ServiceCategory,
} from "@prisma/client";
import { AppError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

// Get all price rules
export const getAllPriceRules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;
    const ruleType = req.query.ruleType as PriceRuleType | undefined;

    // Build where condition
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (ruleType) {
      where.ruleType = ruleType;
    }

    const priceRules = await prisma.priceRule.findMany({
      where,
      skip,
      take: limit,
      include: {
        serviceCategories: true,
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { priority: "desc" },
    });

    const total = await prisma.priceRule.count({ where });

    res.status(200).json({
      status: "success",
      results: priceRules.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: priceRules,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single price rule by ID
export const getPriceRuleById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const priceRule = await prisma.priceRule.findUnique({
      where: { id },
      include: {
        serviceCategories: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!priceRule) {
      return next(new AppError("Price rule not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: priceRule,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new price rule
export const createPriceRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      description,
      ruleType,
      adjustmentType,
      discountType,
      discountValue,
      minQuantity,
      maxQuantity,
      startDate,
      endDate,
      daysOfWeek,
      isActive,
      priority,
      serviceCategories,
      services,
    } = req.body;

    // Validate required fields
    if (!name || !ruleType || !discountType || discountValue === undefined) {
      return next(new AppError("Missing required fields", 400));
    }

    // Validate discount value
    if (
      discountType === "PERCENTAGE" &&
      (discountValue < 0 || discountValue > 100)
    ) {
      return next(
        new AppError("Percentage discount must be between 0 and 100", 400)
      );
    }

    // Validate days of week if applicable
    if (
      ruleType === "DAY_OF_WEEK" &&
      (!daysOfWeek || daysOfWeek.length === 0)
    ) {
      return next(
        new AppError("Days of week are required for DAY_OF_WEEK rule type", 400)
      );
    }

    // Create price rule with transaction to handle related records
    const newPriceRule = await prisma.$transaction(async (prismaClient) => {
      // Create the main price rule
      const priceRule = await prismaClient.priceRule.create({
        data: {
          name,
          description,
          ruleType,
          adjustmentType: adjustmentType || "DISCOUNT",
          discountType,
          discountValue,
          minQuantity,
          maxQuantity,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
          isActive: isActive !== undefined ? isActive : true,
          priority: priority || 10,
        },
      });

      // Create service category relations if provided
      if (serviceCategories && serviceCategories.length > 0) {
        await Promise.all(
          serviceCategories.map((category: ServiceCategory) =>
            prismaClient.priceRuleServiceCategory.create({
              data: {
                priceRuleId: priceRule.id,
                serviceCategory: category,
              },
            })
          )
        );
      }

      // Create service relations if provided
      if (services && services.length > 0) {
        await Promise.all(
          services.map((serviceId: string) =>
            prismaClient.priceRuleService.create({
              data: {
                priceRuleId: priceRule.id,
                serviceId,
              },
            })
          )
        );
      }

      // Return the price rule with related records
      return prismaClient.priceRule.findUnique({
        where: { id: priceRule.id },
        include: {
          serviceCategories: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });
    });

    res.status(201).json({
      status: "success",
      data: newPriceRule,
    });
  } catch (error) {
    next(error);
  }
};

// Update a price rule
export const updatePriceRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      ruleType,
      adjustmentType,
      discountType,
      discountValue,
      minQuantity,
      maxQuantity,
      startDate,
      endDate,
      daysOfWeek,
      isActive,
      priority,
      serviceCategories,
      services,
    } = req.body;

    // Check if price rule exists
    const priceRuleExists = await prisma.priceRule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!priceRuleExists) {
      return next(new AppError("Price rule not found", 404));
    }

    // Validate discount value if provided
    if (
      discountType === "PERCENTAGE" &&
      discountValue !== undefined &&
      (discountValue < 0 || discountValue > 100)
    ) {
      return next(
        new AppError("Percentage discount must be between 0 and 100", 400)
      );
    }

    // Update price rule with transaction to handle related records
    const updatedPriceRule = await prisma.$transaction(async (prismaClient) => {
      // Update the main price rule
      const priceRule = await prismaClient.priceRule.update({
        where: { id },
        data: {
          name,
          description,
          ruleType,
          adjustmentType,
          discountType,
          discountValue,
          minQuantity,
          maxQuantity,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : undefined,
          isActive,
          priority,
        },
      });

      // Update service category relations if provided
      if (serviceCategories) {
        // Delete existing relations
        await prismaClient.priceRuleServiceCategory.deleteMany({
          where: { priceRuleId: id },
        });

        // Create new relations
        if (serviceCategories.length > 0) {
          await Promise.all(
            serviceCategories.map((category: ServiceCategory) =>
              prismaClient.priceRuleServiceCategory.create({
                data: {
                  priceRuleId: priceRule.id,
                  serviceCategory: category,
                },
              })
            )
          );
        }
      }

      // Update service relations if provided
      if (services) {
        // Delete existing relations
        await prismaClient.priceRuleService.deleteMany({
          where: { priceRuleId: id },
        });

        // Create new relations
        if (services.length > 0) {
          await Promise.all(
            services.map((serviceId: string) =>
              prismaClient.priceRuleService.create({
                data: {
                  priceRuleId: priceRule.id,
                  serviceId,
                },
              })
            )
          );
        }
      }

      // Return the updated price rule with related records
      return prismaClient.priceRule.findUnique({
        where: { id: priceRule.id },
        include: {
          serviceCategories: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });
    });

    res.status(200).json({
      status: "success",
      data: updatedPriceRule,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a price rule
export const deletePriceRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if price rule exists
    const priceRuleExists = await prisma.priceRule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!priceRuleExists) {
      return next(new AppError("Price rule not found", 404));
    }

    // Delete price rule (related records will be deleted via cascade)
    await prisma.priceRule.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Calculate price with applicable discounts
export const calculatePrice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { serviceId, startDate, endDate, petCount = 1 } = req.body;

    if (!serviceId || !startDate || !endDate) {
      return next(new AppError("Missing required fields", 400));
    }

    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return next(new AppError("Service not found", 404));
    }

    const parseDateInput = (value: string) => {
      // Date-only values are interpreted inconsistently across timezones.
      // Treat them as UTC midnight so calculations are deterministic in CI/local.
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(`${value}T00:00:00.000Z`);
      }
      return new Date(value);
    };

    // Calculate base price
    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);
    const durationInDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    let basePrice = service.price * durationInDays * petCount;

    // Get applicable price rules
    const today = new Date();
    const dayOfWeek = start.getUTCDay(); // 0 = Sunday, 6 = Saturday

    const applicableRules = await prisma.priceRule.findMany({
      where: {
        isActive: true,
        OR: [
          {
            // Day of week rules
            ruleType: "DAY_OF_WEEK",
            daysOfWeek: { contains: String(dayOfWeek) },
          },
          {
            // Multi-day rules
            ruleType: "MULTI_DAY",
            minQuantity: { lte: durationInDays },
            OR: [
              { maxQuantity: { gte: durationInDays } },
              { maxQuantity: null },
            ],
          },
          {
            // Multi-pet rules
            ruleType: "MULTI_PET",
            minQuantity: { lte: petCount },
            OR: [{ maxQuantity: { gte: petCount } }, { maxQuantity: null }],
          },
          {
            // Seasonal/promotional rules
            ruleType: { in: ["SEASONAL", "PROMOTIONAL", "CUSTOM"] },
            startDate: { lte: today },
            OR: [{ endDate: { gte: today } }, { endDate: null }],
          },
        ],
        AND: [
          {
            OR: [
              {
                // Rules for specific service categories
                serviceCategories: {
                  some: {
                    serviceCategory: service.serviceCategory,
                  },
                },
              },
              {
                // Rules for specific services
                services: {
                  some: {
                    serviceId: service.id,
                  },
                },
              },
              {
                // Rules with no specific service or category (apply to all)
                serviceCategories: { none: {} },
                services: { none: {} },
              },
            ],
          },
        ],
      },
      orderBy: { priority: "desc" },
      include: {
        serviceCategories: true,
        services: true,
      },
    });

    // Apply discounts
    let appliedRules = [];
    let finalPrice = basePrice;
    const appliedRuleTypes = new Set();

    const isRuleApplicable = (rule: any) => {
      if (!rule?.isActive) return false;

      if (rule.ruleType === "DAY_OF_WEEK") {
        const rawDays = rule.daysOfWeek;
        const parsedDays: number[] = Array.isArray(rawDays)
          ? rawDays
          : typeof rawDays === "string"
          ? (() => {
              try {
                return JSON.parse(rawDays);
              } catch {
                return [];
              }
            })()
          : [];
        return parsedDays.map(Number).includes(dayOfWeek);
      }

      if (rule.ruleType === "MULTI_DAY") {
        if (rule.minQuantity != null && durationInDays < rule.minQuantity)
          return false;
        if (rule.maxQuantity != null && durationInDays > rule.maxQuantity)
          return false;
        return true;
      }

      if (rule.ruleType === "MULTI_PET") {
        if (rule.minQuantity != null && petCount < rule.minQuantity)
          return false;
        if (rule.maxQuantity != null && petCount > rule.maxQuantity)
          return false;
        return true;
      }

      if (["SEASONAL", "PROMOTIONAL", "CUSTOM"].includes(rule.ruleType)) {
        const startOk = !rule.startDate || today >= new Date(rule.startDate);
        const endOk = !rule.endDate || today <= new Date(rule.endDate);
        return startOk && endOk;
      }

      return true;
    };

    for (const rule of applicableRules) {
      if (!isRuleApplicable(rule)) {
        continue;
      }

      // Only apply one rule of each type (to prevent stacking similar discounts)
      if (appliedRuleTypes.has(rule.ruleType)) {
        continue;
      }

      let adjustmentAmount = 0;

      if (rule.discountType === "PERCENTAGE") {
        adjustmentAmount = basePrice * (rule.discountValue / 100);
      } else {
        // FIXED_AMOUNT
        adjustmentAmount = rule.discountValue;
      }

      // Apply adjustment based on type (DISCOUNT reduces, SURCHARGE increases)
      if (rule.adjustmentType === "SURCHARGE") {
        finalPrice += adjustmentAmount;
      } else {
        finalPrice -= adjustmentAmount;
      }

      appliedRuleTypes.add(rule.ruleType);

      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        adjustmentType: rule.adjustmentType,
        adjustmentAmount,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
      });
    }

    // Ensure final price is not negative
    finalPrice = Math.max(0, finalPrice);

    res.status(200).json({
      status: "success",
      data: {
        basePrice,
        finalPrice,
        discount: basePrice - finalPrice,
        durationInDays,
        petCount,
        appliedRules,
      },
    });
  } catch (error) {
    next(error);
  }
};
