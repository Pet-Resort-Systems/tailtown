import { Router, Request, Response, NextFunction } from "express";
import {
  // Query operations
  getAllReservations,
  getReservationById,
  getReservationsByCustomer,
  getUpcomingReservationsByCustomer,
  getPastReservationsByCustomer,
  getReservationsByPet,
  getReservationsByDateRange,
  getReservationsByStatus,
  // CRUD operations
  createReservation,
  updateReservation,
  deleteReservation,
  // Extras
  getTodayRevenue,
  addAddOnsToReservation,
} from "../controllers/reservation";

const router = Router();

// Middleware to prevent browser caching of API responses
const noCacheMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
};

// Apply no-cache to all reservation routes
router.use(noCacheMiddleware);

// GET all reservations
router.get("/", getAllReservations);

// GET reservations by status
router.get("/status/:status", getReservationsByStatus);

// GET reservations by date range
router.get("/dates", getReservationsByDateRange);

// GET reservations by customer
router.get("/customer/:customerId", getReservationsByCustomer);

// GET upcoming reservations by customer (for customer portal)
router.get("/customer/:customerId/upcoming", getUpcomingReservationsByCustomer);

// GET past reservations by customer (for customer portal)
router.get("/customer/:customerId/past", getPastReservationsByCustomer);

// GET today's revenue
router.get("/revenue/today", getTodayRevenue);

// GET reservations by pet
router.get("/pet/:petId", getReservationsByPet);

// GET a single reservation by ID
router.get("/:id", getReservationById);

// POST create a new reservation
router.post("/", createReservation);

// PUT/PATCH update a reservation
router.put("/:id", updateReservation);
router.patch("/:id", updateReservation);

// POST add add-ons to a reservation
router.post("/:id/add-ons", addAddOnsToReservation);

// DELETE a reservation
router.delete("/:id", deleteReservation);

export { router as reservationRoutes };
