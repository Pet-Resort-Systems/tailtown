// @ts-nocheck
/**
 * Tests for check-in.routes.ts
 *
 * Tests the check-in, template, and service agreement API routes.
 */

import express from "express";
import request from "supertest";

// Mock all controller functions
jest.mock("../../controllers/check-in-template.controller", () => ({
  getAllTemplates: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getTemplateById: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  getDefaultTemplate: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  createTemplate: jest.fn((req, res) =>
    res.status(201).json({ status: "success", data: {} })
  ),
  updateTemplate: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  deleteTemplate: jest.fn((req, res) => res.status(204).send()),
  cloneTemplate: jest.fn((req, res) =>
    res.status(201).json({ status: "success", data: {} })
  ),
}));

jest.mock("../../controllers/check-in.controller", () => ({
  getAllCheckIns: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getCheckInById: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  createCheckIn: jest.fn((req, res) =>
    res.status(201).json({ status: "success", data: {} })
  ),
  updateCheckIn: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  addMedication: jest.fn((req, res) =>
    res.status(201).json({ status: "success", data: {} })
  ),
  updateMedication: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  deleteMedication: jest.fn((req, res) => res.status(204).send()),
  returnBelonging: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
}));

jest.mock("../../controllers/service-agreement.controller", () => ({
  getAllTemplates: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getTemplateById: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  getDefaultTemplate: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  createTemplate: jest.fn((req, res) =>
    res.status(201).json({ status: "success", data: {} })
  ),
  updateTemplate: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  deleteTemplate: jest.fn((req, res) => res.status(204).send()),
  createAgreement: jest.fn((req, res) =>
    res.status(201).json({ status: "success", data: {} })
  ),
  getAllAgreements: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getAgreementByCheckIn: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  getAgreementsByCustomer: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  checkCustomerAgreement: jest.fn((req, res) =>
    res.json({ status: "success", data: { hasValidAgreement: false } })
  ),
  getAgreementById: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  invalidateAgreement: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  getTemplateVersions: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getTemplateVersion: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
}));

import checkInRoutes from "../../routes/check-in.routes";
import * as checkInTemplateController from "../../controllers/check-in-template.controller";
import * as checkInController from "../../controllers/check-in.controller";
import * as serviceAgreementController from "../../controllers/service-agreement.controller";

describe("Check-In Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api", checkInRoutes);
  });

  describe("Check-In Template Routes", () => {
    it("GET /api/check-in-templates should call getAllTemplates", async () => {
      await request(app).get("/api/check-in-templates");
      expect(checkInTemplateController.getAllTemplates).toHaveBeenCalled();
    });

    it("GET /api/check-in-templates/default should call getDefaultTemplate", async () => {
      await request(app).get("/api/check-in-templates/default");
      expect(checkInTemplateController.getDefaultTemplate).toHaveBeenCalled();
    });

    it("GET /api/check-in-templates/:id should call getTemplateById", async () => {
      await request(app).get("/api/check-in-templates/template-123");
      expect(checkInTemplateController.getTemplateById).toHaveBeenCalled();
    });

    it("POST /api/check-in-templates should call createTemplate", async () => {
      await request(app)
        .post("/api/check-in-templates")
        .send({ name: "New Template" });
      expect(checkInTemplateController.createTemplate).toHaveBeenCalled();
    });

    it("PUT /api/check-in-templates/:id should call updateTemplate", async () => {
      await request(app)
        .put("/api/check-in-templates/template-123")
        .send({ name: "Updated Template" });
      expect(checkInTemplateController.updateTemplate).toHaveBeenCalled();
    });

    it("DELETE /api/check-in-templates/:id should call deleteTemplate", async () => {
      await request(app).delete("/api/check-in-templates/template-123");
      expect(checkInTemplateController.deleteTemplate).toHaveBeenCalled();
    });

    it("POST /api/check-in-templates/:id/clone should call cloneTemplate", async () => {
      await request(app).post("/api/check-in-templates/template-123/clone");
      expect(checkInTemplateController.cloneTemplate).toHaveBeenCalled();
    });
  });

  describe("Check-In Routes", () => {
    it("GET /api/check-ins should call getAllCheckIns", async () => {
      await request(app).get("/api/check-ins");
      expect(checkInController.getAllCheckIns).toHaveBeenCalled();
    });

    it("GET /api/check-ins/:id should call getCheckInById", async () => {
      await request(app).get("/api/check-ins/checkin-123");
      expect(checkInController.getCheckInById).toHaveBeenCalled();
    });

    it("POST /api/check-ins should call createCheckIn", async () => {
      await request(app)
        .post("/api/check-ins")
        .send({ reservationId: "res-123" });
      expect(checkInController.createCheckIn).toHaveBeenCalled();
    });

    it("PUT /api/check-ins/:id should call updateCheckIn", async () => {
      await request(app)
        .put("/api/check-ins/checkin-123")
        .send({ status: "COMPLETED" });
      expect(checkInController.updateCheckIn).toHaveBeenCalled();
    });
  });

  describe("Medication Routes", () => {
    it("POST /api/check-ins/:id/medications should call addMedication", async () => {
      await request(app)
        .post("/api/check-ins/checkin-123/medications")
        .send({ name: "Medication", dosage: "10mg" });
      expect(checkInController.addMedication).toHaveBeenCalled();
    });

    it("PUT /api/check-ins/:checkInId/medications/:medicationId should call updateMedication", async () => {
      await request(app)
        .put("/api/check-ins/checkin-123/medications/med-456")
        .send({ dosage: "20mg" });
      expect(checkInController.updateMedication).toHaveBeenCalled();
    });

    it("DELETE /api/check-ins/:checkInId/medications/:medicationId should call deleteMedication", async () => {
      await request(app).delete(
        "/api/check-ins/checkin-123/medications/med-456"
      );
      expect(checkInController.deleteMedication).toHaveBeenCalled();
    });
  });

  describe("Belonging Routes", () => {
    it("PUT /api/check-ins/:checkInId/belongings/:belongingId/return should call returnBelonging", async () => {
      await request(app).put(
        "/api/check-ins/checkin-123/belongings/belong-456/return"
      );
      expect(checkInController.returnBelonging).toHaveBeenCalled();
    });
  });

  describe("Service Agreement Template Routes", () => {
    it("GET /api/service-agreement-templates should call getAllTemplates", async () => {
      await request(app).get("/api/service-agreement-templates");
      expect(serviceAgreementController.getAllTemplates).toHaveBeenCalled();
    });

    it("GET /api/service-agreement-templates/default should call getDefaultTemplate", async () => {
      await request(app).get("/api/service-agreement-templates/default");
      expect(serviceAgreementController.getDefaultTemplate).toHaveBeenCalled();
    });

    it("GET /api/service-agreement-templates/:id should call getTemplateById", async () => {
      await request(app).get("/api/service-agreement-templates/template-123");
      expect(serviceAgreementController.getTemplateById).toHaveBeenCalled();
    });

    it("POST /api/service-agreement-templates should call createTemplate", async () => {
      await request(app)
        .post("/api/service-agreement-templates")
        .send({ name: "Agreement Template" });
      expect(serviceAgreementController.createTemplate).toHaveBeenCalled();
    });

    it("PUT /api/service-agreement-templates/:id should call updateTemplate", async () => {
      await request(app)
        .put("/api/service-agreement-templates/template-123")
        .send({ name: "Updated Agreement" });
      expect(serviceAgreementController.updateTemplate).toHaveBeenCalled();
    });

    it("DELETE /api/service-agreement-templates/:id should call deleteTemplate", async () => {
      await request(app).delete(
        "/api/service-agreement-templates/template-123"
      );
      expect(serviceAgreementController.deleteTemplate).toHaveBeenCalled();
    });
  });

  describe("Service Agreement Routes", () => {
    it("POST /api/service-agreements should call createAgreement", async () => {
      await request(app).post("/api/service-agreements").send({
        checkInId: "checkin-123",
        signature: "data:image/png;base64,...",
      });
      expect(serviceAgreementController.createAgreement).toHaveBeenCalled();
    });

    it("GET /api/service-agreements/check-in/:checkInId should call getAgreementByCheckIn", async () => {
      await request(app).get("/api/service-agreements/check-in/checkin-123");
      expect(
        serviceAgreementController.getAgreementByCheckIn
      ).toHaveBeenCalled();
    });
  });
});
