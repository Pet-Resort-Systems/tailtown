import { Router } from 'express';
import {
  getAllSchedules,
  getStaffSchedules,
  createStaffSchedule,
  updateStaffSchedule,
  deleteStaffSchedule,
  bulkCreateSchedules,
} from '../controllers/staff';

const router = Router();

// Schedule Routes
router.get('/', getAllSchedules);
router.get('/staff/:staffId', getStaffSchedules);
router.post('/staff/:staffId', createStaffSchedule);
router.put('/:scheduleId', updateStaffSchedule);
router.delete('/:scheduleId', deleteStaffSchedule);
router.post('/bulk', bulkCreateSchedules);

export { router as scheduleRoutes };
