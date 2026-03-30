import { prisma } from '../../../config/prisma.js';
/**
 * Order Number Generator
 *
 * Generates unique order numbers for reservations in format: RES-YYYYMMDD-XXX
 */

/**
 * Generate a unique order number for a reservation
 * Format: RES-YYYYMMDD-XXX (e.g., RES-20251129-001)
 */
export async function generateOrderNumber(): Promise<string> {
  // Get the current date in YYYYMMDD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Get the count of reservations created today
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

  // Format the sequential number with leading zeros
  const sequentialNumber = String(todayReservationsCount + 1).padStart(3, '0');

  // Combine to create the order number
  const orderNumber = `RES-${datePrefix}-${sequentialNumber}`;

  // Check if this order number already exists (collision check)
  const existingReservation = await prisma.reservation.findFirst({
    where: { orderNumber },
  });

  if (existingReservation) {
    // In the unlikely case of a collision, recursively try again
    return generateOrderNumber();
  }

  return orderNumber;
}
