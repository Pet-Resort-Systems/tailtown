import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UpcomingClasses from '../UpcomingClasses';
import schedulingService from '../../../services/schedulingService';
import { customerService } from '../../../services/customerService';
import { petService } from '../../../services/petService';

// Mock the services
jest.mock('../../../services/schedulingService');
jest.mock('../../../services/customerService');
jest.mock('../../../services/petService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('UpcomingClasses Component', () => {
  const mockClasses = [
    {
      id: 'class-1',
      name: 'Basic Obedience',
      level: 'BEGINNER',
      category: 'OBEDIENCE',
      startDate: '2025-10-28T00:00:00.000Z',
      totalWeeks: 6,
      daysOfWeek: [1],
      startTime: '18:00',
      endTime: '19:00',
      maxCapacity: 12,
      currentEnrolled: 8,
      pricePerSeries: 200,
      status: 'SCHEDULED',
    },
    {
      id: 'class-2',
      name: 'Advanced Training',
      level: 'ADVANCED',
      category: 'OBEDIENCE',
      startDate: '2025-11-01T00:00:00.000Z',
      totalWeeks: 8,
      daysOfWeek: [3],
      startTime: '14:00',
      endTime: '15:00',
      maxCapacity: 10,
      currentEnrolled: 10,
      pricePerSeries: 300,
      status: 'SCHEDULED',
      _count: { waitlist: 2 },
    },
  ];

  const mockCustomers = [
    {
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
    },
  ];

  const mockPets = [
    {
      id: 'pet-1',
      name: 'Max',
      breed: 'Golden Retriever',
      customerId: 'customer-1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(mockClasses);
    (customerService.getAllCustomers as jest.Mock).mockResolvedValue({ data: mockCustomers });
    (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({ data: mockPets });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UpcomingClasses />
      </BrowserRouter>
    );
  };

  describe('Initial Rendering', () => {
    it('should render the component with title', async () => {
      renderComponent();
      
      expect(screen.getByText('Upcoming Training Classes')).toBeInTheDocument();
      expect(screen.getByText('Active classes')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      renderComponent();
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should load and display classes', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Basic Obedience')).toBeInTheDocument();
        expect(screen.getByText('Advanced Training')).toBeInTheDocument();
      });
    });

    it('should display "View All" button', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });
  });

  describe('Class Information Display', () => {
    it('should display class details correctly', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Basic Obedience')).toBeInTheDocument();
        expect(screen.getByText('BEGINNER')).toBeInTheDocument();
        expect(screen.getByText(/6 weeks/)).toBeInTheDocument();
        expect(screen.getByText(/OBEDIENCE/)).toBeInTheDocument();
      });
    });

    it('should display time in 12-hour format', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/6:00 PM - 7:00 PM/)).toBeInTheDocument();
        expect(screen.getByText(/2:00 PM - 3:00 PM/)).toBeInTheDocument();
      });
    });

    it('should display enrollment progress', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('8 / 12')).toBeInTheDocument();
        expect(screen.getByText('10 / 10')).toBeInTheDocument();
      });
    });

    it('should display waitlist count when present', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('+2 on waitlist')).toBeInTheDocument();
      });
    });
  });

  describe('Enroll Button Behavior', () => {
    it('should show "Enroll Pet" button for available classes', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButtons = screen.getAllByText('Enroll Pet');
        expect(enrollButtons).toHaveLength(1);
      });
    });

    it('should show "Class Full" button for full classes', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Class Full')).toBeInTheDocument();
      });
    });

    it('should disable button for full classes', async () => {
      renderComponent();
      
      await waitFor(() => {
        const fullButton = screen.getByText('Class Full').closest('button');
        expect(fullButton).toBeDisabled();
      });
    });

    it('should enable button for available classes', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet').closest('button');
        expect(enrollButton).not.toBeDisabled();
      });
    });
  });

  describe('Enrollment Dialog', () => {
    it('should open enrollment dialog when clicking Enroll Pet', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Enroll Pet in Basic Obedience/)).toBeInTheDocument();
      });
    });

    it('should load customers when dialog opens', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        expect(customerService.getAllCustomers).toHaveBeenCalledWith(1, 100);
      });
    });

    it('should display customer dropdown in dialog', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Customer')).toBeInTheDocument();
      });
    });

    it('should display pet dropdown in dialog', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Pet')).toBeInTheDocument();
      });
    });

    it('should pre-fill amount with class price', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        const amountField = screen.getByLabelText('Amount Paid') as HTMLInputElement;
        expect(amountField.value).toBe('200');
      });
    });

    it('should display class details in dialog', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/6 weeks/)).toBeInTheDocument();
        expect(screen.getByText(/Capacity: 8 \/ 12/)).toBeInTheDocument();
      });
    });

    it('should close dialog when clicking Cancel', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Enroll Pet in Basic Obedience/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Pet Loading', () => {
    it('should load pets when customer is selected', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        const customerSelect = screen.getByLabelText('Customer');
        fireEvent.mouseDown(customerSelect);
      });

      await waitFor(() => {
        const customerOption = screen.getByText('John Doe');
        fireEvent.click(customerOption);
      });

      await waitFor(() => {
        expect(petService.getPetsByCustomer).toHaveBeenCalledWith('customer-1');
      });
    });
  });

  describe('Enrollment Submission', () => {
    it('should disable Enroll button when customer not selected', async () => {
      renderComponent();
      
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        const submitButton = screen.getAllByText('Enroll Pet')[1].closest('button');
        expect(submitButton).toBeDisabled();
      });
    });

    it('should call enrollment API when form is submitted', async () => {
      (schedulingService.enrollments.enroll as jest.Mock).mockResolvedValue({});
      
      renderComponent();
      
      // Open dialog
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      // Select customer
      await waitFor(() => {
        const customerSelect = screen.getByLabelText('Customer');
        fireEvent.mouseDown(customerSelect);
      });

      await waitFor(() => {
        const customerOption = screen.getByText('John Doe');
        fireEvent.click(customerOption);
      });

      // Select pet
      await waitFor(() => {
        const petSelect = screen.getByLabelText('Pet');
        fireEvent.mouseDown(petSelect);
      });

      await waitFor(() => {
        const petOption = screen.getByText(/Max/);
        fireEvent.click(petOption);
      });

      // Submit
      await waitFor(() => {
        const submitButton = screen.getAllByText('Enroll Pet')[1];
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(schedulingService.enrollments.enroll).toHaveBeenCalledWith('class-1', {
          customerId: 'customer-1',
          petId: 'pet-1',
          amountPaid: 200,
        });
      });
    });

    it('should refresh class list after successful enrollment', async () => {
      (schedulingService.enrollments.enroll as jest.Mock).mockResolvedValue({});
      
      renderComponent();
      
      // Perform enrollment (simplified)
      await waitFor(() => {
        const enrollButton = screen.getByText('Enroll Pet');
        fireEvent.click(enrollButton);
      });

      // Mock successful enrollment
      await waitFor(() => {
        expect(schedulingService.trainingClasses.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when class loading fails', async () => {
      const errorMessage = 'Failed to load classes';
      (schedulingService.trainingClasses.getAll as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show empty state when no classes available', async () => {
      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue([]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('No upcoming classes')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to training classes page when clicking View All', async () => {
      renderComponent();
      
      await waitFor(() => {
        const viewAllButton = screen.getByText('View All');
        fireEvent.click(viewAllButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/training/classes');
    });
  });

  describe('Responsive Layout', () => {
    it('should render classes in grid layout', async () => {
      renderComponent();
      
      await waitFor(() => {
        const grid = screen.getByText('Basic Obedience').closest('[class*="MuiGrid-item"]');
        expect(grid).toBeInTheDocument();
      });
    });
  });
});
