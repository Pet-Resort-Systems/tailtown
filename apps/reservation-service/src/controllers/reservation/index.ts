/**
 * Reservation Controller Index
 * 
 * This file re-exports all reservation controller methods for easier imports in route files.
 */

// Re-export all controller methods
export { createReservation } from './create-reservation.controller';
export { updateReservation } from './update-reservation.controller';
export { deleteReservation } from './delete-reservation.controller';
export { getAllReservations, getReservationById } from './get-reservation.controller';
export { getCustomerReservations } from './customer-reservation.controller';
export { getTodayRevenue } from './revenue.controller';
export { addAddOnsToReservation } from './add-ons.controller';
