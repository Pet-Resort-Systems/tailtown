import { ExtendedReservationWhereInput } from '../types/prisma-extensions';
import { prisma } from '../config/prisma';

/**
 * Generates a unique order number for a reservation in the format:
 * RES-YYYYMMDD-001
 *
 * The number is sequential within a given day and tenant
 *
 * @param tenantId The tenant ID for tenant isolation
 * @returns A unique order number string
 */
export async function generateOrderNumber(tenantId: string): Promise<string> {
  // Get the current date in YYYYMMDD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Get the count of reservations created today for this tenant to use as a sequential number
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  const todayReservationsCount = await prisma.reservation.count({
    where: {
      tenantId: tenantId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    } as ExtendedReservationWhereInput,
  });

  // Format the sequential number with leading zeros (e.g., 001, 002, etc.)
  const sequentialNumber = String(todayReservationsCount + 1).padStart(3, '0');

  // Combine to create the order number: RES-YYYYMMDD-001
  const orderNumber = `RES-${datePrefix}-${sequentialNumber}`;

  // Check if this order number already exists (just to be safe)
  const existingReservation = await prisma.reservation.findFirst({
    where: {
      orderNumber,
      tenantId: tenantId,
    } as ExtendedReservationWhereInput,
  });

  if (existingReservation) {
    // In the unlikely case of a collision, recursively try again with an incremented number
    return generateOrderNumber(tenantId);
  }

  return orderNumber;
}
