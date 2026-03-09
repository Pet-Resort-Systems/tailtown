/**
 * Formatters Tests
 * Tests for data formatting utility functions
 */

import {
  formatCurrency,
  formatPhoneNumber,
  formatDate,
  formatDateTime,
  formatPercentage,
  truncateText
} from '../formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format number as currency', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-50.25)).toBe('-$50.25');
    });

    it('should handle decimal precision', () => {
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(10.999)).toBe('$11.00');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit phone number', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('should handle phone with dashes', () => {
      expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
    });

    it('should handle phone with spaces', () => {
      expect(formatPhoneNumber('555 123 4567')).toBe('(555) 123-4567');
    });

    it('should handle phone with parentheses', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    });

    it('should return original if not 10 digits', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('12345678901')).toBe('12345678901');
    });

    it('should handle empty string', () => {
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format date string', () => {
      const result = formatDate('2025-10-24T12:00:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle ISO date strings', () => {
      const result = formatDate('2025-10-24');
      expect(result).toBeTruthy();
    });

    it('should format dates correctly', () => {
      const result = formatDate('2025-12-25T00:00:00Z');
      expect(result).toContain('2025');
    });
  });


  describe('formatDateTime', () => {
    it('should format date and time string', () => {
      const result = formatDateTime('2025-10-24T14:30:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should include both date and time', () => {
      const result = formatDateTime('2025-10-24T14:30:00Z');
      expect(result.length).toBeGreaterThan(10); // More than just date
    });

    it('should handle ISO date strings', () => {
      const result = formatDateTime('2025-12-25T15:30:00Z');
      expect(result).toBeTruthy();
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(50)).toBe('50.0%');
      expect(formatPercentage(75.5)).toBe('75.5%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(50, 2)).toBe('50.00%');
      expect(formatPercentage(33.333, 2)).toBe('33.33%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle 100%', () => {
      expect(formatPercentage(100)).toBe('100.0%');
    });

    it('should round correctly', () => {
      expect(formatPercentage(33.456, 1)).toBe('33.5%');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs to be truncated';
      const result = truncateText(text, 20);
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(result).toContain('...');
    });

    it('should not truncate short text', () => {
      const text = 'Short text';
      const result = truncateText(text, 20);
      expect(result).toBe('Short text');
      expect(result).not.toContain('...');
    });

    it('should handle exact length', () => {
      const text = 'Exactly twenty chars';
      const result = truncateText(text, 20);
      expect(result).toBe('Exactly twenty chars');
    });

    it('should handle empty string', () => {
      const result = truncateText('', 10);
      expect(result).toBe('');
    });

    it('should require maxLength parameter', () => {
      const text = 'A'.repeat(200);
      const result = truncateText(text, 100);
      expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });
});
