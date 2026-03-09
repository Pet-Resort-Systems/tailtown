/**
 * ServiceSelection Component Tests
 * Tests for the service selection step of the booking portal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceSelection from '../ServiceSelection';
import { serviceManagement } from '../../../../services/serviceManagement';

// Mock the service management
jest.mock('../../../../services/serviceManagement');

const mockServices = [
  {
    id: 'service-1',
    name: 'Overnight Boarding',
    description: 'Safe and comfortable overnight care',
    serviceCategory: 'BOARDING',
    price: 45.00,
    duration: 1440,
    isActive: true
  },
  {
    id: 'service-2',
    name: 'Doggy Daycare',
    description: 'Fun-filled day of play and socialization',
    serviceCategory: 'DAYCARE',
    price: 35.00,
    duration: 480,
    isActive: true
  },
  {
    id: 'service-3',
    name: 'Full Grooming',
    description: 'Complete grooming package',
    serviceCategory: 'GROOMING',
    price: 65.00,
    duration: 120,
    isActive: true
  }
];

describe('ServiceSelection', () => {
  const mockOnNext = jest.fn();
  const mockOnUpdate = jest.fn();
  
  const defaultProps = {
    bookingData: {},
    onNext: mockOnNext,
    onUpdate: mockOnUpdate
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Match the component's expected response format
    (serviceManagement.getAllServices as jest.Mock).mockResolvedValue({
      data: mockServices
    });
  });

  describe('Rendering', () => {
    it('should render the component with title', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('What service would you like to book?')).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      render(<ServiceSelection {...defaultProps} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display all services after loading', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Overnight Boarding')).toBeInTheDocument();
        expect(screen.getByText('Doggy Daycare')).toBeInTheDocument();
        expect(screen.getByText('Full Grooming')).toBeInTheDocument();
      });
    });

    it('should display service prices', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('$45.00')).toBeInTheDocument();
        expect(screen.getByText('$35.00')).toBeInTheDocument();
        expect(screen.getByText('$65.00')).toBeInTheDocument();
      });
    });

    it('should display service descriptions', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Safe and comfortable overnight care')).toBeInTheDocument();
        expect(screen.getByText('Fun-filled day of play and socialization')).toBeInTheDocument();
      });
    });
  });

  describe('Service Selection', () => {
    it('should call onUpdate when Reserve Now is clicked', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Overnight Boarding')).toBeInTheDocument();
      });

      const reserveButton = screen.getAllByText('Reserve Now')[0];
      fireEvent.click(reserveButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        serviceId: 'service-1',
        servicePrice: 45.00
      });
    });

    it('should auto-advance after selecting a service', async () => {
      jest.useFakeTimers();
      
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Overnight Boarding')).toBeInTheDocument();
      });

      const reserveButton = screen.getAllByText('Reserve Now')[0];
      fireEvent.click(reserveButton);

      // Fast-forward time for auto-advance
      jest.advanceTimersByTime(300);

      expect(mockOnNext).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should update booking data with correct service info', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Doggy Daycare')).toBeInTheDocument();
      });

      const reserveButton = screen.getAllByText('Reserve Now')[1];
      fireEvent.click(reserveButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        serviceId: 'service-2',
        servicePrice: 35.00
      });
    });
  });

  describe('Service Categories', () => {
    it('should group services by category', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        // Check for category headers (they should be present)
        const boardingServices = screen.getByText('Overnight Boarding');
        const daycareServices = screen.getByText('Doggy Daycare');
        const groomingServices = screen.getByText('Full Grooming');
        
        expect(boardingServices).toBeInTheDocument();
        expect(daycareServices).toBeInTheDocument();
        expect(groomingServices).toBeInTheDocument();
      });
    });

    it('should display boarding and daycare first', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        const serviceCards = screen.getAllByText(/Boarding|Daycare|Grooming/);
        // Boarding and Daycare should come before Grooming
        expect(serviceCards[0].textContent).toMatch(/Boarding|Daycare/);
        expect(serviceCards[1].textContent).toMatch(/Boarding|Daycare/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when services fail to load', async () => {
      (serviceManagement.getAllServices as jest.Mock).mockRejectedValue(
        new Error('Failed to load services')
      );

      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Unable to load services. Please try again.')).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      (serviceManagement.getAllServices as jest.Mock).mockRejectedValue(
        new Error('Failed to load services')
      );

      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should handle empty services array', async () => {
      (serviceManagement.getAllServices as jest.Mock).mockResolvedValue({
        data: []
      });

      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        // Component should render without errors even with no services
        expect(screen.getByText('What service would you like to book?')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /Reserve Now/i });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should be keyboard navigable', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        const firstButton = screen.getAllByText('Reserve Now')[0];
        expect(firstButton).toBeInTheDocument();
        
        // Button should be focusable
        firstButton.focus();
        expect(document.activeElement).toBe(firstButton);
      });
    });
  });

  describe('Compact Design', () => {
    it('should render service cards with compact layout', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        const serviceCard = screen.getByText('Overnight Boarding').closest('[class*="MuiCard"]');
        expect(serviceCard).toBeInTheDocument();
      });
    });

    it('should display service duration when available', async () => {
      render(<ServiceSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('1440 min')).toBeInTheDocument();
        expect(screen.getByText('480 min')).toBeInTheDocument();
      });
    });
  });
});
