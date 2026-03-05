import { Router } from "express";
import {
  getAllPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  getPetReservations,
  uploadPetPhoto,
  getPetsByCustomer,
  deactivatePet,
  reactivatePet,
} from "../controllers/pet.controller";

const router = Router();

// GET all pets
router.get("/", getAllPets);

// GET all pets for a customer
router.get("/customer/:customerId", getPetsByCustomer);

// GET a single pet by ID
router.get("/:id", getPetById);

// GET all reservations for a pet
router.get("/:id/reservations", getPetReservations);

// POST create a new pet
router.post("/", createPet);

// PUT update a pet
router.put("/:id", updatePet);

// POST upload a pet's photo
router.post("/:id/photo", uploadPetPhoto);

// DELETE a pet
router.delete("/:id", deletePet);

// POST deactivate a pet (soft delete - preserves history)
router.post("/:id/deactivate", deactivatePet);

// POST reactivate a pet
router.post("/:id/reactivate", reactivatePet);

export { router as petRoutes };
