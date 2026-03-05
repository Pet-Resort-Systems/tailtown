/**
 * SuperAdminContext Tests
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SuperAdminProvider, useSuperAdmin } from '../SuperAdminContext';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SuperAdminContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SuperAdminProvider>{children}</SuperAdminProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: '123',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'SUPER_ADMIN',
            },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4004/api/super-admin/login',
        {
          email: 'test@example.com',
          password: 'password123',
        }
      );

      expect(localStorage.getItem('superAdminAccessToken')).toBe('access-token');
      expect(localStorage.getItem('superAdminRefreshToken')).toBe('refresh-token');
      expect(result.current.superAdmin).toEqual({
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
      });
    });

    it('should throw error on failed login', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      });

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await expect(
        result.current.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should logout and clear tokens', async () => {
      localStorage.setItem('superAdminAccessToken', 'access-token');
      localStorage.setItem('superAdminRefreshToken', 'refresh-token');

      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4004/api/super-admin/logout',
        {},
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer access-token',
          },
        })
      );

      expect(localStorage.getItem('superAdminAccessToken')).toBeNull();
      expect(localStorage.getItem('superAdminRefreshToken')).toBeNull();
      expect(result.current.superAdmin).toBeNull();
    });

    it('should clear tokens even if API call fails', async () => {
      localStorage.setItem('superAdminAccessToken', 'access-token');
      localStorage.setItem('superAdminRefreshToken', 'refresh-token');

      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('superAdminAccessToken')).toBeNull();
      expect(localStorage.getItem('superAdminRefreshToken')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      localStorage.setItem('superAdminRefreshToken', 'old-refresh-token');

      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4004/api/super-admin/refresh',
        {
          refreshToken: 'old-refresh-token',
        }
      );

      expect(localStorage.getItem('superAdminAccessToken')).toBe('new-access-token');
      expect(localStorage.getItem('superAdminRefreshToken')).toBe('new-refresh-token');
    });

    it('should logout on refresh failure', async () => {
      localStorage.setItem('superAdminRefreshToken', 'expired-token');

      mockedAxios.post.mockRejectedValue(new Error('Token expired'));

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await expect(result.current.refreshToken()).rejects.toThrow();

      expect(localStorage.getItem('superAdminAccessToken')).toBeNull();
      expect(localStorage.getItem('superAdminRefreshToken')).toBeNull();
    });
  });

  describe('initialization', () => {
    it('should load super admin from localStorage on mount', async () => {
      localStorage.setItem('superAdminAccessToken', 'stored-token');

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: '123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'SUPER_ADMIN',
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:4004/api/super-admin/me',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer stored-token',
          },
        })
      );

      expect(result.current.superAdmin).toEqual({
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
      });
    });

    it('should clear invalid tokens on mount', async () => {
      localStorage.setItem('superAdminAccessToken', 'invalid-token');

      mockedAxios.get.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useSuperAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(localStorage.getItem('superAdminAccessToken')).toBeNull();
      expect(localStorage.getItem('superAdminRefreshToken')).toBeNull();
      expect(result.current.superAdmin).toBeNull();
    });
  });
});
