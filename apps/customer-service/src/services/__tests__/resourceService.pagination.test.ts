/**
 * Resource Service Pagination Tests
 * 
 * Tests pagination logic to ensure all resources are fetched
 * Regression tests for pagination bug fix
 */

import { getAllResources } from '../resourceService';

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('Resource Service Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllResources', () => {
    it('should fetch all pages when totalPages > 1', async () => {
      // Mock first page response
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-1', name: 'Resource 1' },
            { id: 'res-2', name: 'Resource 2' }
          ],
          totalPages: 3,
          currentPage: 1,
          results: 2
        }
      });

      // Mock second page response
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-3', name: 'Resource 3' },
            { id: 'res-4', name: 'Resource 4' }
          ],
          totalPages: 3,
          currentPage: 2,
          results: 2
        }
      });

      // Mock third page response
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-5', name: 'Resource 5' }
          ],
          totalPages: 3,
          currentPage: 3,
          results: 1
        }
      });

      const result = await getAllResources();

      // Should have called API 3 times (once per page)
      expect(axios.get).toHaveBeenCalledTimes(3);
      
      // Should return all resources combined
      expect(result).toHaveLength(5);
      expect(result[0].id).toBe('res-1');
      expect(result[4].id).toBe('res-5');
    });

    it('should handle single page correctly', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-1', name: 'Resource 1' },
            { id: 'res-2', name: 'Resource 2' }
          ],
          totalPages: 1,
          currentPage: 1,
          results: 2
        }
      });

      const result = await getAllResources();

      // Should only call API once
      expect(axios.get).toHaveBeenCalledTimes(1);
      
      // Should return all resources
      expect(result).toHaveLength(2);
    });

    it('should combine results from multiple pages', async () => {
      // Page 1
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-1', type: 'STANDARD_SUITE' },
            { id: 'res-2', type: 'STANDARD_SUITE' }
          ],
          totalPages: 2,
          currentPage: 1
        }
      });

      // Page 2
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-3', type: 'VIP_SUITE' }
          ],
          totalPages: 2,
          currentPage: 2
        }
      });

      const result = await getAllResources();

      // Should combine all results
      expect(result).toHaveLength(3);
      expect(result.map(r => r.id)).toEqual(['res-1', 'res-2', 'res-3']);
    });

    it('should maintain correct order across pages', async () => {
      // Page 1
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-1', name: 'A' },
            { id: 'res-2', name: 'B' }
          ],
          totalPages: 2,
          currentPage: 1
        }
      });

      // Page 2
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            { id: 'res-3', name: 'C' },
            { id: 'res-4', name: 'D' }
          ],
          totalPages: 2,
          currentPage: 2
        }
      });

      const result = await getAllResources();

      // Order should be maintained
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('B');
      expect(result[2].name).toBe('C');
      expect(result[3].name).toBe('D');
    });

    it('should handle empty results', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [],
          totalPages: 0,
          currentPage: 1,
          results: 0
        }
      });

      const result = await getAllResources();

      expect(result).toHaveLength(0);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(getAllResources()).rejects.toThrow('Network error');
    });

    it('should pass correct page numbers to API', async () => {
      // Page 1
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'res-1' }],
          totalPages: 3,
          currentPage: 1
        }
      });

      // Page 2
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'res-2' }],
          totalPages: 3,
          currentPage: 2
        }
      });

      // Page 3
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'res-3' }],
          totalPages: 3,
          currentPage: 3
        }
      });

      await getAllResources();

      // Check that correct page numbers were passed
      expect(axios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('page=1'));
      expect(axios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('page=2'));
      expect(axios.get).toHaveBeenNthCalledWith(3, expect.stringContaining('page=3'));
    });

    it('should use appropriate page size', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(100).fill({ id: 'res' }),
          totalPages: 2,
          currentPage: 1
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(73).fill({ id: 'res' }),
          totalPages: 2,
          currentPage: 2
        }
      });

      await getAllResources();

      // Should use limit=100 for efficient pagination
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=100')
      );
    });

    it('should handle large datasets efficiently', async () => {
      // Simulate 173 resources across 2 pages
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({ id: `res-${i}` })),
          totalPages: 2,
          currentPage: 1
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(73).fill(null).map((_, i) => ({ id: `res-${i + 100}` })),
          totalPages: 2,
          currentPage: 2
        }
      });

      const result = await getAllResources();

      expect(result).toHaveLength(173);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle filters with pagination', async () => {
      const filters = {
        type: 'STANDARD_SUITE',
        isActive: true
      };

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'res-1', type: 'STANDARD_SUITE' }],
          totalPages: 1,
          currentPage: 1
        }
      });

      await getAllResources(filters);

      // Should pass filters to API
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('type=STANDARD_SUITE')
      );
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('isActive=true')
      );
    });

    it('should not create infinite loop', async () => {
      // Mock response that could cause infinite loop if not handled
      axios.get.mockResolvedValue({
        data: {
          status: 'success',
          data: [{ id: 'res-1' }],
          totalPages: 5, // Says there are 5 pages
          currentPage: 1
        }
      });

      const result = await getAllResources();

      // Should stop after fetching all pages
      expect(axios.get).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(5);
    });

    it('should handle missing pagination metadata', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 'res-1' }]
          // Missing totalPages, currentPage
        }
      });

      const result = await getAllResources();

      // Should handle gracefully and return what it got
      expect(result).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle partial page on last request', async () => {
      // Page 1: Full page (100 items)
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(100).fill({ id: 'res' }),
          totalPages: 2,
          currentPage: 1
        }
      });

      // Page 2: Partial page (23 items)
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(23).fill({ id: 'res' }),
          totalPages: 2,
          currentPage: 2
        }
      });

      const result = await getAllResources();

      expect(result).toHaveLength(123);
    });

    it('should handle concurrent requests correctly', async () => {
      axios.get.mockResolvedValue({
        data: {
          status: 'success',
          data: [{ id: 'res-1' }],
          totalPages: 1,
          currentPage: 1
        }
      });

      // Make multiple concurrent requests
      const results = await Promise.all([
        getAllResources(),
        getAllResources(),
        getAllResources()
      ]);

      // Each should get complete results
      results.forEach(result => {
        expect(result).toHaveLength(1);
      });
    });
  });

  describe('Regression Tests', () => {
    it('should not stop at first page (regression)', async () => {
      // This was the original bug - only fetching first page
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(100).fill({ id: 'res' }),
          totalPages: 2,
          currentPage: 1
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(73).fill({ id: 'res' }),
          totalPages: 2,
          currentPage: 2
        }
      });

      const result = await getAllResources();

      // Should fetch all pages, not just first
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(173);
    });

    it('should fetch all 173 kennels (real-world scenario)', async () => {
      // Simulate real pagination for 173 kennels
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(100).fill(null).map((_, i) => ({
            id: `kennel-${i}`,
            name: `T-${i + 1}`,
            type: 'STANDARD_SUITE'
          })),
          totalPages: 2,
          currentPage: 1,
          results: 100
        }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: Array(73).fill(null).map((_, i) => ({
            id: `kennel-${i + 100}`,
            name: `T-${i + 101}`,
            type: 'STANDARD_SUITE'
          })),
          totalPages: 2,
          currentPage: 2,
          results: 73
        }
      });

      const result = await getAllResources();

      expect(result).toHaveLength(173);
      expect(result[0].name).toBe('T-1');
      expect(result[172].name).toBe('T-173');
    });
  });
});
