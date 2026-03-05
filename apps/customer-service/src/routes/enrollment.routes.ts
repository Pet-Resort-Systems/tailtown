import { Router } from 'express';
import * as enrollmentController from '../controllers/enrollment.controller';

const router = Router();

/**
 * Enrollment Routes
 * All routes require x-tenant-id header
 */

// Enroll pet in class
router.post('/training-classes/:classId/enroll', enrollmentController.enrollInClass);

// Get enrollment by ID
router.get('/enrollments/:id', enrollmentController.getEnrollmentById);

// Update enrollment
router.put('/enrollments/:id', enrollmentController.updateEnrollment);

// Drop from class
router.put('/enrollments/:id/drop', enrollmentController.dropFromClass);

// Get customer's enrollments
router.get('/customers/:customerId/enrollments', enrollmentController.getCustomerEnrollments);

// Get pet's enrollment history
router.get('/pets/:petId/enrollments', enrollmentController.getPetEnrollments);

// Issue certificate
router.post('/enrollments/:id/certificate', enrollmentController.issueCertificate);

// Add to waitlist
router.post('/training-classes/:classId/waitlist', enrollmentController.addToWaitlist);

// Remove from waitlist
router.delete('/waitlist/:id', enrollmentController.removeFromWaitlist);

// Get class waitlist
router.get('/training-classes/:classId/waitlist', enrollmentController.getClassWaitlist);

export default router;
