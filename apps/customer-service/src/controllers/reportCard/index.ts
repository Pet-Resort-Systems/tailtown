/**
 * Report Card Controllers Index
 *
 * Re-exports all report card controller functions for backward compatibility.
 * The original reportCard.controller.ts (856 lines) has been split into:
 * - reportCard-crud.controller.ts - CRUD operations
 * - reportCard-photos.controller.ts - Photo operations
 * - reportCard-bulk.controller.ts - Bulk operations and queries
 */

// Re-export AuthRequest type
export type { AuthRequest } from './reportCard-crud.controller';

// CRUD Operations
export {
  createReportCard,
  listReportCards,
  getReportCard,
  updateReportCard,
  deleteReportCard,
} from './reportCard-crud.controller';

// Photo Operations
export {
  uploadPhoto,
  deletePhoto,
  updatePhoto,
} from './reportCard-photos.controller';

// Bulk Operations and Queries
export {
  sendReportCard,
  bulkCreateReportCards,
  bulkSendReportCards,
  getCustomerReportCards,
  getPetReportCards,
  getReservationReportCards,
} from './reportCard-bulk.controller';
