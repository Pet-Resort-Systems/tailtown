/**
 * Resource Controllers Index
 *
 * Re-exports all resource controller functions for backward compatibility.
 * The original resource.controller.ts (830 lines) has been split into:
 * - resource-crud.controller.ts - CRUD operations
 * - resource-availability.controller.ts - Availability operations
 */

// CRUD Operations
export {
  getAllResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  validateResourceType,
} from './resource-crud.controller.js';

// Availability Operations
export {
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getAvailableResourcesByDate,
  getResourceAvailability,
  getBatchResourceAvailability,
} from './resource-availability.controller.js';
