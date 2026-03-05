import React from 'react';
import { render, screen } from '@testing-library/react';
import SimpleVaccinationBadge from '../SimpleVaccinationBadge';
import { Pet } from '../../../services/petService';

// Mock the Pet type
const mockPet: Pet = {
  id: 'test-pet-id',
  name: 'Test Pet',
  type: 'DOG',
  breed: 'Golden Retriever',
  color: 'Golden',
  birthdate: '2020-01-01',
  weight: 70,
  gender: 'MALE',
  isNeutered: true,
  microchipNumber: '123456789',
  rabiesTagNumber: 'TAG123',
  profilePhoto: null,
  specialNeeds: null,
  behaviorNotes: null,
  foodNotes: null,
  medicationNotes: null,
  allergies: null,
  vetName: null,
  vetPhone: null,
  customerId: 'customer-id',
  isActive: true,
  vaccinationStatus: {},
  vaccineExpirations: {}
};

describe('SimpleVaccinationBadge', () => {
  it('renders compliant badge for dog with all current vaccines', () => {
    const compliantPet: Pet = {
      ...mockPet,
      vaccinationStatus: {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        dhpp: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        bordetella: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      }
    };

    render(<SimpleVaccinationBadge pet={compliantPet} showDetails={false} />);
    
    const badge = screen.getByText('Compliant');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
  });

  it('renders expired badge for dog with expired rabies', () => {
    const expiredPet: Pet = {
      ...mockPet,
      vaccinationStatus: {
        rabies: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
        dhpp: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        bordetella: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      }
    };

    render(<SimpleVaccinationBadge pet={expiredPet} showDetails={false} />);
    
    const badge = screen.getByText('1 Expired');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('renders due badge for dog with missing vaccines', () => {
    const missingPet: Pet = {
      ...mockPet,
      vaccinationStatus: {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
        // Missing DHPP and Bordetella
      }
    };

    render(<SimpleVaccinationBadge pet={missingPet} showDetails={false} />);
    
    const badge = screen.getByText('2 Due');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
  });

  it('renders mixed status badge for dog with expired and missing vaccines', () => {
    const mixedPet: Pet = {
      ...mockPet,
      vaccinationStatus: {
        rabies: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' }
        // Missing DHPP and Bordetella
      }
    };

    render(<SimpleVaccinationBadge pet={mixedPet} showDetails={false} />);
    
    const badge = screen.getByText('1 Expired, 2 Due');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('renders compliant badge for cat with all current vaccines', () => {
    const compliantCat: Pet = {
      ...mockPet,
      type: 'CAT',
      vaccinationStatus: {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        fvrcp: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      }
    };

    render(<SimpleVaccinationBadge pet={compliantCat} showDetails={false} />);
    
    const badge = screen.getByText('Compliant');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
  });

  it('renders expired badge for cat with expired fvrcp', () => {
    const expiredCat: Pet = {
      ...mockPet,
      type: 'CAT',
      vaccinationStatus: {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        fvrcp: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' }
      }
    };

    render(<SimpleVaccinationBadge pet={expiredCat} showDetails={false} />);
    
    const badge = screen.getByText('1 Expired');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('renders no record badge for pet with no vaccination data', () => {
    const noRecordPet: Pet = {
      ...mockPet,
      vaccinationStatus: {}
    };

    render(<SimpleVaccinationBadge pet={noRecordPet} showDetails={false} />);
    
    const badge = screen.getByText('3 Due'); // All 3 required vaccines are missing
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
  });

  it('shows detailed tooltip when showDetails is true', () => {
    const petWithDetails: Pet = {
      ...mockPet,
      vaccinationStatus: {
        rabies: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
        dhpp: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        bordetella: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      }
    };

    render(<SimpleVaccinationBadge pet={petWithDetails} showDetails={true} />);
    
    const badge = screen.getByText('1 Expired');
    expect(badge).toBeInTheDocument();
    
    // Check that tooltip is present (via the Tooltip component)
    const tooltipWrapper = badge.closest('.MuiChip-root').parentElement;
    expect(tooltipWrapper).toBeInTheDocument();
  });

  it('handles unknown pet type gracefully', () => {
    const unknownPet: Pet = {
      ...mockPet,
      type: 'OTHER' as any,
      vaccinationStatus: {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      }
    };

    render(<SimpleVaccinationBadge pet={unknownPet} showDetails={false} />);
    
    const badge = screen.getByText('Compliant');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
  });

  it('displays correct count for multiple expired vaccines', () => {
    const multipleExpiredPet: Pet = {
      ...mockPet,
      vaccinationStatus: {
        rabies: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
        dhpp: { status: 'EXPIRED', expiration: '2024-02-01T00:00:00.000Z' },
        bordetella: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      }
    };

    render(<SimpleVaccinationBadge pet={multipleExpiredPet} showDetails={false} />);
    
    const badge = screen.getByText('2 Expired');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('displays check required badge for pet with pending vaccines', () => {
    const pendingPet: Pet = {
      ...mockPet,
      vaccinationStatus: {
        rabies: { status: 'PENDING' },
        dhpp: { status: 'PENDING' },
        bordetella: { status: 'PENDING' }
      }
    };

    render(<SimpleVaccinationBadge pet={pendingPet} showDetails={false} />);
    
    const badge = screen.getByText('3 Due');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
  });
});
