/**
 * Resource Service Pagination Tests
 * Ensures pagination works correctly and all resources are fetched
 */

import { resourceService } from '../resourceService';
import { reservationApi } from '../api';

// Mock the API
jest.mock('../api', () => ({
  reservationApi: {
    get: jest.fn()
  }
}));

describe('ResourceService Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllResources with large limit', () => {
    it('should fetch all pages when limit > 100', async () => {
      // Mock first page response
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ id: `resource-${i}`, name: `Resource ${i}` })),
          totalPages: 3,
          currentPage: 1,
          results: 100
        }
      };

      // Mock second page response
      const secondPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ id: `resource-${i + 100}`, name: `Resource ${i + 100}` })),
          totalPages: 3,
          currentPage: 2,
          results: 100
        }
      };

      // Mock third page response
      const thirdPageResponse = {
        data: {
          status: 'success',
          data: Array(73).fill(null).map((_, i) => ({ id: `resource-${i + 200}`, name: `Resource ${i + 200}` })),
          totalPages: 3,
          currentPage: 3,
          results: 73
        }
      };

      (reservationApi.get as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse)
        .mockResolvedValueOnce(thirdPageResponse);

      const result = await resourceService.getAllResources(1, 1000, 'name', 'asc', 'suite');

      // Should have called API 3 times (once per page)
      expect(reservationApi.get).toHaveBeenCalledTimes(3);

      // First call
      expect(reservationApi.get).toHaveBeenNthCalledWith(1, '/api/resources', {
        params: {
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
          type: 'suite'
        }
      });

      // Second call
      expect(reservationApi.get).toHaveBeenNthCalledWith(2, '/api/resources', {
        params: {
          page: 2,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
          type: 'suite'
        }
      });

      // Third call
      expect(reservationApi.get).toHaveBeenNthCalledWith(3, '/api/resources', {
        params: {
          page: 3,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
          type: 'suite'
        }
      });

      // Should return all 273 resources combined
      expect(result.data).toHaveLength(273);
      expect(result.status).toBe('success');
      expect(result.totalPages).toBe(3);
    });

    it('should handle single page when limit > 100 but only 1 page exists', async () => {
      const singlePageResponse = {
        data: {
          status: 'success',
          data: Array(50).fill(null).map((_, i) => ({ id: `resource-${i}`, name: `Resource ${i}` })),
          totalPages: 1,
          currentPage: 1,
          results: 50
        }
      };

      (reservationApi.get as jest.Mock).mockResolvedValueOnce(singlePageResponse);

      const result = await resourceService.getAllResources(1, 1000, 'name', 'asc', 'suite');

      // Should only call API once
      expect(reservationApi.get).toHaveBeenCalledTimes(1);

      // Should return all 50 resources
      expect(result.data).toHaveLength(50);
      expect(result.status).toBe('success');
    });

    it('should return at least 100 resources when multiple pages exist', async () => {
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ id: `resource-${i}`, name: `Resource ${i}` })),
          totalPages: 2,
          currentPage: 1,
          results: 100
        }
      };

      const secondPageResponse = {
        data: {
          status: 'success',
          data: Array(66).fill(null).map((_, i) => ({ id: `resource-${i + 100}`, name: `Resource ${i + 100}` })),
          totalPages: 2,
          currentPage: 2,
          results: 66
        }
      };

      (reservationApi.get as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const result = await resourceService.getAllResources(1, 1000, 'name', 'asc', 'suite');

      // Should return 166 resources (all kennels)
      expect(result.data).toHaveLength(166);
      expect(result.data.length).toBeGreaterThan(100);
    });
  });

  describe('getAllResources with normal limit', () => {
    it('should make single API call when limit <= 100', async () => {
      const response = {
        data: {
          status: 'success',
          data: Array(50).fill(null).map((_, i) => ({ id: `resource-${i}`, name: `Resource ${i}` })),
          totalPages: 2,
          currentPage: 1,
          results: 50
        }
      };

      (reservationApi.get as jest.Mock).mockResolvedValueOnce(response);

      const result = await resourceService.getAllResources(1, 50, 'name', 'asc', 'suite');

      // Should only call API once
      expect(reservationApi.get).toHaveBeenCalledTimes(1);

      // Should return first page only
      expect(result.data).toHaveLength(50);
    });
  });

  describe('Regression Prevention', () => {
    it('should never return only 10 items when 166+ exist', async () => {
      // This test prevents the bug where only first page (10 items) was returned
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(10).fill(null).map((_, i) => ({ id: `resource-${i}`, name: `Resource ${i}` })),
          totalPages: 17, // 166 resources / 10 per page
          currentPage: 1,
          results: 10
        }
      };

      // Mock all 17 pages
      const mockResponses = [firstPageResponse];
      for (let page = 2; page <= 17; page++) {
        mockResponses.push({
          data: {
            status: 'success',
            data: Array(10).fill(null).map((_, i) => ({ 
              id: `resource-${(page - 1) * 10 + i}`, 
              name: `Resource ${(page - 1) * 10 + i}` 
            })),
            totalPages: 17,
            currentPage: page,
            results: 10
          }
        });
      }

      // Last page has 6 items (166 % 10 = 6)
      mockResponses[16].data.data = Array(6).fill(null).map((_, i) => ({ 
        id: `resource-${160 + i}`, 
        name: `Resource ${160 + i}` 
      }));

      (reservationApi.get as jest.Mock).mockImplementation(() => 
        Promise.resolve(mockResponses.shift())
      );

      const result = await resourceService.getAllResources(1, 1000, 'name', 'asc', 'suite');

      // CRITICAL: Must return ALL resources, not just first page
      expect(result.data.length).toBe(166);
      expect(result.data.length).toBeGreaterThan(10);
      
      // Should have fetched all pages
      expect(reservationApi.get).toHaveBeenCalledTimes(17);
    });

    it('should handle 173 resources across multiple pages', async () => {
      // Simulate 173 resources with 100 per page
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ id: `resource-${i}`, name: `Resource ${i}` })),
          totalPages: 2,
          currentPage: 1,
          results: 100
        }
      };

      const secondPageResponse = {
        data: {
          status: 'success',
          data: Array(73).fill(null).map((_, i) => ({ id: `resource-${i + 100}`, name: `Resource ${i + 100}` })),
          totalPages: 2,
          currentPage: 2,
          results: 73
        }
      };

      (reservationApi.get as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const result = await resourceService.getAllResources(1, 1000, 'name', 'asc');

      // Must return all 173 resources
      expect(result.data.length).toBe(173);
      expect(result.data.length).toBeGreaterThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (reservationApi.get as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      await expect(
        resourceService.getAllResources(1, 1000, 'name', 'asc', 'suite')
      ).rejects.toThrow('API Error');
    });

    it('should handle empty response', async () => {
      const emptyResponse = {
        data: {
          status: 'success',
          data: [],
          totalPages: 0,
          currentPage: 1,
          results: 0
        }
      };

      (reservationApi.get as jest.Mock).mockResolvedValueOnce(emptyResponse);

      const result = await resourceService.getAllResources(1, 1000, 'name', 'asc', 'suite');

      expect(result.data).toHaveLength(0);
      expect(result.status).toBe('success');
    });
  });
});
