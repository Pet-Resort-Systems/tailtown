/**
 * Report Types and Interfaces
 * Comprehensive type definitions for the reporting system
 */

// ============================================================================
// Base Report Interfaces
// ============================================================================

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  serviceType?: string;
  paymentMethod?: string;
  customerId?: string;
  staffId?: string;
  year?: number;
  month?: number;
  quarter?: number;
}

export interface ReportSummary {
  totalRevenue?: number;
  totalTransactions?: number;
  averageTransaction?: number;
  taxCollected?: number;
  [key: string]: any;
}

export interface ReportMetadata {
  totalRecords: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  generatedAt: Date;
  generatedBy?: string;
}

export interface ReportResponse<T = any> {
  reportType: string;
  title: string;
  filters: ReportFilters;
  summary: ReportSummary;
  data: T[];
  metadata: ReportMetadata;
}

// ============================================================================
// Sales Report Types
// ============================================================================

export interface ServiceSales {
  serviceName: string;
  serviceType: string;
  serviceId: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface PaymentMethodSales {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DailySalesData {
  date: string;
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  serviceBreakdown: ServiceSales[];
  paymentMethodBreakdown: PaymentMethodSales[];
}

export interface WeeklySalesData {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  dailyBreakdown: DailySalesData[];
}

export interface MonthlySalesData {
  month: string; // "2025-10"
  monthName: string; // "October 2025"
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  weeklyBreakdown: WeeklySalesData[];
  serviceBreakdown: ServiceSales[];
  paymentMethodBreakdown: PaymentMethodSales[];
}

export interface YTDSalesData {
  year: number;
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  monthlyBreakdown: MonthlySalesData[];
  topServices: ServiceSales[];
  topPaymentMethods: PaymentMethodSales[];
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  lastVisit: string;
}

// ============================================================================
// Tax Report Types
// ============================================================================

export interface TaxBreakdown {
  category: string;
  taxableAmount: number;
  nonTaxableAmount: number;
  taxAmount: number;
  taxRate: number;
}

export interface MonthlyTaxData {
  month: string; // "2025-10"
  monthName: string; // "October 2025"
  taxableRevenue: number;
  nonTaxableRevenue: number;
  totalRevenue: number;
  taxRate: number;
  taxCollected: number;
  breakdown: TaxBreakdown[];
}

export interface QuarterlyTaxData {
  year: number;
  quarter: number; // 1, 2, 3, 4
  quarterName: string; // "Q4 2025"
  taxableRevenue: number;
  nonTaxableRevenue: number;
  totalRevenue: number;
  averageTaxRate: number;
  taxCollected: number;
  monthlyBreakdown: MonthlyTaxData[];
}

export interface AnnualTaxData {
  year: number;
  taxableRevenue: number;
  nonTaxableRevenue: number;
  totalRevenue: number;
  averageTaxRate: number;
  taxCollected: number;
  quarterlyBreakdown: QuarterlyTaxData[];
  categoryBreakdown: TaxBreakdown[];
}

// ============================================================================
// Financial Report Types
// ============================================================================

export interface RevenueData {
  period: string;
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  addOnRevenue: number;
  revenueByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export interface ProfitLossData {
  period: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  netProfit: number;
  netMargin: number;
}

export interface OutstandingBalance {
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  daysOverdue: number;
  status: string;
}

export interface RefundData {
  date: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  originalAmount: number;
  refundAmount: number;
  refundReason: string;
  refundMethod: string;
}

export interface ReconciliationTransaction {
  time: string;
  invoiceNumber: string;
  customerName: string;
  paymentMethod: string;
  amount: number;
  tip: number;
  total: number;
  staffName: string;
}

export interface ReconciliationData {
  date: string;
  openingBalance: number;
  closingBalance: number;
  expectedDrawer: number;
  transactions: ReconciliationTransaction[];
  summary: {
    cashSales: number;
    cardSales: number;
    otherSales: number;
    totalSales: number;
    tipsCollected: number;
    refundsIssued: number;
    netRevenue: number;
    transactionCount: number;
  };
  paymentBreakdown: {
    method: string;
    count: number;
    amount: number;
  }[];
}

// ============================================================================
// Customer Report Types
// ============================================================================

export interface CustomerAcquisitionData {
  period: string;
  newCustomers: number;
  totalCustomers: number;
  acquisitionRate: number;
  source?: string;
}

export interface CustomerRetentionData {
  period: string;
  returningCustomers: number;
  totalCustomers: number;
  retentionRate: number;
  churnRate: number;
}

export interface CustomerLifetimeValue {
  customerId: string;
  customerName: string;
  petNames: string;
  firstVisit: string;
  lastVisit: string;
  totalVisits: number;
  totalSpent: number;
  averageTransaction: number;
  lifetimeValue: number;
  tier: string;
}

export interface CustomerDemographics {
  totalCustomers: number;
  byLocation: {
    city: string;
    count: number;
    percentage: number;
  }[];
  byPetType: {
    petType: string;
    count: number;
    percentage: number;
  }[];
  byServicePreference: {
    service: string;
    count: number;
    percentage: number;
  }[];
}

export interface InactiveCustomer {
  customerId: string;
  customerName: string;
  lastVisit: string;
  daysSinceLastVisit: number;
  totalSpent: number;
  totalVisits: number;
  email: string;
  phone: string;
}

// ============================================================================
// Operational Report Types
// ============================================================================

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  role: string;
  servicesCompleted: number;
  revenue: number;
  averageServiceTime: number;
  customerRating?: number;
  efficiency: number;
}

export interface ResourceUtilization {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  totalCapacity: number;
  hoursBooked: number;
  hoursAvailable: number;
  utilizationRate: number;
  revenue: number;
}

export interface BookingPattern {
  dayOfWeek: string;
  hour: number;
  bookingCount: number;
  revenue: number;
  averageBookingValue: number;
}

export interface CapacityAnalysis {
  date: string;
  totalCapacity: number;
  bookedCapacity: number;
  availableCapacity: number;
  utilizationRate: number;
  revenue: number;
  potentialRevenue: number;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'pdf' | 'csv' | 'excel';

export interface ExportRequest {
  reportType: string;
  format: ExportFormat;
  filters: ReportFilters;
  data: any[];
  title: string;
  summary?: ReportSummary;
}

export interface ExportResponse {
  success: boolean;
  format: ExportFormat;
  filename: string;
  url?: string;
  buffer?: Buffer;
  error?: string;
}

// ============================================================================
// Report Type Enum
// ============================================================================

export enum ReportType {
  // Sales
  SALES_DAILY = 'sales_daily',
  SALES_WEEKLY = 'sales_weekly',
  SALES_MONTHLY = 'sales_monthly',
  SALES_YTD = 'sales_ytd',
  SALES_BY_SERVICE = 'sales_by_service',
  SALES_BY_PAYMENT = 'sales_by_payment',
  SALES_TOP_CUSTOMERS = 'sales_top_customers',

  // Tax
  TAX_MONTHLY = 'tax_monthly',
  TAX_QUARTERLY = 'tax_quarterly',
  TAX_ANNUAL = 'tax_annual',
  TAX_BREAKDOWN = 'tax_breakdown',

  // Financial
  FINANCIAL_REVENUE = 'financial_revenue',
  FINANCIAL_PROFIT_LOSS = 'financial_profit_loss',
  FINANCIAL_OUTSTANDING = 'financial_outstanding',
  FINANCIAL_REFUNDS = 'financial_refunds',

  // Customer
  CUSTOMER_ACQUISITION = 'customer_acquisition',
  CUSTOMER_RETENTION = 'customer_retention',
  CUSTOMER_LIFETIME_VALUE = 'customer_lifetime_value',
  CUSTOMER_DEMOGRAPHICS = 'customer_demographics',
  CUSTOMER_INACTIVE = 'customer_inactive',

  // Operational
  OPERATIONS_STAFF = 'operations_staff',
  OPERATIONS_RESOURCES = 'operations_resources',
  OPERATIONS_BOOKINGS = 'operations_bookings',
  OPERATIONS_CAPACITY = 'operations_capacity',
}

// ============================================================================
// Helper Types
// ============================================================================

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface PeriodFilter {
  type: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  value?: string | number;
  startDate?: string;
  endDate?: string;
}

export interface ChartData {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'percentage';
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}
