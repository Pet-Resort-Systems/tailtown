/**
 * Reports Controllers Index
 *
 * Re-exports all report controller functions for backward compatibility.
 * The original reports.controller.ts (842 lines) has been split into:
 * - reports-sales.controller.ts - Sales reports
 * - reports-tax.controller.ts - Tax reports
 * - reports-financial.controller.ts - Financial reports
 * - reports-customer.controller.ts - Customer reports
 * - reports-operations.controller.ts - Operational reports
 */

// Sales Reports
export {
  getDailySales,
  getWeeklySales,
  getMonthlySales,
  getYTDSales,
  getTopCustomersReport,
} from "./reports-sales.controller";

// Tax Reports
export {
  getMonthlyTax,
  getQuarterlyTax,
  getAnnualTax,
  getTaxBreakdownReport,
} from "./reports-tax.controller";

// Financial Reports
export {
  getRevenue,
  getProfitLoss,
  getOutstanding,
  getRefunds,
} from "./reports-financial.controller";

// Customer Reports
export {
  getCustomerAcquisition,
  getCustomerRetention,
  getCustomerLifetimeValue,
  getCustomerDemographics,
  getInactiveCustomers,
} from "./reports-customer.controller";

// Operations Reports
export {
  getStaffPerformance,
  getResourceUtilization,
  getBookingPatterns,
  getCapacityAnalysis,
} from "./reports-operations.controller";
