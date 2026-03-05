import { Router } from 'express';
import * as trainingClassController from '../controllers/trainingClass.controller';

const router = Router();

/**
 * Training Class Routes
 * All routes require x-tenant-id header
 */

// Get all training classes (with filters)
router.get('/training-classes', trainingClassController.getAllTrainingClasses);

// Get training class by ID
router.get('/training-classes/:id', trainingClassController.getTrainingClassById);

// Create training class
router.post('/training-classes', trainingClassController.createTrainingClass);

// Update training class
router.put('/training-classes/:id', trainingClassController.updateTrainingClass);

// Delete training class
router.delete('/training-classes/:id', trainingClassController.deleteTrainingClass);

// Duplicate training class for next session
router.post('/training-classes/:id/duplicate', trainingClassController.duplicateTrainingClass);

// Get class sessions
router.get('/training-classes/:classId/sessions', trainingClassController.getClassSessions);

// Update class session
router.put('/sessions/:id', trainingClassController.updateClassSession);

// Start class session
router.post('/sessions/:id/start', trainingClassController.startClassSession);

// Complete class session
router.post('/sessions/:id/complete', trainingClassController.completeClassSession);

export default router;
