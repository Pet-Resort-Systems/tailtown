import { Router } from "express";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerPets,
  getCustomerInvoices,
} from "../controllers/customer";

const router = Router();

// GET all customers
router.get("/", getAllCustomers);

// GET a single customer by ID
router.get("/:id", getCustomerById);

// GET all pets for a customer
router.get("/:id/pets", getCustomerPets);

// GET all invoices for a customer
router.get("/:id/invoices", getCustomerInvoices);

// POST create a new customer
router.post("/", createCustomer);

// PUT update a customer
router.put("/:id", updateCustomer);

// DELETE a customer
router.delete("/:id", deleteCustomer);

export { router as customerRoutes };
