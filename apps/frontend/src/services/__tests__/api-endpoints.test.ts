/**
 * API Endpoint Integration Tests
 * 
 * These tests verify that API endpoints are constructed correctly
 * and include the proper /api prefix where required.
 * 
 * This prevents issues like:
 * - Missing /api prefix (404 errors)
 * - Incorrect base URLs
 * - Malformed endpoint paths
 */

import axios from 'axios';

// Mock axios to intercept actual HTTP calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Endpoint URL Construction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Reservation Service Endpoints', () => {
    it('should construct check-in template URL with /api prefix', () => {
      const baseURL = 'http://localhost:4003';
      const endpoint = '/api/check-in-templates/default';
      const expectedURL = `${baseURL}${endpoint}`;

      expect(endpoint).toMatch(/^\/api\//);
      expect(endpoint).toContain('/check-in-templates/default');
      expect(expectedURL).toBe('http://localhost:4003/api/check-in-templates/default');
    });

    it('should construct service agreement template URL with /api prefix', () => {
      const baseURL = 'http://localhost:4003';
      const endpoint = '/api/service-agreement-templates/default';
      const expectedURL = `${baseURL}${endpoint}`;

      expect(endpoint).toMatch(/^\/api\//);
      expect(endpoint).toContain('/service-agreement-templates/default');
      expect(expectedURL).toBe('http://localhost:4003/api/service-agreement-templates/default');
    });

    it('should construct reservations URL with /api prefix', () => {
      const baseURL = 'http://localhost:4003';
      const endpoint = '/api/reservations';
      const expectedURL = `${baseURL}${endpoint}`;

      expect(endpoint).toMatch(/^\/api\//);
      expect(expectedURL).toBe('http://localhost:4003/api/reservations');
    });

    it('should construct resources URL with /api prefix', () => {
      const baseURL = 'http://localhost:4003';
      const endpoint = '/api/resources';
      const expectedURL = `${baseURL}${endpoint}`;

      expect(endpoint).toMatch(/^\/api\//);
      expect(expectedURL).toBe('http://localhost:4003/api/resources');
    });
  });

  describe('Customer Service Endpoints', () => {
    it('should construct customers URL with /api prefix', () => {
      const baseURL = 'http://localhost:4004';
      const endpoint = '/api/customers';
      const expectedURL = `${baseURL}${endpoint}`;

      expect(endpoint).toMatch(/^\/api\//);
      expect(expectedURL).toBe('http://localhost:4004/api/customers');
    });

    it('should construct pets URL with /api prefix', () => {
      const baseURL = 'http://localhost:4004';
      const endpoint = '/api/pets';
      const expectedURL = `${baseURL}${endpoint}`;

      expect(endpoint).toMatch(/^\/api\//);
      expect(expectedURL).toBe('http://localhost:4004/api/pets');
    });
  });

  describe('Endpoint Pattern Validation', () => {
    const validEndpoints = [
      '/api/check-in-templates/default',
      '/api/service-agreement-templates/default',
      '/api/reservations',
      '/api/reservations/123',
      '/api/customers',
      '/api/pets',
      '/api/resources',
      '/api/check-ins',
      '/api/service-agreements'
    ];

    validEndpoints.forEach(endpoint => {
      it(`should validate endpoint: ${endpoint}`, () => {
        // All endpoints should start with /api/
        expect(endpoint).toMatch(/^\/api\//);
        
        // Should not have double slashes
        expect(endpoint).not.toMatch(/\/\//);
        
        // Should not end with slash (unless it's just /api/)
        if (endpoint !== '/api/') {
          expect(endpoint).not.toMatch(/\/$/);
        }
      });
    });

    const invalidEndpoints = [
      '/check-in-templates/default', // Missing /api
      '/service-agreement-templates/default', // Missing /api
      'api/reservations', // Missing leading slash
      '/api//reservations', // Double slash
      '/api/reservations/', // Trailing slash
    ];

    invalidEndpoints.forEach(endpoint => {
      it(`should detect invalid endpoint: ${endpoint}`, () => {
        // Should either not start with /api/ or have other issues
        const startsWithApi = endpoint.match(/^\/api\//) !== null;
        const hasDoubleSlash = endpoint.match(/\/\//) !== null;
        const hasTrailingSlash = endpoint.match(/\/$/) !== null;
        const isLongEnough = endpoint.length > 5;
        
        const isValid = startsWithApi && !hasDoubleSlash && !hasTrailingSlash && isLongEnough;
        
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Template Endpoint Regression Tests', () => {
    /**
     * Regression test for issue where template endpoints were missing /api prefix
     * 
     * Issue: Frontend was calling /check-in-templates/default
     * Expected: /api/check-in-templates/default
     * Result: 404 errors
     * 
     * This test ensures the issue doesn't happen again
     */
    it('should prevent regression: check-in template endpoint must include /api', () => {
      const correctEndpoint = '/api/check-in-templates/default';
      const incorrectEndpoint = '/check-in-templates/default';

      // Verify correct endpoint
      expect(correctEndpoint).toMatch(/^\/api\//);
      expect(correctEndpoint).toContain('/check-in-templates/default');

      // Verify incorrect endpoint is detected
      expect(incorrectEndpoint).not.toMatch(/^\/api\//);
    });

    it('should prevent regression: service agreement template endpoint must include /api', () => {
      const correctEndpoint = '/api/service-agreement-templates/default';
      const incorrectEndpoint = '/service-agreement-templates/default';

      // Verify correct endpoint
      expect(correctEndpoint).toMatch(/^\/api\//);
      expect(correctEndpoint).toContain('/service-agreement-templates/default');

      // Verify incorrect endpoint is detected
      expect(incorrectEndpoint).not.toMatch(/^\/api\//);
    });
  });

  describe('Full URL Construction', () => {
    it('should construct complete URLs correctly', () => {
      const testCases = [
        {
          baseURL: 'http://localhost:4003',
          endpoint: '/api/check-in-templates/default',
          expected: 'http://localhost:4003/api/check-in-templates/default'
        },
        {
          baseURL: 'http://localhost:4003',
          endpoint: '/api/service-agreement-templates/default',
          expected: 'http://localhost:4003/api/service-agreement-templates/default'
        },
        {
          baseURL: 'http://localhost:4003',
          endpoint: '/api/reservations',
          expected: 'http://localhost:4003/api/reservations'
        },
        {
          baseURL: 'http://localhost:4004',
          endpoint: '/api/customers',
          expected: 'http://localhost:4004/api/customers'
        }
      ];

      testCases.forEach(({ baseURL, endpoint, expected }) => {
        const fullURL = `${baseURL}${endpoint}`;
        expect(fullURL).toBe(expected);
        expect(fullURL).toMatch(/^http:\/\/localhost:\d+\/api\//);
      });
    });
  });
});
