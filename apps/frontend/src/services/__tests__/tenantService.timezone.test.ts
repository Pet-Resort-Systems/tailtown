import axios from 'axios';
import { tenantService } from '../tenantService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TenantService - Timezone Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getCurrentTenantTimezone', () => {
    it('should return cached timezone from localStorage', async () => {
      localStorage.setItem('tenant_timezone', 'America/New_York');

      const timezone = await tenantService.getCurrentTenantTimezone();

      expect(timezone).toBe('America/New_York');
      // Should not make API call if cached
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch timezone from API if not cached', async () => {
      const mockTenant = {
        id: 'tenant-123',
        timezone: 'America/Chicago',
        businessName: 'Test Business'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTenant } });

      // Mock window.location.hostname
      Object.defineProperty(window, 'location', {
        value: { hostname: 'test.canicloud.com' },
        writable: true
      });

      const timezone = await tenantService.getCurrentTenantTimezone();

      expect(timezone).toBe('America/Chicago');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/tenants/subdomain/test'),
        expect.any(Object)
      );
    });

    it('should return default timezone if API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      Object.defineProperty(window, 'location', {
        value: { hostname: 'test.canicloud.com' },
        writable: true
      });

      const timezone = await tenantService.getCurrentTenantTimezone();

      expect(timezone).toBe('America/Denver'); // Default timezone
    });

    it('should use default timezone if tenant has no timezone set', async () => {
      const mockTenant = {
        id: 'tenant-123',
        businessName: 'Test Business'
        // No timezone property
      };

      mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTenant } });

      Object.defineProperty(window, 'location', {
        value: { hostname: 'test.canicloud.com' },
        writable: true
      });

      const timezone = await tenantService.getCurrentTenantTimezone();

      expect(timezone).toBe('America/Denver'); // Default timezone
    });
  });

  describe('getTenantBySubdomain', () => {
    it('should fetch tenant by subdomain', async () => {
      const mockTenant = {
        id: 'tenant-123',
        subdomain: 'test',
        timezone: 'America/Los_Angeles',
        businessName: 'Test Business'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTenant } });

      const tenant = await tenantService.getTenantBySubdomain('test');

      expect(tenant).toEqual(mockTenant);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/tenants/subdomain/test'),
        expect.any(Object)
      );
    });

    it('should include authorization headers', async () => {
      localStorage.setItem('token', 'test-token');

      const mockTenant = {
        id: 'tenant-123',
        subdomain: 'test',
        timezone: 'America/Phoenix'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTenant } });

      await tenantService.getTenantBySubdomain('test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Not found'));

      await expect(
        tenantService.getTenantBySubdomain('nonexistent')
      ).rejects.toThrow('Not found');
    });
  });

  describe('Timezone Update Integration', () => {
    it('should cache timezone after successful fetch', async () => {
      const mockTenant = {
        id: 'tenant-123',
        timezone: 'America/New_York',
        businessName: 'Test Business'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTenant } });

      Object.defineProperty(window, 'location', {
        value: { hostname: 'test.canicloud.com' },
        writable: true
      });

      // First call - should fetch from API
      const timezone1 = await tenantService.getCurrentTenantTimezone();
      expect(timezone1).toBe('America/New_York');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const timezone2 = await tenantService.getCurrentTenantTimezone();
      expect(timezone2).toBe('America/New_York');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should handle timezone format variations', async () => {
      const timezones = [
        'America/New_York',
        'America/Los_Angeles',
        'America/Chicago',
        'America/Denver',
        'America/Phoenix',
        'Europe/London',
        'Asia/Tokyo'
      ];

      for (const tz of timezones) {
        localStorage.clear();
        const mockTenant = { id: 'test', timezone: tz };
        mockedAxios.get.mockResolvedValueOnce({ data: { data: mockTenant } });

        Object.defineProperty(window, 'location', {
          value: { hostname: 'test.canicloud.com' },
          writable: true
        });

        const result = await tenantService.getCurrentTenantTimezone();
        expect(result).toBe(tz);
      }
    });
  });
});
