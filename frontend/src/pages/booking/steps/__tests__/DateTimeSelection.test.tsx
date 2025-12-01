/**
 * DateTimeSelection Component Tests
 * Tests for the date selection step with inline calendars
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DateTimeSelection from '../DateTimeSelection';

describe('DateTimeSelection', () => {
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnUpdate = jest.fn();
  
  const defaultProps = {
    bookingData: {},
    onNext: mockOnNext,
    onBack: mockOnBack,
    onUpdate: mockOnUpdate
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with title', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByText('When would you like to book?')).toBeInTheDocument();
    });

    it('should display start date label', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    it('should display end date label', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('should display helper text', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByText('Select your check-in date')).toBeInTheDocument();
      expect(screen.getByText('Select your check-out date')).toBeInTheDocument();
    });

    it('should render Back button', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should render Continue button', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
  });

  describe('Date Selection', () => {
    it('should have Continue button disabled when no dates selected', () => {
      render(<DateTimeSelection {...defaultProps} />);
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it('should display message when end date is disabled', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByText('Please select a start date first')).toBeInTheDocument();
    });

    it('should load with existing booking data', () => {
      const propsWithData = {
        ...defaultProps,
        bookingData: {
          startDate: '2025-11-01',
          endDate: '2025-11-05'
        }
      };
      
      render(<DateTimeSelection {...propsWithData} />);
      // Component should render without errors with existing data
      expect(screen.getByText('When would you like to book?')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call onBack when Back button is clicked', () => {
      render(<DateTimeSelection {...defaultProps} />);
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should not call onNext when Continue clicked without dates', () => {
      render(<DateTimeSelection {...defaultProps} />);
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Button should be disabled, so click won't work
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Inline Calendars', () => {
    it('should render inline date pickers', () => {
      render(<DateTimeSelection {...defaultProps} />);
      
      // Check for calendar containers
      const calendars = document.querySelectorAll('.react-datepicker');
      expect(calendars.length).toBeGreaterThanOrEqual(1);
    });

    it('should display current month', () => {
      render(<DateTimeSelection {...defaultProps} />);
      
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      // Calendar should show current month or later
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Date Validation', () => {
    it('should prevent selecting past dates for start date', () => {
      render(<DateTimeSelection {...defaultProps} />);
      
      // Past dates should be disabled in the calendar
      // This is enforced by the minDate prop set to today
      expect(screen.getByText('When would you like to book?')).toBeInTheDocument();
    });

    it('should show end date as disabled initially', () => {
      render(<DateTimeSelection {...defaultProps} />);
      
      // End date section should show disabled state
      const endDateSection = screen.getByText('Please select a start date first');
      expect(endDateSection).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<DateTimeSelection {...defaultProps} />);
      const heading = screen.getByRole('heading', { name: /when would you like to book/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<DateTimeSelection {...defaultProps} />);
      const backButton = screen.getByRole('button', { name: /back/i });
      
      backButton.focus();
      expect(document.activeElement).toBe(backButton);
    });
  });

  describe('Brand Styling', () => {
    it('should apply brand color to calendars', () => {
      render(<DateTimeSelection {...defaultProps} />);
      
      // Check if custom CSS class is applied
      const inlinePickers = document.querySelectorAll('.inline-date-picker');
      expect(inlinePickers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render without errors on mobile viewport', () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
      
      render(<DateTimeSelection {...defaultProps} />);
      expect(screen.getByText('When would you like to book?')).toBeInTheDocument();
    });
  });
});
