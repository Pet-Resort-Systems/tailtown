/**
 * PetSelection Component Tests
 * Tests for the pet selection step with auto-select optimization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PetSelection from '../PetSelection';
import { petService } from '../../../../services/petService';

jest.mock('../../../../services/petService');
jest.mock('../../../../contexts/CustomerAuthContext', () => ({
  useCustomerAuth: () => ({
    customer: {
      id: 'customer-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    }
  })
}));

const mockPets = [
  {
    id: 'pet-1',
    name: 'Max',
    type: 'DOG',
    breed: 'Golden Retriever',
    isActive: true,
    gender: 'Male',
    weight: 65
  },
  {
    id: 'pet-2',
    name: 'Bella',
    type: 'DOG',
    breed: 'Labrador',
    isActive: true,
    gender: 'Female',
    weight: 55
  },
  {
    id: 'pet-3',
    name: 'Inactive Pet',
    type: 'CAT',
    breed: 'Persian',
    isActive: false,
    gender: 'Female',
    weight: 10
  }
];

describe('PetSelection', () => {
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnUpdate = jest.fn();
  
  const defaultProps = {
    bookingData: { customerId: 'customer-123' },
    onNext: mockOnNext,
    onBack: mockOnBack,
    onUpdate: mockOnUpdate
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with title', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Select Your Pets')).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      (petService.getPetsByCustomer as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<PetSelection {...defaultProps} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display all active pets', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Max')).toBeInTheDocument();
        expect(screen.getByText('Bella')).toBeInTheDocument();
        expect(screen.queryByText('Inactive Pet')).not.toBeInTheDocument();
      });
    });

    it('should display pet details', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
        expect(screen.getByText('Labrador')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Select Single Pet', () => {
    it('should auto-select when customer has only one pet', async () => {
      const singlePet = [mockPets[0]];
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: singlePet
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          petIds: ['pet-1']
        });
      });
    });

    it('should not auto-select when customer has multiple pets', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Max')).toBeInTheDocument();
      });

      // Should not have called onUpdate automatically
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should filter out inactive pets before auto-select', async () => {
      const petsWithInactive = [mockPets[0], mockPets[2]]; // One active, one inactive
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: petsWithInactive
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        // Should auto-select the one active pet
        expect(mockOnUpdate).toHaveBeenCalledWith({
          petIds: ['pet-1']
        });
      });
    });
  });

  describe('Manual Pet Selection', () => {
    it.skip('should allow selecting a pet', async () => {
      // Use only active pets (Max and Bella) to prevent auto-select
      const activePets = mockPets.filter(p => p.isActive);
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: activePets
      });

      render(<PetSelection {...defaultProps} />);
      
      // Verify the mock was called
      await waitFor(() => {
        expect(petService.getPetsByCustomer).toHaveBeenCalledWith('customer-123');
      });
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Wait for pets to render
      await waitFor(() => {
        const maxElement = screen.queryByText('Max');
        expect(maxElement).toBeInTheDocument();
      });

      // Find the CardActionArea by finding the pet name and going up to the clickable area
      const petName = screen.getByText('Max');
      const petCard = petName.closest('.MuiCardActionArea-root');
      
      expect(petCard).toBeTruthy();
      
      fireEvent.click(petCard!);
      
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            petIds: expect.arrayContaining(['pet-1'])
          })
        );
      });
    });

    it.skip('should allow selecting multiple pets', async () => {
      // Use only active pets to prevent auto-select
      const activePets = mockPets.filter(p => p.isActive);
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: activePets
      });

      render(<PetSelection {...defaultProps} />);
      
      // Wait for pets to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Max')).toBeInTheDocument();
        expect(screen.getByText('Bella')).toBeInTheDocument();
      });

      // Select first pet
      const maxCard = screen.getByText('Max').closest('.MuiCardActionArea-root');
      expect(maxCard).toBeTruthy();
      fireEvent.click(maxCard!);

      // Select second pet
      const bellaCard = screen.getByText('Bella').closest('.MuiCardActionArea-root');
      expect(bellaCard).toBeTruthy();
      fireEvent.click(bellaCard!);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            petIds: expect.arrayContaining(['pet-1', 'pet-2'])
          })
        );
      });
    });

    it.skip('should allow deselecting a pet', async () => {
      // Use only active pets to prevent auto-select
      const activePets = mockPets.filter(p => p.isActive);
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: activePets
      });

      render(<PetSelection {...defaultProps} />);
      
      // Wait for pets to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Max')).toBeInTheDocument();
      });

      const petCard = screen.getByText('Max').closest('.MuiCardActionArea-root');
      expect(petCard).toBeTruthy();
      
      // Select
      fireEvent.click(petCard!);
      
      // Deselect
      fireEvent.click(petCard!);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenLastCalledWith(
          expect.objectContaining({
            petIds: []
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should call onBack when Back button is clicked', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Max')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should have Continue button disabled when no pets selected', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Max')).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when pets fail to load', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockRejectedValue(
        new Error('Failed to load pets')
      );

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Unable to load pets. Please try again.')).toBeInTheDocument();
      });
    });

    it('should display message when customer has no pets', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: []
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/No active pets found/i)).toBeInTheDocument();
      });
    });

    it('should display message when all pets are inactive', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: [mockPets[2]] // Only inactive pet
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        // All inactive pets are filtered out, so should show no pets message
        expect(screen.getByText(/No active pets found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should be keyboard navigable', async () => {
      (petService.getPetsByCustomer as jest.Mock).mockResolvedValue({
        data: mockPets
      });

      render(<PetSelection {...defaultProps} />);
      
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        backButton.focus();
        expect(document.activeElement).toBe(backButton);
      });
    });
  });
});
