// @ts-nocheck
/**
 * Tests for reservation.routes.ts
 *
 * Tests the reservation API routes configuration.
 */

import express from "express";
import request from "supertest";

// Mock all controller functions
jest.mock("../../controllers/reservation", () => ({
  getAllReservations: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getReservationById: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  createReservation: jest.fn((req, res) =>
    res.status(201).json({ status: "success", data: {} })
  ),
  updateReservation: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  deleteReservation: jest.fn((req, res) => res.status(204).send()),
  getCustomerReservations: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getTodayRevenue: jest.fn((req, res) =>
    res.json({ status: "success", data: { revenue: 0 } })
  ),
  addAddOnsToReservation: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
}));

import reservationRoutes from "../../routes/reservation.routes";
import {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
  getCustomerReservations,
  getTodayRevenue,
  addAddOnsToReservation,
} from "../../controllers/reservation";

describe("Reservation Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/reservations", reservationRoutes);
  });

  describe("Health check", () => {
    it("GET /api/reservations/health should return OK", async () => {
      const response = await request(app).get("/api/reservations/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("OK");
      expect(response.body.message).toBe("Reservation routes healthy");
    });
  });

  describe("GET /api/reservations", () => {
    it("should call getAllReservations controller", async () => {
      await request(app).get("/api/reservations");

      expect(getAllReservations).toHaveBeenCalled();
    });

    it("should return success response", async () => {
      const response = await request(app).get("/api/reservations");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    });
  });

  describe("GET /api/reservations/:id", () => {
    it("should call getReservationById controller", async () => {
      await request(app).get("/api/reservations/res-123");

      expect(getReservationById).toHaveBeenCalled();
    });

    it("should pass reservation ID in params", async () => {
      await request(app).get("/api/reservations/res-456");

      expect(getReservationById).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ id: "res-456" }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("POST /api/reservations", () => {
    it("should call createReservation controller", async () => {
      await request(app)
        .post("/api/reservations")
        .send({ customerId: "cust-1", petId: "pet-1" });

      expect(createReservation).toHaveBeenCalled();
    });

    it("should return 201 on success", async () => {
      const response = await request(app)
        .post("/api/reservations")
        .send({ customerId: "cust-1", petId: "pet-1" });

      expect(response.status).toBe(201);
    });
  });

  describe("PATCH /api/reservations/:id", () => {
    it("should call updateReservation controller", async () => {
      await request(app)
        .patch("/api/reservations/res-123")
        .send({ status: "CONFIRMED" });

      expect(updateReservation).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/reservations/:id", () => {
    it("should call deleteReservation controller", async () => {
      await request(app).delete("/api/reservations/res-123");

      expect(deleteReservation).toHaveBeenCalled();
    });

    it("should return 204 on success", async () => {
      const response = await request(app).delete("/api/reservations/res-123");

      expect(response.status).toBe(204);
    });
  });

  describe("GET /api/reservations/customer/:customerId", () => {
    it("should call getCustomerReservations controller", async () => {
      await request(app).get("/api/reservations/customer/cust-123");

      expect(getCustomerReservations).toHaveBeenCalled();
    });

    it("should pass customer ID in params", async () => {
      await request(app).get("/api/reservations/customer/cust-456");

      expect(getCustomerReservations).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ customerId: "cust-456" }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("GET /api/reservations/revenue/today", () => {
    it("should call getTodayRevenue controller", async () => {
      await request(app).get("/api/reservations/revenue/today");

      expect(getTodayRevenue).toHaveBeenCalled();
    });
  });

  describe("POST /api/reservations/:id/add-ons", () => {
    it("should call addAddOnsToReservation controller", async () => {
      await request(app)
        .post("/api/reservations/res-123/add-ons")
        .send({ addOns: [{ serviceId: "addon-1" }] });

      expect(addAddOnsToReservation).toHaveBeenCalled();
    });
  });

  describe("Route ordering", () => {
    it("should route /customer/:customerId before /:id", async () => {
      await request(app).get("/api/reservations/customer/cust-123");

      expect(getCustomerReservations).toHaveBeenCalled();
      expect(getReservationById).not.toHaveBeenCalled();
    });

    it("should route /revenue/today before /:id", async () => {
      await request(app).get("/api/reservations/revenue/today");

      expect(getTodayRevenue).toHaveBeenCalled();
      expect(getReservationById).not.toHaveBeenCalled();
    });

    it("should route /health before /:id", async () => {
      const response = await request(app).get("/api/reservations/health");

      expect(response.body.status).toBe("OK");
      expect(getReservationById).not.toHaveBeenCalled();
    });
  });
});
