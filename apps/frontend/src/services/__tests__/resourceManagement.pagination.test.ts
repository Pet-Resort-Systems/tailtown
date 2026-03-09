/**
 * Resource Management Pagination Tests
 * Ensures the Kennels page fetches all resources correctly
 */

import { getAllResources } from '../resourceManagement';
import { reservationApi } from '../api';

// Mock the API
jest.mock('../api', () => ({
  reservationApi: {
    get: jest.fn()
  }
}));

describe('ResourceManagement Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllResources', () => {
    it('should fetch all pages of resources', async () => {
      // Mock first page (100 resources)
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ 
            id: `resource-${i}`, 
            name: `Resource ${i}`,
            type: 'suite'
          })),
          totalPages: 2,
          currentPage: 1
        }
      };

      // Mock second page (73 resources)
      const secondPageResponse = {
        data: {
          status: 'success',
          data: Array(73).fill(null).map((_, i) => ({ 
            id: `resource-${i + 100}`, 
            name: `Resource ${i + 100}`,
            type: 'suite'
          })),
          totalPages: 2,
          currentPage: 2
        }
      };

      (reservationApi.get as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const result = await getAllResources();

      // Should call API twice (once per page)
      expect(reservationApi.get).toHaveBeenCalledTimes(2);

      // First call
      expect(reservationApi.get).toHaveBeenNthCalledWith(1, '/api/resources', {
        params: {
          page: 1,
          limit: 100
        }
      });

      // Second call
      expect(reservationApi.get).toHaveBeenNthCalledWith(2, '/api/resources', {
        params: {
          page: 2,
          limit: 100
        }
      });

      // Should return all 173 resources
      expect(result).toHaveLength(173);
    });

    it('should handle single page of resources', async () => {
      const singlePageResponse = {
        data: {
          status: 'success',
          data: Array(50).fill(null).map((_, i) => ({ 
            id: `resource-${i}`, 
            name: `Resource ${i}`
          })),
          totalPages: 1,
          currentPage: 1
        }
      };

      (reservationApi.get as jest.Mock).mockResolvedValueOnce(singlePageResponse);

      const result = await getAllResources();

      // Should only call API once
      expect(reservationApi.get).toHaveBeenCalledTimes(1);

      // Should return all 50 resources
      expect(result).toHaveLength(50);
    });

    it('should handle empty response', async () => {
      const emptyResponse = {
        data: {
          status: 'success',
          data: [],
          totalPages: 0,
          currentPage: 1
        }
      };

      (reservationApi.get as jest.Mock).mockResolvedValueOnce(emptyResponse);

      const result = await getAllResources();

      expect(result).toHaveLength(0);
    });
  });

  describe('Regression Prevention - Kennels Page Bug', () => {
    it('should NEVER return only 10 resources when 173 exist', async () => {
      // This is the exact bug we're preventing:
      // The Kennels page was showing "Total Suites: 10" instead of 173
      
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ 
            id: `suite-${i}`, 
            name: `Suite ${i}`,
            type: 'suite'
          })),
          totalPages: 2,
          currentPage: 1
        }
      };

      const secondPageResponse = {
        data: {
          status: 'success',
          data: Array(73).fill(null).map((_, i) => ({ 
            id: `suite-${i + 100}`, 
            name: `Suite ${i + 100}`,
            type: 'suite'
          })),
          totalPages: 2,
          currentPage: 2
        }
      };

      (reservationApi.get as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const result = await getAllResources();

      // CRITICAL: Must return ALL resources
      expect(result.length).toBe(173);
      expect(result.length).toBeGreaterThan(10);
      expect(result.length).toBeGreaterThan(100);
      
      // Should have fetched both pages
      expect(reservationApi.get).toHaveBeenCalledTimes(2);
    });

    it('should handle 166 kennels across multiple pages', async () => {
      // Another common scenario - 166 kennels
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ 
            id: `kennel-${i}`, 
            name: `Kennel ${i}`
          })),
          totalPages: 2,
          currentPage: 1
        }
      };

      const secondPageResponse = {
        data: {
          status: 'success',
          data: Array(66).fill(null).map((_, i) => ({ 
            id: `kennel-${i + 100}`, 
            name: `Kennel ${i + 100}`
          })),
          totalPages: 2,
          currentPage: 2
        }
      };

      (reservationApi.get as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const result = await getAllResources();

      expect(result.length).toBe(166);
      expect(result.length).toBeGreaterThan(100);
    });

    it('should handle many pages (10 items per page)', async () => {
      // Simulate backend with 10 items per page (worst case)
      const totalResources = 173;
      const itemsPerPage = 10;
      const totalPages = Math.ceil(totalResources / itemsPerPage);

      const mockResponses: any[] = [];
      for (let page = 1; page <= totalPages; page++) {
        const startIdx = (page - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, totalResources);
        const pageSize = endIdx - startIdx;

        mockResponses.push({
          data: {
            status: 'success',
            data: Array(pageSize).fill(null).map((_, i) => ({ 
              id: `resource-${startIdx + i}`, 
              name: `Resource ${startIdx + i}`
            })),
            totalPages: totalPages,
            currentPage: page
          }
        });
      }

      (reservationApi.get as jest.Mock).mockImplementation(() => 
        Promise.resolve(mockResponses.shift())
      );

      const result = await getAllResources();

      // Must return all resources even with small page size
      expect(result.length).toBe(173);
      expect(reservationApi.get).toHaveBeenCalledTimes(totalPages);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when API fails', async () => {
      (reservationApi.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(getAllResources()).rejects.toThrow('Network error');
    });

    it('should throw error for invalid response format', async () => {
      const invalidResponse = {
        data: {
          status: 'error',
          message: 'Invalid request'
        }
      };

      (reservationApi.get as jest.Mock).mockResolvedValueOnce(invalidResponse);

      await expect(getAllResources()).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should minimize API calls by using 100 items per page', async () => {
      const firstPageResponse = {
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ id: `r-${i}` })),
          totalPages: 2,
          currentPage: 1
        }
      };

      const secondPageResponse = {
        data: {
          status: 'success',
          data: Array(73).fill(null).map((_, i) => ({ id: `r-${i + 100}` })),
          totalPages: 2,
          currentPage: 2
        }
      };

      (reservationApi.get as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      await getAllResources();

      // Should use limit of 100 (not 10 or 1000)
      expect(reservationApi.get).toHaveBeenCalledWith('/api/resources', {
        params: { page: 1, limit: 100 }
      });

      // Should only need 2 calls for 173 resources
      expect(reservationApi.get).toHaveBeenCalledTimes(2);
    });
  });
});
