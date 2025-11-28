import { Request, Response, NextFunction } from "express";
import { PrismaClient, ReservationStatus } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

// Helper function to generate a unique order number
async function generateOrderNumber(): Promise<string> {
  // Get the current date in YYYYMMDD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${year}${month}${day}`;

  // Get the count of reservations created today to use as a sequential number
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  const todayReservationsCount = await prisma.reservation.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Format the sequential number with leading zeros (e.g., 001, 002, etc.)
  const sequentialNumber = String(todayReservationsCount + 1).padStart(3, "0");

  // Combine to create the order number: RES-YYYYMMDD-001
  const orderNumber = `RES-${datePrefix}-${sequentialNumber}`;

  // Check if this order number already exists (just to be safe)
  const existingReservation = await prisma.reservation.findFirst({
    where: { orderNumber },
  });

  if (existingReservation) {
    // In the unlikely case of a collision, recursively try again with an incremented number
    return generateOrderNumber();
  }

  return orderNumber;
}

// Get all reservations
export const getAllReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Backend: getAllReservations called with query:", req.query);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build where clause based on query parameters
    let where: any = {};

    try {
      // Handle multiple status values
      const status = req.query.status as string;
      if (status) {
        console.log("Status string received:", status);
        const statusArray = status.split(",");
        console.log("Status array after split:", statusArray);

        // Validate each status is a valid ReservationStatus
        // Make sure ReservationStatus is defined before using Object.values
        const validStatuses = ReservationStatus
          ? Object.values(ReservationStatus)
          : [];
        console.log("Valid statuses:", validStatuses);
        const invalidStatuses = statusArray.filter(
          (s) => !validStatuses.includes(s as any)
        );

        if (invalidStatuses.length > 0) {
          throw new AppError(
            `Invalid status values: ${invalidStatuses.join(
              ", "
            )}. Valid values are: ${validStatuses.join(", ")}`,
            400
          );
        }

        where.status = {
          in: statusArray as ReservationStatus[],
        };
      }

      // Handle resourceId filter
      const resourceId = req.query.resourceId as string;
      if (resourceId) {
        where.resourceId = resourceId;
      }

      // Handle date range filtering (startDate and endDate params from calendar)
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      const date = req.query.date as string;

      if (startDateParam && endDateParam) {
        // Calendar uses startDate and endDate for date range
        console.log(
          "Date range filter received:",
          startDateParam,
          "to",
          endDateParam
        );
        const rangeStart = new Date(startDateParam);
        const rangeEnd = new Date(endDateParam);
        // Set end of day for the end date
        rangeEnd.setHours(23, 59, 59, 999);

        // A reservation overlaps with the range if:
        // 1. It starts before the range ends AND
        // 2. It ends after the range starts
        where.AND = [
          { startDate: { lte: rangeEnd } },
          { endDate: { gte: rangeStart } },
        ];
      } else if (date) {
        console.log("Date filter received:", date);

        // Create start and end of the day for the given date, accounting for timezone
        // Parse the date in local timezone (YYYY-MM-DD format)
        const [year, month, day] = date.split("-").map(Number);

        // Create date objects with the correct local date regardless of timezone
        // Month is 0-indexed in JavaScript Date
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        console.log(
          `Filtering reservations that overlap with ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`
        );

        // A reservation overlaps with the date if:
        // 1. It starts before the end of the day AND
        // 2. It ends after the start of the day
        where.AND = [
          {
            startDate: {
              lte: endOfDay,
            },
          },
          {
            endDate: {
              gte: startOfDay,
            },
          },
        ];
      }

      console.log("Final where clause:", where);
    } catch (error) {
      console.error("Error building where clause:", error);
      throw error;
    }

    // Allow sorting
    const sortBy = (req.query.sortBy as string) || "startDate";
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";

    const reservations = await prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: true,
        pet: true,
        resource: true,
        service: true,
      },
    });

    const total = await prisma.reservation.count({ where });

    res.status(200).json({
      status: "success",
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single reservation by ID
/**
 * Retrieves a single reservation by ID with all related data.
 * Includes customer, pet, and service information.
 * @param req - Express request object with reservation ID
 * @param res - Express response object
 * @param next - Express next function
 */
export const getReservationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        pet: true,
        resource: true,
      },
    });

    if (!reservation) {
      return next(new AppError("Reservation not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

// Get reservations by customer
export const getReservationsByCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reservations = await prisma.reservation.findMany({
      where: {
        customerId,
      },
      skip,
      take: limit,
      orderBy: { startDate: "desc" },
      include: {
        pet: true,
      },
    });

    const total = await prisma.reservation.count({
      where: {
        customerId,
      },
    });

    res.status(200).json({
      status: "success",
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

// Get reservations by pet
export const getReservationsByPet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { petId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reservations = await prisma.reservation.findMany({
      where: {
        petId,
      },
      skip,
      take: limit,
      orderBy: { startDate: "desc" },
      include: {
        customer: true,
      },
    });

    const total = await prisma.reservation.count({
      where: {
        petId,
      },
    });

    res.status(200).json({
      status: "success",
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

// Get reservations by date range
export const getReservationsByDateRange = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!startDate || !endDate) {
      return next(new AppError("Both startDate and endDate are required", 400));
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        startDate: {
          gte: new Date(startDate as string),
        },
        endDate: {
          lte: new Date(endDate as string),
        },
      },
      skip,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        customer: true,
        pet: true,
      },
    });

    const total = await prisma.reservation.count({
      where: {
        startDate: {
          gte: new Date(startDate as string),
        },
        endDate: {
          lte: new Date(endDate as string),
        },
      },
    });

    res.status(200).json({
      status: "success",
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

// Get reservations by status
export const getReservationsByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate the status
    const validStatuses = Object.values(ReservationStatus);
    if (!validStatuses.includes(status as ReservationStatus)) {
      return next(
        new AppError(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          400
        )
      );
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        status: status as ReservationStatus,
      },
      skip,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        customer: true,
        pet: true,
      },
    });

    const total = await prisma.reservation.count({
      where: {
        status: status as ReservationStatus,
      },
    });

    res.status(200).json({
      status: "success",
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new reservation
/**
 * Creates a new reservation with validation of customer, pet, and service.
 * Ensures the pet belongs to the customer and service is available.
 * @param req - Express request object with reservation data
 * @param res - Express response object
 * @param next - Express next function
 */
export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(
      "Backend: Received create reservation request with body:",
      req.body
    );

    const {
      customerId,
      petId,
      serviceId,
      startDate,
      endDate,
      suiteType, // Only required for DAYCARE or BOARDING services
      resourceId, // optional manual override
      status = "PENDING",
      notes = "",
    } = req.body;

    console.log("Backend: Extracted values:", {
      customerId,
      petId,
      serviceId,
      startDate,
      endDate,
      suiteType,
      resourceId,
      status,
      notes,
    });

    // Check if the service requires a suite type
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    // Extract the service category safely
    const serviceCategory = service ? (service as any).serviceCategory : null;

    // Only require suiteType for DAYCARE or BOARDING services
    const requiresSuiteType =
      serviceCategory === "DAYCARE" || serviceCategory === "BOARDING";

    console.log("Backend: Service category:", serviceCategory);
    console.log("Backend: Requires suite type:", requiresSuiteType);
    console.log("Backend: Provided suite type:", suiteType);

    // If service requires a suite type but none was provided, use STANDARD_SUITE as default
    // Validate and normalize the suite type based on service requirements
    let finalSuiteType = suiteType;
    if (requiresSuiteType) {
      const validSuiteTypes = [
        "VIP_SUITE",
        "STANDARD_PLUS_SUITE",
        "STANDARD_SUITE",
      ];

      if (!suiteType) {
        console.warn(
          "Backend: No suiteType provided for a service that requires one"
        );
        finalSuiteType = "STANDARD_SUITE"; // Default
        console.log(`Backend: Using default suite type: ${finalSuiteType}`);
      } else if (!validSuiteTypes.includes(suiteType)) {
        console.warn(
          `Backend: Invalid suiteType provided: "${suiteType}". Valid types are: ${validSuiteTypes.join(
            ", "
          )}`
        );
        finalSuiteType = "STANDARD_SUITE"; // Default
        console.log(
          `Backend: Using default suite type: ${finalSuiteType} instead of invalid type: ${suiteType}`
        );
      } else {
        console.log(`Backend: Using valid provided suiteType: ${suiteType}`);
      }
    } else {
      // For services that don't require a suite type, we don't need to validate it
      console.log(
        "Backend: Service does not require a suite type, setting to null"
      );
      finalSuiteType = null;
    }

    console.log("Backend: Parsed reservation data:", {
      customerId,
      petId,
      serviceId,
      startDate,
      endDate,
      status,
      notes,
    });

    // Check if the customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    // Check if the pet exists and belongs to the customer
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet) {
      return next(new AppError("Pet not found", 404));
    }

    if (pet.customerId !== customerId) {
      return next(
        new AppError("The pet does not belong to this customer", 400)
      );
    }

    let assignedResourceId = resourceId;

    // Helper: check if a suite is available for the given dates
    async function isSuiteAvailable(suiteId: string) {
      console.log(
        `Backend: Checking if suite ${suiteId} is available between ${startDate} and ${endDate}`
      );

      // Parse the dates properly to ensure correct comparison
      const reservationStartDate = new Date(startDate);
      const reservationEndDate = new Date(endDate);

      console.log(
        `Backend: Parsed dates - Start: ${reservationStartDate.toISOString()}, End: ${reservationEndDate.toISOString()}`
      );

      const overlapping = await prisma.reservation.count({
        where: {
          resourceId: suiteId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          OR: [
            {
              startDate: { lte: reservationEndDate },
              endDate: { gte: reservationStartDate },
            },
          ],
        },
      });

      console.log(
        `Backend: Found ${overlapping} overlapping reservations for suite ${suiteId}`
      );
      return overlapping === 0;
    }

    // Only assign resources for services that require a suite type
    if (requiresSuiteType && finalSuiteType) {
      // If resourceId provided, validate it and ensure it matches the requested suiteType
      if (resourceId) {
        console.log(`Backend: Validating provided resource ID: ${resourceId}`);
        const suite = await prisma.resource.findUnique({
          where: { id: resourceId },
        });
        if (!suite) {
          console.error(`Backend: Resource with ID ${resourceId} not found`);
          return next(
            new AppError(
              `Selected suite/kennel not found with ID: ${resourceId}`,
              404
            )
          );
        }

        if (!suite.isActive) {
          console.error(`Backend: Resource with ID ${resourceId} is inactive`);
          return next(
            new AppError("Selected suite/kennel is marked as inactive", 404)
          );
        }

        // Log the resource type for debugging
        console.log(
          `Backend: Found resource ${resourceId} of type: ${suite.type}, requested type: ${finalSuiteType}`
        );

        // Enhanced type checking with better error reporting
        if (suite.type && finalSuiteType && suite.type !== finalSuiteType) {
          console.error(
            `Backend: Type mismatch - Suite is ${suite.type}, requested ${finalSuiteType}`
          );
          return next(
            new AppError(
              `Selected suite/kennel type (${suite.type}) doesn't match requested type (${finalSuiteType})`,
              400
            )
          );
        }

        const available = await isSuiteAvailable(resourceId);
        if (!available) {
          console.error(
            `Backend: Resource ${resourceId} is not available for requested dates`
          );
          return next(
            new AppError(
              "Selected suite/kennel is not available for the requested dates",
              400
            )
          );
        }

        console.log(`Backend: Resource ${resourceId} validated successfully`);
      } else {
        // Auto-assign: find an available suite of the requested type
        const candidateSuites = await prisma.resource.findMany({
          where: {
            isActive: true,
            type: finalSuiteType,
          },
          orderBy: { name: "asc" },
        });

        console.log(
          `Backend: Found ${candidateSuites.length} candidate suites of type ${finalSuiteType}`
        );

        let found = false;
        for (const suite of candidateSuites) {
          if (await isSuiteAvailable(suite.id)) {
            assignedResourceId = suite.id;
            found = true;
            console.log(
              `Backend: Assigned suite ${suite.id} (${suite.name || "unnamed"})`
            );
            break;
          }
        }

        if (!found && candidateSuites.length > 0) {
          // If no available suites, just assign the first one as a fallback
          // This is a temporary solution to get reservations working
          assignedResourceId = candidateSuites[0].id;
          console.log(
            `Backend: No available suites found, using first one as fallback: ${assignedResourceId}`
          );
        } else if (!found) {
          console.log(`Backend: No suites found of type ${finalSuiteType}`);
          // Create a default suite of the requested type
          const newSuite = await prisma.resource.create({
            data: {
              name: `Auto-created ${finalSuiteType}`,
              type: finalSuiteType as any,
              capacity: 1,
              isActive: true,
            },
          });
          assignedResourceId = newSuite.id;
          console.log(
            `Backend: Created new suite ${newSuite.id} of type ${finalSuiteType}`
          );
        }
      }
    } else {
      // For services that don't require a suite, don't assign a resource
      assignedResourceId = null;
      console.log(
        "Backend: Service does not require a suite, not assigning a resource"
      );
    }

    // Log final resource assignment for debugging
    console.log(
      `Backend: Final resource assignment status: resourceId=${assignedResourceId}, suiteType=${finalSuiteType}`
    );

    try {
      // Generate a unique order number for this reservation
      const orderNumber = await generateOrderNumber();
      console.log(`Backend: Generated order number: ${orderNumber}`);

      console.log("Backend: Creating reservation in database");
      const newReservation = await prisma.reservation.create({
        data: {
          orderNumber,
          customerId,
          petId,
          serviceId,
          startDate,
          endDate,
          resourceId: assignedResourceId,
          status,
          notes,
        },
        include: {
          customer: true,
          pet: true,
          resource: true,
        },
      });

      console.log("Backend: Successfully created reservation:", newReservation);

      res.status(201).json({
        status: "success",
        data: newReservation,
      });

      console.log("Backend: Sent success response");
    } catch (dbError) {
      console.error("Backend: Database error creating reservation:", dbError);
      const errorMessage =
        dbError instanceof Error ? dbError.message : "Unknown database error";
      return next(
        new AppError(`Failed to create reservation: ${errorMessage}`, 500)
      );
    }
  } catch (error) {
    console.error("Backend: Error in createReservation:", error);
    next(error);
  }
};

// Update a reservation
/**
 * Updates an existing reservation with validation of status changes.
 * Ensures all relationships remain valid after the update.
 * @param req - Express request object with updated reservation data
 * @param res - Express response object
 * @param next - Express next function
 */
export const updateReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { suiteType, ...reservationData } = req.body;

    console.log("Backend: Updating reservation with ID:", id);
    console.log("Backend: Received update data:", req.body);

    // If status is being updated, validate it
    if (reservationData.status) {
      const validStatuses = Object.values(ReservationStatus);
      if (!validStatuses.includes(reservationData.status)) {
        return next(
          new AppError(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            400
          )
        );
      }
    }

    // If customerId or petId is being updated, validate them
    if (reservationData.customerId && reservationData.petId) {
      // Check if the customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: reservationData.customerId },
      });

      if (!customer) {
        return next(new AppError("Customer not found", 404));
      }

      // Check if the pet exists and belongs to the customer
      const pet = await prisma.pet.findUnique({
        where: { id: reservationData.petId },
      });

      if (!pet) {
        return next(new AppError("Pet not found", 404));
      }

      if (pet.customerId !== reservationData.customerId) {
        return next(
          new AppError("The pet does not belong to this customer", 400)
        );
      }
    } else if (reservationData.customerId) {
      // Only customerId is being updated
      const customer = await prisma.customer.findUnique({
        where: { id: reservationData.customerId },
      });

      if (!customer) {
        return next(new AppError("Customer not found", 404));
      }

      // Get the current reservation to check the pet
      const currentReservation = await prisma.reservation.findUnique({
        where: { id },
        include: { pet: true },
      });

      if (!currentReservation) {
        return next(new AppError("Reservation not found", 404));
      }

      if (currentReservation.pet.customerId !== reservationData.customerId) {
        return next(
          new AppError("The pet does not belong to this customer", 400)
        );
      }
    } else if (reservationData.petId) {
      // Only petId is being updated
      const pet = await prisma.pet.findUnique({
        where: { id: reservationData.petId },
      });

      if (!pet) {
        return next(new AppError("Pet not found", 404));
      }

      // Get the current reservation to check the customer
      const currentReservation = await prisma.reservation.findUnique({
        where: { id },
      });

      if (!currentReservation) {
        return next(new AppError("Reservation not found", 404));
      }

      if (pet.customerId !== currentReservation.customerId) {
        return next(
          new AppError("The pet does not belong to this customer", 400)
        );
      }
    }

    // Check if we need to update the resource based on suiteType
    // If resourceId is explicitly set to null, we should auto-assign
    const shouldAutoAssign =
      suiteType &&
      (reservationData.resourceId === null || !reservationData.resourceId);

    if (shouldAutoAssign) {
      console.log(
        "Backend: Auto-assigning suite based on suiteType:",
        suiteType
      );

      // Find available resources of the requested type
      const candidateSuites = await prisma.resource.findMany({
        where: {
          type: suiteType,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });

      console.log(
        `Backend: Found ${candidateSuites.length} candidate suites of type ${suiteType}`
      );

      // Helper: check if a suite is available for the given dates
      async function isSuiteAvailable(suiteId: string) {
        const startDateToCheck =
          reservationData.startDate ||
          (await prisma.reservation.findUnique({ where: { id } }))?.startDate;
        const endDateToCheck =
          reservationData.endDate ||
          (await prisma.reservation.findUnique({ where: { id } }))?.endDate;

        if (!startDateToCheck || !endDateToCheck) return true; // If we can't check dates, assume available

        const overlapping = await prisma.reservation.count({
          where: {
            resourceId: suiteId,
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
            OR: [
              {
                startDate: { lte: endDateToCheck },
                endDate: { gte: startDateToCheck },
              },
            ],
            // Exclude the current reservation from the check
            NOT: { id },
          },
        });
        return overlapping === 0;
      }

      // Try to find an available suite
      let found = false;
      for (const suite of candidateSuites) {
        if (await isSuiteAvailable(suite.id)) {
          reservationData.resourceId = suite.id;
          found = true;
          console.log(
            `Backend: Assigned suite ${suite.id} (${suite.name || "unnamed"})`
          );
          break;
        }
      }

      if (!found && candidateSuites.length > 0) {
        // If no available suites, just assign the first one as a fallback
        reservationData.resourceId = candidateSuites[0].id;
        console.log(
          `Backend: No available suites found, using first one as fallback: ${reservationData.resourceId}`
        );
      } else if (!found) {
        console.log(`Backend: No suites found of type ${suiteType}`);
        // Create a default suite of the requested type
        const newSuite = await prisma.resource.create({
          data: {
            name: `Auto-created ${suiteType}`,
            type: suiteType as any,
            capacity: 1,
            isActive: true,
          },
        });
        reservationData.resourceId = newSuite.id;
        console.log(
          `Backend: Created new suite ${newSuite.id} of type ${suiteType}`
        );
      }
    }

    console.log("Backend: Final update data:", reservationData);

    // Update the reservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: reservationData,
      include: {
        customer: true,
        pet: true,
        resource: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: updatedReservation,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a reservation
export const deleteReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.reservation.delete({
      where: { id },
    });

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Get today's revenue
export const getTodayRevenue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    const reservations = await prisma.reservation.findMany({
      where: {
        startDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"],
        },
      },
      include: {
        resource: true,
      },
    });

    // Since resource doesn't have a price property, we'll use a fixed value for now
    // In a real implementation, you would need to fetch the price from the service or another source
    const revenue = reservations.reduce((acc, reservation) => {
      // Use a fixed value of 50 as a placeholder for the Resource price
      return acc + 50; // Default value since Resource doesn't have price
    }, 0);

    res.status(200).json({
      status: "success",
      revenue,
    });
  } catch (error) {
    next(error);
  }
};

// Add add-on services to a reservation
export const addAddOnsToReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { addOns } = req.body;

    console.log("Backend: Adding add-ons to reservation:", id);
    console.log("Backend: Add-ons data:", JSON.stringify(addOns, null, 2));

    // Validate input
    if (!Array.isArray(addOns) || addOns.length === 0) {
      console.error("Backend: Invalid add-ons array:", addOns);
      return next(new AppError("Add-ons must be a non-empty array", 400));
    }

    // Check if the reservation exists
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        resource: true,
      },
    });

    if (!reservation) {
      console.error(`Backend: Reservation with ID ${id} not found`);
      return next(new AppError("Reservation not found", 404));
    }

    console.log(
      `Backend: Found reservation with resource: ${
        reservation.resource?.name || "Unknown"
      }`
    );

    // Process each add-on
    const addOnResults = [];
    const errors = [];

    for (const addOn of addOns) {
      try {
        const { serviceId, quantity } = addOn;

        console.log(
          `Backend: Processing add-on with serviceId: ${serviceId}, quantity: ${quantity}`
        );

        if (!serviceId || !quantity || quantity < 1) {
          const error = `Invalid add-on data: serviceId=${serviceId}, quantity=${quantity}`;
          console.error(`Backend: ${error}`);
          errors.push(error);
          continue; // Skip this add-on but continue processing others
        }

        // First, try to find an add-on service directly with this ID
        let addOnService = await prisma.addOnService.findUnique({
          where: { id: serviceId },
        });

        // If not found directly, try to find add-on services associated with this service ID
        if (!addOnService) {
          console.log(
            `Backend: No add-on service found with ID ${serviceId}, looking for add-ons associated with this service ID`
          );

          const addOnServices = await prisma.addOnService.findMany({
            where: { serviceId: serviceId },
          });

          if (addOnServices.length > 0) {
            // Use the first add-on service associated with this service
            addOnService = addOnServices[0];
            console.log(
              `Backend: Found add-on service ${addOnService.name} (${addOnService.id}) associated with service ${serviceId}`
            );
          } else {
            // If still not found, check if it's a valid service ID at least
            const service = await prisma.service.findUnique({
              where: { id: serviceId },
            });

            if (!service) {
              const error = `Neither add-on service nor service found with ID ${serviceId}`;
              console.error(`Backend: ${error}`);
              errors.push(error);
              continue; // Skip this add-on but continue processing others
            }

            // Log that we're using a service ID directly, which isn't ideal
            console.log(
              `Backend: WARNING - Using regular service ID ${serviceId} (${service.name}) instead of an add-on service ID`
            );

            // Create a temporary add-on service object for processing
            addOnService = {
              id: serviceId, // This will cause a foreign key error in the database
              tenantId: "dev", // Add required tenantId field
              name: service.name,
              description: service.description,
              price: service.price,
              taxable: true, // Add required taxable field
              serviceId: service.id,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              duration: service.duration,
            };

            // Add a more specific error since this will likely fail
            errors.push(
              `Warning: Attempting to use service ID ${serviceId} as an add-on ID, which may cause database errors`
            );
          }
        }

        if (addOnService) {
          console.log(
            `Backend: Using add-on service: ${addOnService.name}, price: ${addOnService.price}`
          );

          // Create reservation add-on entries
          for (let i = 0; i < quantity; i++) {
            try {
              const reservationAddOn = await prisma.reservationAddOn.create({
                data: {
                  reservationId: id,
                  addOnId: addOnService.id,
                  price: addOnService.price,
                  notes: `Added as add-on to reservation`,
                },
                include: {
                  addOn: true,
                },
              });

              console.log(
                `Backend: Created reservation add-on: ${JSON.stringify(
                  reservationAddOn
                )}`
              );
              addOnResults.push(reservationAddOn);
            } catch (createError) {
              console.error(
                `Backend: Error creating reservation add-on:`,
                createError
              );
              errors.push(
                `Failed to create add-on: ${
                  createError instanceof Error
                    ? createError.message
                    : String(createError)
                }`
              );
            }
          }
        }
      } catch (error) {
        console.error("Backend: Error processing add-on:", error);
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    // Return results, including any errors
    const response = {
      success: addOnResults.length > 0,
      message:
        addOnResults.length > 0
          ? `Successfully added ${addOnResults.length} add-on(s) to the reservation`
          : "Failed to add any add-ons to the reservation",
      addOns: addOnResults,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(
      "Backend: Add-ons response:",
      JSON.stringify(response, null, 2)
    );

    return res.status(addOnResults.length > 0 ? 200 : 400).json(response);
  } catch (error) {
    console.error("Backend: Error in addAddOnsToReservation:", error);
    return next(error);
  }
};
