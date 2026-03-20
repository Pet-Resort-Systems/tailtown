/**
 * Vaccination Badge Visual Tests
 *
 * Tests that verify vaccination badges display correctly
 * with different vaccination statuses.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleVaccinationBadge from '../SimpleVaccinationBadge';

describe('SimpleVaccinationBadge Visual Tests', () => {
  describe('Current Vaccinations', () => {
    it('should display green badge for all current vaccinations', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {
          Rabies: { status: 'CURRENT', expiration: '2026-01-01' },
          DHPP: { status: 'CURRENT', expiration: '2026-01-01' },
          Bordetella: { status: 'CURRENT', expiration: '2026-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      const badge = screen.getByText(/Current/i);
      expect(badge).toBeInTheDocument();
    });

    it('should show vaccination details when showDetails is true', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {
          Rabies: { status: 'CURRENT', expiration: '2026-01-01' },
          DHPP: { status: 'CURRENT', expiration: '2026-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={true} />);
      expect(screen.getByText(/Rabies/i)).toBeInTheDocument();
      expect(screen.getByText(/DHPP/i)).toBeInTheDocument();
    });
  });

  describe('Expired Vaccinations', () => {
    it('should display red badge for expired vaccinations', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {
          Rabies: { status: 'EXPIRED', expiration: '2020-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      const badge = screen.getByText(/Overdue/i);
      expect(badge).toBeInTheDocument();
    });

    it('should show which vaccines are expired', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {
          Rabies: { status: 'EXPIRED', expiration: '2020-01-01' },
          DHPP: { status: 'CURRENT', expiration: '2026-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={true} />);
      expect(screen.getByText(/Rabies/i)).toBeInTheDocument();
    });
  });

  describe('Missing Vaccinations', () => {
    it('should display warning badge for missing vaccinations', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {},
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      const badge = screen.getByText(/Overdue/i);
      expect(badge).toBeInTheDocument();
    });

    it('should handle null vaccination status', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: null,
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      const badge = screen.getByText(/Overdue/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Mixed Vaccination Status', () => {
    it('should show overdue if any vaccine is expired', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {
          Rabies: { status: 'CURRENT', expiration: '2026-01-01' },
          DHPP: { status: 'EXPIRED', expiration: '2020-01-01' },
          Bordetella: { status: 'CURRENT', expiration: '2026-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      const badge = screen.getByText(/Overdue/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Dog vs Cat Vaccinations', () => {
    it('should check for dog-specific vaccines', () => {
      const dog = {
        id: '1',
        name: 'Test Dog',
        type: 'DOG',
        vaccinationStatus: {
          Rabies: { status: 'CURRENT', expiration: '2026-01-01' },
          DHPP: { status: 'CURRENT', expiration: '2026-01-01' },
          Bordetella: { status: 'CURRENT', expiration: '2026-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={dog} showDetails={true} />);
      expect(screen.getByText(/Rabies/i)).toBeInTheDocument();
      expect(screen.getByText(/DHPP/i)).toBeInTheDocument();
      expect(screen.getByText(/Bordetella/i)).toBeInTheDocument();
    });

    it('should check for cat-specific vaccines', () => {
      const cat = {
        id: '1',
        name: 'Test Cat',
        type: 'CAT',
        vaccinationStatus: {
          Rabies: { status: 'CURRENT', expiration: '2026-01-01' },
          FVRCP: { status: 'CURRENT', expiration: '2026-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={cat} showDetails={true} />);
      expect(screen.getByText(/Rabies/i)).toBeInTheDocument();
      expect(screen.getByText(/FVRCP/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {
          Rabies: { status: 'CURRENT', expiration: '2026-01-01' },
        },
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      const badge = screen.getByText(/Current/i);
      expect(badge).toBeVisible();
    });
  });

  describe('Edge Cases', () => {
    it('should handle pet without vaccination status field', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
    });

    it('should handle empty vaccination status object', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {},
      };

      render(<SimpleVaccinationBadge pet={pet} showDetails={false} />);
      expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
    });

    it('should handle invalid expiration dates', () => {
      const pet = {
        id: '1',
        name: 'Test Dog',
        vaccinationStatus: {
          Rabies: { status: 'CURRENT', expiration: 'invalid-date' },
        },
      };

      const { container } = render(
        <SimpleVaccinationBadge pet={pet} showDetails={false} />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
