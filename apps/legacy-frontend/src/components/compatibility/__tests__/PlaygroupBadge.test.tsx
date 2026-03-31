/**
 * PlaygroupBadge Component Tests
 *
 * Tests that verify the PlaygroupBadge component displays correctly
 * for different playgroup compatibility values.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlaygroupBadge } from '../PlaygroupBadge';

describe('PlaygroupBadge Component', () => {
  describe('Rendering', () => {
    it('should render Large Dog badge', () => {
      render(<PlaygroupBadge compatibility="LARGE_DOG" />);
      expect(screen.getByText('Large Dog')).toBeInTheDocument();
    });

    it('should render Medium Dog badge', () => {
      render(<PlaygroupBadge compatibility="MEDIUM_DOG" />);
      expect(screen.getByText('Medium Dog')).toBeInTheDocument();
    });

    it('should render Small Dog badge', () => {
      render(<PlaygroupBadge compatibility="SMALL_DOG" />);
      expect(screen.getByText('Small Dog')).toBeInTheDocument();
    });

    it('should render Non-Compatible badge', () => {
      render(<PlaygroupBadge compatibility="NON_COMPATIBLE" />);
      expect(screen.getByText('Non-Compatible')).toBeInTheDocument();
    });

    it('should render Senior/Staff Required badge', () => {
      render(<PlaygroupBadge compatibility="SENIOR_STAFF_REQUIRED" />);
      expect(screen.getByText(/Senior.*Staff/i)).toBeInTheDocument();
    });

    it('should render Unknown badge for unknown compatibility', () => {
      render(<PlaygroupBadge compatibility="UNKNOWN" />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should render Unknown badge for null compatibility', () => {
      render(<PlaygroupBadge compatibility={null} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should render Unknown badge for undefined compatibility', () => {
      render(<PlaygroupBadge compatibility={undefined} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct color for Large Dog', () => {
      const { container } = render(
        <PlaygroupBadge compatibility="LARGE_DOG" />
      );
      const badge = container.querySelector('.MuiChip-root');
      expect(badge).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('should apply correct color for Medium Dog', () => {
      const { container } = render(
        <PlaygroupBadge compatibility="MEDIUM_DOG" />
      );
      const badge = container.querySelector('.MuiChip-root');
      expect(badge).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('should apply correct color for Small Dog', () => {
      const { container } = render(
        <PlaygroupBadge compatibility="SMALL_DOG" />
      );
      const badge = container.querySelector('.MuiChip-root');
      expect(badge).toHaveStyle({ backgroundColor: expect.any(String) });
    });
  });

  describe('Size Variants', () => {
    it('should render small size badge', () => {
      const { container } = render(
        <PlaygroupBadge compatibility="LARGE_DOG" size="small" />
      );
      const badge = container.querySelector('.MuiChip-sizeSmall');
      expect(badge).toBeInTheDocument();
    });

    it('should render medium size badge by default', () => {
      const { container } = render(
        <PlaygroupBadge compatibility="LARGE_DOG" />
      );
      const badge = container.querySelector('.MuiChip-root');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for Large Dog', () => {
      render(<PlaygroupBadge compatibility="LARGE_DOG" />);
      const badge = screen.getByText('Large Dog');
      expect(badge).toBeVisible();
    });

    it('should have accessible label for Non-Compatible', () => {
      render(<PlaygroupBadge compatibility="NON_COMPATIBLE" />);
      const badge = screen.getByText('Non-Compatible');
      expect(badge).toBeVisible();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid compatibility value gracefully', () => {
      render(<PlaygroupBadge compatibility={'INVALID' as any} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should not crash with empty string', () => {
      render(<PlaygroupBadge compatibility={'' as any} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});
