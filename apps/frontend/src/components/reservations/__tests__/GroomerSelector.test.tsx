/**
 * GroomerSelector Component Tests
 * 
 * Tests groomer selection, availability checking, and UI states
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroomerSelector from '../GroomerSelector';
import staffService, { TimeOffType, TimeOffStatus, ScheduleStatus } from '../../../services/staffService';

// Mock the staff service
jest.mock('../../../services/staffService');

const mockStaffService = staffService as jest.Mocked<typeof staffService>;

describe('GroomerSelector', () => {
  const mockOnGroomerChange = jest.fn();
  const mockDate = new Date('2025-10-26T10:00:00');

  const mockGroomers = [
    {
      id: 'groomer-1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah@test.com',
      role: 'Groomer',
      department: 'Grooming',
      position: 'Senior Groomer',
      isActive: true,
      specialties: ['GROOMING', 'BATHING']
    },
    {
      id: 'groomer-2',
      firstName: 'Mike',
      lastName: 'Smith',
      email: 'mike@test.com',
      role: 'Groomer',
      department: 'Grooming',
      position: 'Groomer',
      isActive: true,
      specialties: ['GROOMING']
    },
    {
      id: 'groomer-3',
      firstName: 'Lisa',
      lastName: 'Brown',
      email: 'lisa@test.com',
      role: 'Groomer',
      department: 'Grooming',
      position: 'Junior Groomer',
      isActive: true,
      specialties: ['GROOMING']
    }
  ];

  const mockAvailability = [
    {
      id: 'avail-1',
      staffId: 'groomer-1',
      dayOfWeek: 6, // Saturday
      startTime: '08:00',
      endTime: '16:00',
      isRecurring: true,
      isAvailable: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockStaffService.getAllStaff.mockResolvedValue(mockGroomers);
    mockStaffService.getStaffAvailability.mockResolvedValue(mockAvailability);
    mockStaffService.getStaffTimeOff.mockResolvedValue([]);
    mockStaffService.getStaffSchedules.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      expect(screen.getByText(/loading groomers/i)).toBeInTheDocument();
    });

    it('should render groomer dropdown after loading', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/assign groomer/i)).toBeInTheDocument();
      });
    });

    it('should show all active groomers sorted by last name', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(mockStaffService.getAllStaff).toHaveBeenCalled();
      });

      // Open the dropdown
      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.getByText(/Brown/)).toBeInTheDocument();
        expect(screen.getByText(/Johnson/)).toBeInTheDocument();
        expect(screen.getByText(/Smith/)).toBeInTheDocument();
      });
    });

    it('should show auto-assign option', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/assign groomer/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.getByText(/auto-assign/i)).toBeInTheDocument();
      });
    });

    it('should show warning when no groomers available', async () => {
      mockStaffService.getAllStaff.mockResolvedValue([]);

      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no groomers available/i)).toBeInTheDocument();
      });
    });

    it('should show error message on load failure', async () => {
      mockStaffService.getAllStaff.mockRejectedValue(new Error('Network error'));

      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load groomers/i)).toBeInTheDocument();
      });
    });
  });

  describe('Availability Checking', () => {
    it('should check availability when date is provided', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={mockDate}
          appointmentStartTime={mockDate}
          appointmentEndTime={new Date('2025-10-26T11:00:00')}
        />
      );

      await waitFor(() => {
        expect(mockStaffService.getStaffAvailability).toHaveBeenCalled();
        expect(mockStaffService.getStaffTimeOff).toHaveBeenCalled();
        expect(mockStaffService.getStaffSchedules).toHaveBeenCalled();
      });
    });

    it('should show available status for available groomer', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={mockDate}
          appointmentStartTime={mockDate}
          appointmentEndTime={new Date('2025-10-26T11:00:00')}
        />
      );

      await waitFor(() => {
        expect(mockStaffService.getStaffAvailability).toHaveBeenCalled();
      });

      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        // Should show availability status
        expect(screen.getByText(/08:00-16:00/)).toBeInTheDocument();
      });
    });

    it('should mark groomer as off when on time off', async () => {
      mockStaffService.getStaffTimeOff.mockResolvedValue([
        {
          id: 'timeoff-1',
          staffId: 'groomer-1',
          startDate: '2025-10-25',
          endDate: '2025-10-27',
          type: TimeOffType.VACATION,
          status: TimeOffStatus.APPROVED
        }
      ]);

      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={mockDate}
        />
      );

      await waitFor(() => {
        expect(mockStaffService.getStaffTimeOff).toHaveBeenCalledWith('groomer-1');
      });
    });

    it('should mark groomer as busy when has conflicting appointment', async () => {
      mockStaffService.getStaffSchedules.mockResolvedValue([
        {
          id: 'schedule-1',
          staffId: 'groomer-1',
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '11:00',
          status: ScheduleStatus.SCHEDULED
        }
      ]);

      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={mockDate}
          appointmentStartTime={mockDate}
          appointmentEndTime={new Date('2025-10-26T11:00:00')}
        />
      );

      await waitFor(() => {
        expect(mockStaffService.getStaffSchedules).toHaveBeenCalled();
      });
    });

    it('should not check availability when no date provided', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(mockStaffService.getAllStaff).toHaveBeenCalled();
      });

      // Should not check availability
      expect(mockStaffService.getStaffAvailability).not.toHaveBeenCalled();
      expect(mockStaffService.getStaffTimeOff).not.toHaveBeenCalled();
    });

    it('should show helper text when no date selected', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/select an appointment date/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onGroomerChange when groomer is selected', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/assign groomer/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        const option = screen.getByText(/Johnson/);
        fireEvent.click(option);
      });

      expect(mockOnGroomerChange).toHaveBeenCalledWith('groomer-1');
    });

    it('should display selected groomer', async () => {
      render(
        <GroomerSelector
          selectedGroomerId="groomer-1"
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Sarah Johnson/)).toBeInTheDocument();
      });
    });

    it('should be disabled when disabled prop is true', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
          disabled={true}
        />
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/assign groomer/i);
        expect(select).toBeDisabled();
      });
    });

    it('should allow clearing selection by choosing auto-assign', async () => {
      render(
        <GroomerSelector
          selectedGroomerId="groomer-1"
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/assign groomer/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        const autoAssign = screen.getByText(/auto-assign/i);
        fireEvent.click(autoAssign);
      });

      expect(mockOnGroomerChange).toHaveBeenCalledWith('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle groomers with multiple specialties', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/assign groomer/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        // Sarah has GROOMING and BATHING specialties
        expect(screen.getByText(/BATHING/)).toBeInTheDocument();
      });
    });

    it('should filter out inactive groomers', async () => {
      const mixedGroomers = [
        ...mockGroomers,
        {
          id: 'groomer-4',
          firstName: 'Inactive',
          lastName: 'Groomer',
          email: 'inactive@test.com',
          role: 'Groomer',
          department: 'Grooming',
          position: 'Groomer',
          isActive: false,
          specialties: ['GROOMING']
        }
      ];

      mockStaffService.getAllStaff.mockResolvedValue(mixedGroomers);

      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/assign groomer/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.queryByText(/Inactive Groomer/)).not.toBeInTheDocument();
      });
    });

    it('should filter out staff without GROOMING specialty', async () => {
      const mixedStaff = [
        ...mockGroomers,
        {
          id: 'staff-1',
          firstName: 'Non',
          lastName: 'Groomer',
          email: 'non@test.com',
          role: 'Receptionist',
          department: 'Front Desk',
          position: 'Receptionist',
          isActive: true,
          specialties: ['RECEPTION']
        }
      ];

      mockStaffService.getAllStaff.mockResolvedValue(mixedStaff);

      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/assign groomer/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/assign groomer/i);
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.queryByText(/Non Groomer/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
        />
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/assign groomer/i);
        expect(select).toHaveAttribute('aria-labelledby');
      });
    });

    it('should mark as required when required prop is true', async () => {
      render(
        <GroomerSelector
          selectedGroomerId=""
          onGroomerChange={mockOnGroomerChange}
          appointmentDate={null}
          required={true}
        />
      );

      await waitFor(() => {
        const formControl = screen.getByLabelText(/assign groomer/i).closest('.MuiFormControl-root');
        expect(formControl).toHaveClass('Mui-required');
      });
    });
  });
});
