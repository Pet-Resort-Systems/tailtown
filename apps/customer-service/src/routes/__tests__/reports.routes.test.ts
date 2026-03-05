/**
 * Reports Routes Integration Tests
 * Tests that all report endpoints are properly registered and accessible
 */

import request from 'supertest';
import express from 'express';
import reportRoutes from '../reports.routes';

// Create a test app
const app = express();
app.use(express.json());

// Mock tenant middleware
app.use((req, res, next) => {
  req.headers['x-tenant-id'] = 'test-tenant';
  next();
});

// Register routes
app.use('/api/reports', reportRoutes);

describe('Reports Routes Integration', () => {
  describe('Sales Report Endpoints', () => {
    it('should have /api/reports/sales/daily endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/sales/daily?date=2025-10-25')
        .set('x-tenant-id', 'test-tenant');
      
      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/sales/weekly endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/sales/weekly?startDate=2025-10-01&endDate=2025-10-07')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/sales/monthly endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/sales/monthly?year=2025&month=10')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/sales/ytd endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/sales/ytd?year=2025')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/sales/top-customers endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/sales/top-customers?startDate=2025-10-01&endDate=2025-10-31')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });
  });

  describe('Tax Report Endpoints', () => {
    it('should have /api/reports/tax/monthly endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/tax/monthly?year=2025&month=10')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/tax/quarterly endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/tax/quarterly?year=2025&quarter=4')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/tax/annual endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/tax/annual?year=2025')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/tax/breakdown endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/tax/breakdown?startDate=2025-10-01&endDate=2025-10-31')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });
  });

  describe('Financial Report Endpoints', () => {
    it('should have /api/reports/financial/revenue endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/financial/revenue?startDate=2025-10-01&endDate=2025-10-31')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/financial/profit-loss endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/financial/profit-loss?startDate=2025-10-01&endDate=2025-10-31')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/financial/outstanding endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/financial/outstanding')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });

    it('should have /api/reports/financial/refunds endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/financial/refunds?startDate=2025-10-01&endDate=2025-10-31')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).not.toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/reports/nonexistent')
        .set('x-tenant-id', 'test-tenant');
      
      expect(response.status).toBe(404);
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .get('/api/reports/sales/monthly')
        .set('x-tenant-id', 'test-tenant');
      
      // Should fail validation (missing year/month)
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Frontend-Backend Endpoint Consistency', () => {
    // This test documents the expected frontend paths
    const frontendPaths = [
      '/api/reports/sales/daily',
      '/api/reports/sales/weekly',
      '/api/reports/sales/monthly',
      '/api/reports/sales/ytd',
      '/api/reports/sales/top-customers',
      '/api/reports/tax/monthly',
      '/api/reports/tax/quarterly',
      '/api/reports/tax/annual',
      '/api/reports/tax/breakdown',
      '/api/reports/financial/revenue',
      '/api/reports/financial/profit-loss',
      '/api/reports/financial/outstanding',
      '/api/reports/financial/refunds'
    ];

    frontendPaths.forEach(path => {
      it(`should have backend route for frontend path: ${path}`, async () => {
        // Extract the path without query params
        const basePath = path.split('?')[0];
        
        const response = await request(app)
          .get(basePath + '?year=2025&month=10&startDate=2025-10-01&endDate=2025-10-31')
          .set('x-tenant-id', 'test-tenant');
        
        // Route should exist (not 404)
        expect(response.status).not.toBe(404);
      });
    });
  });

  describe('URL Path Validation', () => {
    it('should reject paths without /api prefix', async () => {
      // This documents that routes MUST include /api
      const response = await request(app)
        .get('/reports/sales/monthly?year=2025&month=10')
        .set('x-tenant-id', 'test-tenant');
      
      // Should be 404 because route is registered at /api/reports
      expect(response.status).toBe(404);
    });

    it('should accept paths with /api prefix', async () => {
      const response = await request(app)
        .get('/api/reports/sales/monthly?year=2025&month=10')
        .set('x-tenant-id', 'test-tenant');
      
      // Should NOT be 404
      expect(response.status).not.toBe(404);
    });
  });
});
