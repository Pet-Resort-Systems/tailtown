import api from './api';

export interface SalesByServiceData {
  period: string;
  totalRevenue: number;
  totalBookings?: number;
  services: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
}

export interface SalesByAddOnData {
  period: string;
  totalRevenue: number;
  addOns: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
}

export interface CustomerValueData {
  id: string;
  name: string;
  email: string;
  totalSpend: number;
  invoiceCount: number;
  serviceBreakdown: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  addOnBreakdown: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  addOnTotal: number;
}

export interface DashboardSummaryData {
  period: string;
  totalRevenue: number;
  customerCount: number;
  serviceData: {
    id: string;
    name: string;
    count: number;
  }[];
  addOnData: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  addOnRevenue: number;
  reservationCount?: number;
}

export interface CustomerReportData {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  period: string;
  totalSpend: number;
  invoiceCount: number;
  serviceBreakdown: {
    id: string;
    name: string;
    count: number;
    revenue: number;
    transactions: {
      id: string;
      date: string;
      amount: number;
      invoiceNumber: string;
    }[];
  }[];
  addOnBreakdown: {
    id: string;
    name: string;
    count: number;
    revenue: number;
    transactions: {
      id: string;
      date: string;
      amount: number;
      invoiceNumber: string;
    }[];
  }[];
  addOnTotal: number;
  transactions: {
    id: string;
    invoiceNumber: string;
    date: string;
    total: number;
    status: string;
    serviceName: string;
    addOns: {
      name: string;
      price: number;
    }[];
  }[];
}

export interface AnalyticsResponse<T> {
  status: string;
  data: T;
  results?: number;
}

const analyticsService = {
  /**
   * Get sales data by service type
   * @param period - time period (day, week, month, year, all, custom)
   * @param startDate - start date for custom period (YYYY-MM-DD)
   * @param endDate - end date for custom period (YYYY-MM-DD)
   */
  getSalesByService: async (
    period: string = 'all',
    startDate?: string,
    endDate?: string
  ): Promise<SalesByServiceData> => {
    try {
      let url = `/api/analytics/sales/services?period=${period}`;
      
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await api.get<AnalyticsResponse<SalesByServiceData>>(url);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      
      throw new Error('Failed to get sales by service data');
    } catch (error) {
      console.error('Error getting sales by service:', error);
      throw error;
    }
  },
  
  /**
   * Get sales data by add-on type
   * @param period - time period (day, week, month, year, all, custom)
   * @param startDate - start date for custom period (YYYY-MM-DD)
   * @param endDate - end date for custom period (YYYY-MM-DD)
   */
  getSalesByAddOn: async (
    period: string = 'all',
    startDate?: string,
    endDate?: string
  ): Promise<SalesByAddOnData> => {
    try {
      let url = `/api/analytics/sales/addons?period=${period}`;
      
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await api.get<AnalyticsResponse<SalesByAddOnData>>(url);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      
      throw new Error('Failed to get sales by add-on data');
    } catch (error) {
      console.error('Error getting sales by add-on:', error);
      throw error;
    }
  },
  
  /**
   * Get customer value data (total spend, breakdown by service type)
   * @param period - time period (day, week, month, year, all, custom)
   * @param startDate - start date for custom period (YYYY-MM-DD)
   * @param endDate - end date for custom period (YYYY-MM-DD)
   */
  getCustomerValue: async (
    period: string = 'all',
    startDate?: string,
    endDate?: string
  ): Promise<CustomerValueData[]> => {
    try {
      let url = `/api/analytics/customers/value?period=${period}`;
      
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await api.get<AnalyticsResponse<CustomerValueData[]>>(url);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      
      throw new Error('Failed to get customer value data');
    } catch (error) {
      console.error('Error getting customer value:', error);
      throw error;
    }
  },
  
  /**
   * Get summary analytics data for dashboard
   * @param period - time period (day, week, month, year, all, custom)
   * @param startDate - start date for custom period (YYYY-MM-DD)
   * @param endDate - end date for custom period (YYYY-MM-DD)
   */
  getDashboardSummary: async (
    period: string = 'all',
    startDate?: string,
    endDate?: string
  ): Promise<DashboardSummaryData> => {
    try {
      let url = `/api/analytics/dashboard?period=${period}`;
      
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await api.get<AnalyticsResponse<DashboardSummaryData>>(url);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      
      throw new Error('Failed to get dashboard summary data');
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  },
  
  /**
   * Get detailed customer report for a specific customer
   * @param customerId - ID of the customer
   * @param period - time period (day, week, month, year, all, custom)
   * @param startDate - start date for custom period (YYYY-MM-DD)
   * @param endDate - end date for custom period (YYYY-MM-DD)
   */
  getCustomerReport: async (
    customerId: string,
    period: string = 'all',
    startDate?: string,
    endDate?: string
  ): Promise<CustomerReportData> => {
    try {
      let url = `/api/analytics/customers/${customerId}?period=${period}`;
      
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await api.get<AnalyticsResponse<CustomerReportData>>(url);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      
      throw new Error('Failed to get customer report data');
    } catch (error) {
      console.error('Error getting customer report:', error);
      throw error;
    }
  }
};

export default analyticsService;
