/**
 * Reservation Controller Index
 *
 * This file re-exports all reservation controller methods for easier imports in route files.
 */

// Re-export all controller methods
export { createReservation } from './create-reservation.controller.js';
export { updateReservation } from './update-reservation.controller.js';
export { deleteReservation } from './delete-reservation.controller.js';
export {
  getAllReservations,
  getReservationById,
} from './get-reservation.controller.js';
export { getCustomerReservations } from './customer-reservation.controller.js';
export { getTodayRevenue } from './revenue.controller.js';
export { addAddOnsToReservation } from './add-ons.controller.js';
