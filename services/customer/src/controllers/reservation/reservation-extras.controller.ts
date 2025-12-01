/**
 * Reservation Extras Controller
 *
 * Handles additional reservation operations:
 * - getTodayRevenue
 * - addAddOnsToReservation
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware";
import { logger } from "../../utils/logger";

const prisma = new PrismaClient();

/**
 * Get today's revenue from reservations
 */
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

    // Calculate revenue (placeholder - should use actual pricing)
    const revenue = reservations.reduce((acc, reservation) => {
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

/**
 * Add add-on services to a reservation
 */
export const addAddOnsToReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { addOns } = req.body;

    // Validate input
    if (!Array.isArray(addOns) || addOns.length === 0) {
      return next(new AppError("Add-ons must be a non-empty array", 400));
    }

    // Check if the reservation exists
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: true },
    });

    if (!reservation) {
      return next(new AppError("Reservation not found", 404));
    }

    // Process each add-on
    const addOnResults = [];
    const errors = [];

    for (const addOn of addOns) {
      try {
        const { serviceId, quantity } = addOn;

        if (!serviceId || !quantity || quantity < 1) {
          errors.push(
            `Invalid add-on data: serviceId=${serviceId}, quantity=${quantity}`
          );
          continue;
        }

        // Try to find an add-on service directly
        let addOnService = await prisma.addOnService.findUnique({
          where: { id: serviceId },
        });

        // If not found, try to find add-on services associated with this service ID
        if (!addOnService) {
          const addOnServices = await prisma.addOnService.findMany({
            where: { serviceId: serviceId },
          });

          if (addOnServices.length > 0) {
            addOnService = addOnServices[0];
          } else {
            // Check if it's a valid service ID
            const service = await prisma.service.findUnique({
              where: { id: serviceId },
            });

            if (!service) {
              errors.push(
                `Neither add-on service nor service found with ID ${serviceId}`
              );
              continue;
            }

            // Create a temporary add-on service object
            addOnService = {
              id: serviceId,
              tenantId: "dev",
              name: service.name,
              description: service.description,
              price: service.price,
              taxable: true,
              serviceId: service.id,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              duration: service.duration,
            };

            errors.push(
              `Warning: Attempting to use service ID ${serviceId} as an add-on ID`
            );
          }
        }

        if (addOnService) {
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

              addOnResults.push(reservationAddOn);
            } catch (createError) {
              logger.error("Error creating reservation add-on", {
                createError,
              });
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
        logger.error("Error processing add-on", { error });
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    // Return results
    const response = {
      success: addOnResults.length > 0,
      message:
        addOnResults.length > 0
          ? `Successfully added ${addOnResults.length} add-on(s) to the reservation`
          : "Failed to add any add-ons to the reservation",
      addOns: addOnResults,
      errors: errors.length > 0 ? errors : undefined,
    };

    return res.status(addOnResults.length > 0 ? 200 : 400).json(response);
  } catch (error) {
    logger.error("Error in addAddOnsToReservation", { error });
    return next(error);
  }
};
