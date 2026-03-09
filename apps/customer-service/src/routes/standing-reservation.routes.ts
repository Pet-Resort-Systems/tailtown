/**
 * Standing Reservation Routes
 */

import { Router } from "express";
import {
  getAllStandingReservations,
  getCustomerStandingReservations,
  getStandingReservationById,
  createStandingReservation,
  updateStandingReservation,
  deleteStandingReservation,
  generateReservations,
  skipInstance,
  getUpcomingInstances,
} from "../controllers/standing-reservation.controller";

const router = Router();

// Get all standing reservations
router.get("/", getAllStandingReservations);

// Get standing reservations for a customer
router.get("/customer/:customerId", getCustomerStandingReservations);

// Get single standing reservation
router.get("/:id", getStandingReservationById);

// Create standing reservation
router.post("/", createStandingReservation);

// Update standing reservation
router.put("/:id", updateStandingReservation);

// Delete standing reservation
router.delete("/:id", deleteStandingReservation);

// Generate reservations from template
router.post("/:id/generate", generateReservations);

// Get upcoming instances
router.get("/:id/instances", getUpcomingInstances);

// Skip a specific instance
router.post("/:id/instances/:instanceId/skip", skipInstance);

export default router;
