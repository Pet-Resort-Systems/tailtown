/**
 * Reservation Controllers Index
 *
 * Re-exports all reservation controller functions for backward compatibility.
 * The original reservation.controller.ts (1388 lines) has been split into:
 * - reservation-queries.controller.ts - Read operations
 * - reservation-crud.controller.ts - Create, update, delete operations
 * - reservation-extras.controller.ts - Revenue and add-ons
 * - utils/order-number.ts - Order number generation
 */

// Query Operations
export {
  getAllReservations,
  getReservationById,
  getReservationsByCustomer,
  getUpcomingReservationsByCustomer,
  getPastReservationsByCustomer,
  getReservationsByPet,
  getReservationsByDateRange,
  getReservationsByStatus,
} from './reservation-queries.controller';

// CRUD Operations
export {
  createReservation,
  updateReservation,
  deleteReservation,
} from './reservation-crud.controller';

// Extras (Revenue, Add-ons)
export {
  getTodayRevenue,
  addAddOnsToReservation,
} from './reservation-extras.controller';
