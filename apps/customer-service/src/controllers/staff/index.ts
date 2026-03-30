/**
 * Staff Controllers Index
 *
 * Re-exports all staff controller functions for backward compatibility.
 * The original staff.controller.ts (1800+ lines) has been split into:
 * - staff-crud.controller.ts - Basic CRUD operations
 * - staff-auth.controller.ts - Authentication operations
 * - staff-availability.controller.ts - Availability management
 * - staff-time-off.controller.ts - Time off management
 * - staff-schedule.controller.ts - Schedule management
 * - staff-profile.controller.ts - Profile photo operations
 */

// CRUD Operations
export {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
} from './staff-crud.controller.js';

// Authentication
export {
  loginStaff,
  requestPasswordReset,
  resetPassword,
  refreshAccessToken,
} from './staff-auth.controller.js';

// Availability
export {
  getStaffAvailability,
  createStaffAvailability,
  updateStaffAvailability,
  deleteStaffAvailability,
  getAvailableStaff,
} from './staff-availability.controller.js';

// Time Off
export {
  getStaffTimeOff,
  createStaffTimeOff,
  updateStaffTimeOff,
  deleteStaffTimeOff,
} from './staff-time-off.controller.js';

// Schedules
export {
  getStaffSchedules,
  getAllSchedules,
  createStaffSchedule,
  updateStaffSchedule,
  deleteStaffSchedule,
  bulkCreateSchedules,
  testSchedulesEndpoint,
} from './staff-schedule.controller.js';

// Profile Photos
export {
  uploadProfilePhoto,
  deleteProfilePhoto,
} from './staff-profile.controller.js';
