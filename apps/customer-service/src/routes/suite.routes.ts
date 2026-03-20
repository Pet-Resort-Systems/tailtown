import express from 'express';
import * as suiteController from '../controllers/suite.controller';

export const suiteRoutes = express.Router();

// Suites management routes
suiteRoutes.get('/', suiteController.getAllSuites);
suiteRoutes.post('/initialize', suiteController.initializeSuites);
suiteRoutes.put('/:id/cleaning', suiteController.updateSuiteCleaning);
suiteRoutes.get('/stats', suiteController.getSuiteStats);
