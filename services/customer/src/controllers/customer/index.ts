/**
 * Customer Controllers Index
 *
 * Re-exports all customer controller functions for backward compatibility.
 * The original customer.controller.ts (815 lines) has been split into:
 * - customer-crud.controller.ts - CRUD operations
 * - customer-extras.controller.ts - Documents, notifications, billing
 */

// CRUD Operations
export {
  getAllCustomers,
  getCustomerById,
  getCustomerPets,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  lookupCustomerByEmail,
} from "./customer-crud.controller";

// Extras (Documents, Notifications, Billing)
export {
  getCustomerDocuments,
  uploadCustomerDocument,
  getCustomerNotificationPreferences,
  updateCustomerNotificationPreferences,
  getCustomerInvoices,
  getCustomerPayments,
} from "./customer-extras.controller";
