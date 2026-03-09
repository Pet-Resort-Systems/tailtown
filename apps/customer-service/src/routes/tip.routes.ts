import { Router } from "express";
import * as tipController from "../controllers/tip.controller";

const router = Router();

// CRUD operations
router.post("/", tipController.createTip);
router.get("/", tipController.getTips);
router.get("/:id", tipController.getTipById);
router.patch("/:id", tipController.updateTip);
router.delete("/:id", tipController.deleteTip);

// Reporting endpoints
router.get("/reports/groomer/:groomerId", tipController.getGroomerTipsSummary);
router.get("/reports/pool", tipController.getGeneralTipPoolSummary);
router.get("/reports/all-groomers", tipController.getAllGroomersTipsSummary);

export default router;
