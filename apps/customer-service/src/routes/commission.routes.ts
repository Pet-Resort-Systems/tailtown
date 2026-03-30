/**
 * Staff Commission Routes
 */

import { Router } from 'express';
import {
  getStaffCommissions,
  getCommissionById,
  createCommission,
  updateCommission,
  deleteCommission,
  getAllCommissions,
  calculateCommission,
  getCommissionReport,
} from '../controllers/commission.controller.js';

const router = Router();

// Get all commissions for tenant (admin view)
router.get('/', getAllCommissions);

// Calculate commission for a service
router.post('/calculate', calculateCommission);

// Get commissions for a specific staff member
router.get('/staff/:staffId', getStaffCommissions);

// Get commission report for a staff member
router.get('/staff/:staffId/report', getCommissionReport);

// Get single commission
router.get('/:id', getCommissionById);

// Create commission
router.post('/', createCommission);

// Update commission
router.put('/:id', updateCommission);

// Delete commission
router.delete('/:id', deleteCommission);

export default router;
