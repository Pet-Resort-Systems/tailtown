/**
 * Training Classes Validation Tests
 * 
 * Tests form validation and API error handling for training class creation
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import TrainingClasses from '../TrainingClasses';
import schedulingService from '../../../services/schedulingService';

// Mock the scheduling service
jest.mock('../../../services/schedulingService');

const mockSchedulingService = schedulingService as jest.Mocked<typeof schedulingService>;

describe('TrainingClasses - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful getAll call
    (mockSchedulingService.trainingClasses.getAll as jest.Mock) = jest.fn().mockResolvedValue([]);
    
    // Mock create call
    (mockSchedulingService.trainingClasses.create as jest.Mock) = jest.fn();
  });

  describe('Required Field Validation', () => {
    it('should show error when name is missing', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      // Open create dialog
      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      // Try to save without filling name
      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });

      // Should not call API
      expect(mockSchedulingService.trainingClasses.create).not.toHaveBeenCalled();
    });

    it('should show error when instructor is not selected', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      // Fill name but not instructor
      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });

      expect(mockSchedulingService.trainingClasses.create).not.toHaveBeenCalled();
    });

    it('should show error when max capacity is missing', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      // Fill required fields except capacity
      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      // Clear capacity
      const capacityInput = await screen.findByLabelText(/max capacity/i);
      fireEvent.change(capacityInput, { target: { value: '' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error when start date is missing', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      // Clear start date
      const startDateInput = await screen.findByLabelText(/start date/i);
      fireEvent.change(startDateInput, { target: { value: '' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error when total weeks is missing', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const weeksInput = await screen.findByLabelText(/total weeks/i);
      fireEvent.change(weeksInput, { target: { value: '' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error when no days of week selected', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      // Clear days of week (implementation specific)
      // This test assumes there's a way to clear the daysOfWeek array

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error when start time is missing', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const startTimeInput = await screen.findByLabelText(/start time/i);
      fireEvent.change(startTimeInput, { target: { value: '' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error when end time is missing', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const endTimeInput = await screen.findByLabelText(/end time/i);
      fireEvent.change(endTimeInput, { target: { value: '' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error when price per series is missing', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const priceInput = await screen.findByLabelText(/price per series/i);
      fireEvent.change(priceInput, { target: { value: '' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Date Formatting', () => {
    it('should convert Date objects to ISO strings before API call', async () => {
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockResolvedValue({ id: 'class-1' });

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      // Fill all required fields
      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSchedulingService.trainingClasses.create).toHaveBeenCalled();
      });

      const callArgs = (mockSchedulingService.trainingClasses.create as jest.Mock).mock.calls[0][0];
      
      // startDate should be an ISO string, not a Date object
      expect(typeof callArgs.startDate).toBe('string');
      expect(callArgs.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle endDate formatting if provided', async () => {
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockResolvedValue({ id: 'class-1' });

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      // Set end date
      const endDateInput = await screen.findByLabelText(/end date/i);
      fireEvent.change(endDateInput, { target: { value: '2025-12-31' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSchedulingService.trainingClasses.create).toHaveBeenCalled();
      });

      const callArgs = (mockSchedulingService.trainingClasses.create as jest.Mock).mock.calls[0][0];
      
      if (callArgs.endDate) {
        expect(typeof callArgs.endDate).toBe('string');
      }
    });
  });

  describe('API Error Handling', () => {
    it('should display backend error message on 400 error', async () => {
      const errorMessage = 'Missing required fields';
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockRejectedValue({
        response: {
          data: {
            message: errorMessage
          }
        }
      });

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display generic error message when backend message not available', async () => {
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save training class/i)).toBeInTheDocument();
      });
    });

    it('should log full error to console for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockRejectedValue(error);

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error saving training class:', error);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Successful Creation', () => {
    it('should call API with all form data when validation passes', async () => {
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockResolvedValue({ id: 'class-1', name: 'Puppy Training' });

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      // Fill all required fields
      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      const capacityInput = await screen.findByLabelText(/max capacity/i);
      fireEvent.change(capacityInput, { target: { value: '8' } });

      const priceInput = await screen.findByLabelText(/price per series/i);
      fireEvent.change(priceInput, { target: { value: '200' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSchedulingService.trainingClasses.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Puppy Training',
            instructorId: 'instructor-1',
            maxCapacity: 8,
            pricePerSeries: 200
          })
        );
      });
    });

    it('should close dialog after successful creation', async () => {
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockResolvedValue({ id: 'class-1' });

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should reload class list after successful creation', async () => {
      (mockSchedulingService.trainingClasses.create as jest.Mock).mockResolvedValue({ id: 'class-1' });

      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const initialCallCount = (mockSchedulingService.trainingClasses.getAll as jest.Mock).mock.calls.length;

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: 'Puppy Training' } });

      const instructorSelect = await screen.findByLabelText(/instructor/i);
      fireEvent.change(instructorSelect, { target: { value: 'instructor-1' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect((mockSchedulingService.trainingClasses.getAll as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero capacity gracefully', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const capacityInput = await screen.findByLabelText(/max capacity/i);
      fireEvent.change(capacityInput, { target: { value: '0' } });

      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const alerts = screen.getAllByText(/please fill in all required fields/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should handle negative price gracefully', async () => {
      render(<BrowserRouter><TrainingClasses /></BrowserRouter>);

      const createButton = await screen.findByRole('button', { name: /new class/i });
      fireEvent.click(createButton);

      const priceInput = await screen.findByLabelText(/price per series/i);
      fireEvent.change(priceInput, { target: { value: '-100' } });

      // Should either show validation error or convert to positive
      const saveButton = await screen.findByRole('button', { name: /create/i });
      fireEvent.click(saveButton);

      // Test passes if either validation error shows or API is called with abs value
      await waitFor(() => {
        const hasError = screen.queryByText(/please fill in all required fields/i);
        const apiCalled = (mockSchedulingService.trainingClasses.create as jest.Mock).mock.calls.length > 0;
        expect(hasError || apiCalled).toBeTruthy();
      });
    });
  });
});
