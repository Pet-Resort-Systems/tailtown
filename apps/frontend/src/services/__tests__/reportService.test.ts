/**
 * Report Service Tests
 * Tests API endpoint paths and ensures frontend-backend consistency
 */

import {
  getSalesDailyReport,
  getSalesWeeklyReport,
  getSalesMonthlyReport,
  getSalesYTDReport,
  getTopCustomersReport,
  getTaxMonthlyReport,
  getTaxQuarterlyReport,
  getTaxAnnualReport,
  getTaxBreakdownReport
} from '../reportService';

// Mock axios
jest.mock('../api', () => ({
  customerApi: {
    get: jest.fn()
  }
}));

const { customerApi } = require('../api');

describe('ReportService API Paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (customerApi.get as jest.Mock).mockResolvedValue({ data: {} });
  });

  describe('Sales Report Endpoints', () => {
    it('should call /api/reports/sales/daily with correct path', async () => {
      await getSalesDailyReport('2025-10-25');
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/sales/daily?date=2025-10-25');
    });

    it('should call /api/reports/sales/weekly with correct path', async () => {
      await getSalesWeeklyReport('2025-10-01', '2025-10-07');
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/sales/weekly?startDate=2025-10-01&endDate=2025-10-07');
    });

    it('should call /api/reports/sales/monthly with correct path', async () => {
      await getSalesMonthlyReport(2025, 10);
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/sales/monthly?year=2025&month=10');
    });

    it('should call /api/reports/sales/ytd with correct path', async () => {
      await getSalesYTDReport(2025);
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/sales/ytd?year=2025');
    });

    it('should call /api/reports/sales/top-customers with correct path', async () => {
      await getTopCustomersReport('2025-10-01', '2025-10-31', 10);
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/sales/top-customers?startDate=2025-10-01&endDate=2025-10-31&limit=10');
    });
  });

  describe('Tax Report Endpoints', () => {
    it('should call /api/reports/tax/monthly with correct path', async () => {
      await getTaxMonthlyReport(2025, 10);
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/tax/monthly?year=2025&month=10');
    });

    it('should call /api/reports/tax/quarterly with correct path', async () => {
      await getTaxQuarterlyReport(2025, 4);
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/tax/quarterly?year=2025&quarter=4');
    });

    it('should call /api/reports/tax/annual with correct path', async () => {
      await getTaxAnnualReport(2025);
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/tax/annual?year=2025');
    });

    it('should call /api/reports/tax/breakdown with correct path', async () => {
      await getTaxBreakdownReport('2025-10-01', '2025-10-31');
      
      expect(customerApi.get).toHaveBeenCalledWith('/api/reports/tax/breakdown?startDate=2025-10-01&endDate=2025-10-31');
    });
  });

  describe('Path Validation', () => {
    it('should always include /api prefix in paths', async () => {
      const calls = [
        getSalesDailyReport('2025-10-25'),
        getSalesMonthlyReport(2025, 10),
        getTaxMonthlyReport(2025, 10)
      ];

      await Promise.all(calls);

      const allCalls = (customerApi.get as jest.Mock).mock.calls;
      allCalls.forEach(call => {
        const path = call[0];
        expect(path).toMatch(/^\/api\//);
      });
    });

    it('should not have paths without /api prefix', async () => {
      await getSalesMonthlyReport(2025, 10);
      
      const path = (customerApi.get as jest.Mock).mock.calls[0][0];
      
      // Should NOT start with /reports (missing /api)
      expect(path).not.toMatch(/^\/reports\//);
      // Should start with /api/reports
      expect(path).toMatch(/^\/api\/reports\//);
    });
  });

  describe('Query Parameter Formatting', () => {
    it('should format date parameters correctly', async () => {
      await getSalesDailyReport('2025-10-25');
      
      const path = (customerApi.get as jest.Mock).mock.calls[0][0];
      expect(path).toContain('date=2025-10-25');
    });

    it('should format year and month parameters correctly', async () => {
      await getSalesMonthlyReport(2025, 10);
      
      const path = (customerApi.get as jest.Mock).mock.calls[0][0];
      expect(path).toContain('year=2025');
      expect(path).toContain('month=10');
    });

    it('should format date range parameters correctly', async () => {
      await getSalesWeeklyReport('2025-10-01', '2025-10-07');
      
      const path = (customerApi.get as jest.Mock).mock.calls[0][0];
      expect(path).toContain('startDate=2025-10-01');
      expect(path).toContain('endDate=2025-10-07');
    });
  });
});
