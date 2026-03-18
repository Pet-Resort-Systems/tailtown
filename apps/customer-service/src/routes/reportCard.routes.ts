/**
 * Report Card Routes
 *
 * API routes for pet report card management
 */

import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as reportCardController from '../controllers/reportCard';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Report Card CRUD
router.post('/', reportCardController.createReportCard);
router.get('/', reportCardController.listReportCards);
router.get('/:id', reportCardController.getReportCard);
router.patch('/:id', reportCardController.updateReportCard);
router.delete('/:id', reportCardController.deleteReportCard);

// Photo Management
router.post('/:id/photos', reportCardController.uploadPhoto);
router.delete('/:id/photos/:photoId', reportCardController.deletePhoto);
router.patch('/:id/photos/:photoId', reportCardController.updatePhoto);

// Send Report Card
router.post('/:id/send', reportCardController.sendReportCard);

// Bulk Operations
router.post('/bulk', reportCardController.bulkCreateReportCards);
router.post('/bulk/send', reportCardController.bulkSendReportCards);

// Related Entity Routes
router.get(
  '/customers/:customerId',
  reportCardController.getCustomerReportCards
);
router.get('/pets/:petId', reportCardController.getPetReportCards);
router.get(
  '/reservations/:reservationId',
  reportCardController.getReservationReportCards
);

export default router;
