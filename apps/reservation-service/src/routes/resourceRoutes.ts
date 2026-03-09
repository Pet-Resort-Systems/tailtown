/**
 * Resource Routes
 * 
 * This file defines the API routes for resource-related operations.
 * It implements our schema alignment strategy with defensive programming
 * and graceful error handling for potential schema mismatches.
 */

import express from 'express';
import { checkResourceAvailability } from '../controllers/resource/availability.controller';
import { batchCheckResourceAvailability } from '../controllers/resource/batch-availability.controller';
import {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourceAvailability
} from '../controllers/resource/resource.controller';

const router = express.Router();

// Health check endpoint for resource routes
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Resource routes healthy' });
});

// Resource availability routes - specific routes must come before parameterized routes
router.get('/availability', checkResourceAvailability);
// Enable batch availability endpoint
router.post('/availability/batch', batchCheckResourceAvailability);
// Add v1 version of the batch endpoint to match frontend expectations
router.post('/v1/resources/availability/batch', batchCheckResourceAvailability);

// Resource CRUD routes
router.get('/', getAllResources);
router.post('/', createResource);

// Parameterized routes must come last
router.get('/:id/availability', getResourceAvailability);
router.get('/:id', getResourceById);
router.patch('/:id', updateResource);
router.delete('/:id', deleteResource);

export default router;
