/**
 * TenantStatusManager Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TenantStatusManager from '../TenantStatusManager';
import { SuperAdminProvider } from '../../../contexts/SuperAdminContext';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('TenantStatusManager', () => {
  const mockTenant = {
    id: 'tenant-123',
    businessName: 'Test Business',
    subdomain: 'test',
    status: 'ACTIVE',
    isActive: true,
    isPaused: false,
  };

  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  const renderWithContext = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <SuperAdminProvider>
          {component}
        </SuperAdminProvider>
      </MemoryRouter>
    );
  };

  it('should not render if not super admin', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { container } = renderWithContext(
      <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render super admin controls for active tenant', () => {
    renderWithContext(
      <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
    );

    expect(screen.getByText('🔐 Super Admin Controls')).toBeInTheDocument();
    expect(screen.getByText('Suspend Tenant')).toBeInTheDocument();
    expect(screen.getByText('Delete Tenant')).toBeInTheDocument();
  });

  it('should show activate button for suspended tenant', () => {
    const suspendedTenant = {
      ...mockTenant,
      status: 'PAUSED',
      isPaused: true,
      suspendedAt: new Date().toISOString(),
      suspendedReason: 'Payment overdue',
    };

    renderWithContext(
      <TenantStatusManager tenant={suspendedTenant} onStatusChange={mockOnStatusChange} />
    );

    expect(screen.getByText('Activate Tenant')).toBeInTheDocument();
    expect(screen.getByText(/Payment overdue/)).toBeInTheDocument();
  });

  it('should show restore button for deleted tenant', () => {
    const deletedTenant = {
      ...mockTenant,
      status: 'DELETED',
      deletedAt: new Date().toISOString(),
    };

    renderWithContext(
      <TenantStatusManager tenant={deletedTenant} onStatusChange={mockOnStatusChange} />
    );

    expect(screen.getByText('Restore Tenant')).toBeInTheDocument();
  });

  describe('Suspend Tenant', () => {
    it('should open suspend dialog when button clicked', () => {
      renderWithContext(
        <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Suspend Tenant'));

      expect(screen.getByText('Suspend Tenant', { selector: 'h2' })).toBeInTheDocument();
      expect(screen.getByLabelText('Suspension Reason')).toBeInTheDocument();
    });

    it('should require reason for suspension', async () => {
      renderWithContext(
        <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Suspend Tenant'));

      const suspendButton = screen.getByRole('button', { name: /Suspend Tenant/i });
      expect(suspendButton).toBeDisabled();
    });

    it('should suspend tenant successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      renderWithContext(
        <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Suspend Tenant'));

      const reasonInput = screen.getByLabelText('Suspension Reason');
      fireEvent.change(reasonInput, { target: { value: 'Payment overdue' } });

      const suspendButton = screen.getByRole('button', { name: /Suspend Tenant/i });
      fireEvent.click(suspendButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:4004/api/super-admin/tenants/tenant-123/suspend',
          { reason: 'Payment overdue' },
          expect.objectContaining({
            headers: {
              Authorization: 'Bearer mock-token',
            },
          })
        );
      });

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });

    it('should show error on suspend failure', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to suspend tenant',
          },
        },
      });

      renderWithContext(
        <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Suspend Tenant'));

      const reasonInput = screen.getByLabelText('Suspension Reason');
      fireEvent.change(reasonInput, { target: { value: 'Test reason' } });

      const suspendButton = screen.getByRole('button', { name: /Suspend Tenant/i });
      fireEvent.click(suspendButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to suspend tenant')).toBeInTheDocument();
      });
    });
  });

  describe('Activate Tenant', () => {
    it('should activate suspended tenant', async () => {
      const suspendedTenant = {
        ...mockTenant,
        status: 'PAUSED',
        isPaused: true,
      };

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      renderWithContext(
        <TenantStatusManager tenant={suspendedTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Activate Tenant'));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:4004/api/super-admin/tenants/tenant-123/activate',
          {},
          expect.objectContaining({
            headers: {
              Authorization: 'Bearer mock-token',
            },
          })
        );
      });

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Tenant', () => {
    it('should open delete dialog with warning', () => {
      renderWithContext(
        <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Delete Tenant'));

      expect(screen.getByText('Delete Tenant', { selector: 'h2' })).toBeInTheDocument();
      expect(screen.getByText(/soft delete/i)).toBeInTheDocument();
      expect(screen.getByText(/1 year/i)).toBeInTheDocument();
    });

    it('should delete tenant successfully', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: { success: true },
      });

      renderWithContext(
        <TenantStatusManager tenant={mockTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Delete Tenant'));

      const deleteButton = screen.getByRole('button', { name: /Delete Tenant/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(
          'http://localhost:4004/api/super-admin/tenants/tenant-123',
          expect.objectContaining({
            headers: {
              Authorization: 'Bearer mock-token',
            },
            data: { reason: '' },
          })
        );
      });

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });
  });

  describe('Restore Tenant', () => {
    it('should restore deleted tenant', async () => {
      const deletedTenant = {
        ...mockTenant,
        status: 'DELETED',
        deletedAt: new Date().toISOString(),
      };

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      renderWithContext(
        <TenantStatusManager tenant={deletedTenant} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('Restore Tenant'));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:4004/api/super-admin/tenants/tenant-123/restore',
          {},
          expect.objectContaining({
            headers: {
              Authorization: 'Bearer mock-token',
            },
          })
        );
      });

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });
  });
});
