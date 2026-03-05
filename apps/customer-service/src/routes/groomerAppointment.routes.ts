import { Router } from 'express';
import * as groomerAppointmentController from '../controllers/groomerAppointment.controller';

const router = Router();

/**
 * Groomer Appointment Routes
 * All routes require x-tenant-id header
 */

// Get all groomer appointments (with filters)
router.get('/groomer-appointments', groomerAppointmentController.getAllGroomerAppointments);

// Get groomer appointment by ID
router.get('/groomer-appointments/:id', groomerAppointmentController.getGroomerAppointmentById);

// Create groomer appointment
router.post('/groomer-appointments', groomerAppointmentController.createGroomerAppointment);

// Update groomer appointment
router.put('/groomer-appointments/:id', groomerAppointmentController.updateGroomerAppointment);

// Reassign appointment to different groomer
router.put('/groomer-appointments/:id/reassign', groomerAppointmentController.reassignGroomerAppointment);

// Start appointment (mark as in progress)
router.post('/groomer-appointments/:id/start', groomerAppointmentController.startGroomerAppointment);

// Complete appointment
router.post('/groomer-appointments/:id/complete', groomerAppointmentController.completeGroomerAppointment);

// Cancel appointment
router.post('/groomer-appointments/:id/cancel', groomerAppointmentController.cancelGroomerAppointment);

// Delete appointment
router.delete('/groomer-appointments/:id', groomerAppointmentController.deleteGroomerAppointment);

// Get groomer's schedule for date range
router.get('/groomers/:groomerId/schedule', groomerAppointmentController.getGroomerSchedule);

// Get available groomers for specific date/time
router.get('/groomers/available', groomerAppointmentController.getAvailableGroomers);

export default router;
