import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import KennelCardPrint from '../KennelCardPrint';
import { reservationService } from '../../services/reservationService';

// Mock the reservation service
jest.mock('../../services/reservationService');

// Mock the KennelCard component to simplify testing
jest.mock('../../components/kennels/KennelCard', () => {
  return function MockKennelCard(props: any) {
    return (
      <div data-testid="kennel-card">
        <div data-testid="kennel-number">{props.kennelNumber}</div>
        <div data-testid="pet-name">{props.petName}</div>
        <div data-testid="owner-name">{props.ownerName}</div>
        <div data-testid="pet-icons">{JSON.stringify(props.petIconIds)}</div>
      </div>
    );
  };
});

describe('KennelCardPrint', () => {
  const mockReservation = {
    id: 'test-reservation-id',
    startDate: '2025-11-07T06:30:00Z',
    endDate: '2025-11-07T19:00:00Z',
    resource: {
      name: 'C01 Q',
      type: 'STANDARD'
    },
    pet: {
      id: 'pet-123',
      name: 'Henry',
      breed: 'Australian Cattle Dog Mix',
      weight: 56,
      type: 'DOG',
      petIcons: ['medium-size', 'small-group'],
      iconNotes: {},
      notes: 'Friendly dog'
    },
    customer: {
      id: 'customer-123',
      firstName: 'Gordon',
      lastName: 'Moore',
      phone: '(505) 239-7297'
    },
    notes: 'Reservation notes',
    alerts: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.print
    window.print = jest.fn();
  });

  it('should render loading state initially', () => {
    (reservationService.getReservationById as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should fetch and display reservation data', async () => {
    (reservationService.getReservationById as jest.Mock).mockResolvedValue(mockReservation);

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-reservation-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kennel-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('kennel-number')).toHaveTextContent('C01 Q');
    expect(screen.getByTestId('pet-name')).toHaveTextContent('Henry');
    expect(screen.getByTestId('owner-name')).toHaveTextContent('Gordon Moore');
  });

  it('should parse pet icons from JSON string', async () => {
    const reservationWithStringIcons = {
      ...mockReservation,
      pet: {
        ...mockReservation.pet,
        petIcons: JSON.stringify(['medium-size', 'small-group'])
      }
    };

    (reservationService.getReservationById as jest.Mock).mockResolvedValue(reservationWithStringIcons);

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kennel-card')).toBeInTheDocument();
    });

    const iconData = screen.getByTestId('pet-icons').textContent;
    expect(iconData).toContain('medium-size');
    expect(iconData).toContain('small-group');
  });

  it('should handle empty pet icons array', async () => {
    const reservationWithNoIcons = {
      ...mockReservation,
      pet: {
        ...mockReservation.pet,
        petIcons: []
      }
    };

    (reservationService.getReservationById as jest.Mock).mockResolvedValue(reservationWithNoIcons);

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kennel-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('pet-icons')).toHaveTextContent('[]');
  });

  it('should display error message when reservation fetch fails', async () => {
    (reservationService.getReservationById as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch reservation')
    );

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch reservation/i)).toBeInTheDocument();
    });
  });

  it('should display error when reservation data is invalid', async () => {
    const invalidReservation = {
      ...mockReservation,
      pet: null
    };

    (reservationService.getReservationById as jest.Mock).mockResolvedValue(invalidReservation);

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invalid reservation data/i)).toBeInTheDocument();
    });
  });

  it('should trigger print dialog after rendering', async () => {
    jest.useFakeTimers();
    (reservationService.getReservationById as jest.Mock).mockResolvedValue(mockReservation);

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kennel-card')).toBeInTheDocument();
    });

    // Fast-forward time to trigger print
    jest.advanceTimersByTime(500);

    expect(window.print).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('should use fallback values for missing optional fields', async () => {
    const minimalReservation = {
      id: 'test-id',
      startDate: '2025-11-07T06:30:00Z',
      endDate: '2025-11-07T19:00:00Z',
      pet: {
        id: 'pet-123',
        name: 'Buddy',
        type: 'DOG'
      },
      customer: {
        id: 'customer-123',
        firstName: 'John'
      }
    };

    (reservationService.getReservationById as jest.Mock).mockResolvedValue(minimalReservation);

    render(
      <MemoryRouter initialEntries={['/kennel-card/test-id']}>
        <Routes>
          <Route path="/kennel-card/:reservationId" element={<KennelCardPrint />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kennel-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('kennel-number')).toHaveTextContent('N/A');
    expect(screen.getByTestId('owner-name')).toHaveTextContent('John');
  });
});
