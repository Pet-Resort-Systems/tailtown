/**
 * Sorting Utilities Tests
 * Tests for centralized sorting functions
 */

import {
  sortByRoomAndNumber,
  sortBySuiteNumber,
  sortByName,
  extractKennelNumber
} from '../sortingUtils';

describe('sortingUtils', () => {
  describe('sortByRoomAndNumber', () => {
    it('should sort by room letter then number', () => {
      const items = [
        { name: 'B02' },
        { name: 'A10' },
        { name: 'A01' },
        { name: 'C05' },
        { name: 'B01' }
      ];

      const result = sortByRoomAndNumber(items);

      expect(result.map(i => i.name)).toEqual(['A01', 'A10', 'B01', 'B02', 'C05']);
    });

    it('should handle items without names', () => {
      const items = [
        { name: 'A02' },
        { name: undefined },
        { name: 'A01' }
      ];

      const result = sortByRoomAndNumber(items);

      expect(result[0].name).toBe('');
      expect(result[1].name).toBe('A01');
      expect(result[2].name).toBe('A02');
    });

    it('should fallback to string comparison for non-matching patterns', () => {
      const items = [
        { name: 'Suite 2' },
        { name: 'A01' },
        { name: 'Suite 1' }
      ];

      const result = sortByRoomAndNumber(items);

      expect(result[0].name).toBe('A01');
      expect(result[1].name).toBe('Suite 1');
      expect(result[2].name).toBe('Suite 2');
    });

    it('should not mutate original array', () => {
      const items = [{ name: 'B01' }, { name: 'A01' }];
      const original = [...items];

      sortByRoomAndNumber(items);

      expect(items).toEqual(original);
    });
  });

  describe('sortBySuiteNumber', () => {
    it('should sort by suite number', () => {
      const items = [
        { suiteNumber: '10' },
        { suiteNumber: '2' },
        { suiteNumber: '1' }
      ];

      const result = sortBySuiteNumber(items);

      expect(result.map(i => i.suiteNumber)).toEqual(['1', '2', '10']);
    });

    it('should extract numbers from name if suiteNumber missing', () => {
      const items = [
        { name: 'Suite 10' },
        { name: 'Suite 2' },
        { name: 'Suite 1' }
      ];

      const result = sortBySuiteNumber(items);

      expect(result[0].name).toBe('Suite 1');
      expect(result[1].name).toBe('Suite 2');
      expect(result[2].name).toBe('Suite 10');
    });

    it('should handle mixed suiteNumber and name', () => {
      const items = [
        { suiteNumber: '5', name: 'Suite 10' },
        { name: 'Suite 2' },
        { suiteNumber: '1' }
      ];

      const result = sortBySuiteNumber(items);

      expect(result[0].suiteNumber).toBe('1');
      expect(result[1].suiteNumber).toBe('5');
      expect(result[2].name).toBe('Suite 2');
    });

    it('should handle numeric suiteNumbers', () => {
      const items = [
        { suiteNumber: 10 },
        { suiteNumber: 2 },
        { suiteNumber: 1 }
      ];

      const result = sortBySuiteNumber(items);

      expect(result.map(i => i.suiteNumber)).toEqual([1, 2, 10]);
    });
  });

  describe('sortByName', () => {
    it('should sort alphabetically by name', () => {
      const items = [
        { name: 'Charlie' },
        { name: 'Alice' },
        { name: 'Bob' }
      ];

      const result = sortByName(items);

      expect(result.map(i => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should handle case-insensitive sorting', () => {
      const items = [
        { name: 'zebra' },
        { name: 'Apple' },
        { name: 'banana' }
      ];

      const result = sortByName(items);

      expect(result[0].name).toBe('Apple');
      expect(result[1].name).toBe('banana');
      expect(result[2].name).toBe('zebra');
    });

    it('should handle empty names', () => {
      const items = [
        { name: 'Bob' },
        { name: '' },
        { name: 'Alice' }
      ];

      const result = sortByName(items);

      expect(result[0].name).toBe('');
      expect(result[1].name).toBe('Alice');
      expect(result[2].name).toBe('Bob');
    });
  });

  describe('extractKennelNumber', () => {
    it('should extract from suiteNumber property', () => {
      const item = { suiteNumber: 'A05' };
      expect(extractKennelNumber(item)).toBe('A05');
    });

    it('should extract from attributes.suiteNumber', () => {
      const item = { attributes: { suiteNumber: 'B12' } };
      expect(extractKennelNumber(item)).toBe('B12');
    });

    it('should extract from name', () => {
      const item = { name: 'Suite A03' };
      expect(extractKennelNumber(item)).toBe('A03');
    });

    it('should prioritize suiteNumber over attributes', () => {
      const item = {
        suiteNumber: 'A01',
        attributes: { suiteNumber: 'B02' }
      };
      expect(extractKennelNumber(item)).toBe('A01');
    });

    it('should prioritize attributes over name', () => {
      const item = {
        attributes: { suiteNumber: 'B02' },
        name: 'Suite A03'
      };
      expect(extractKennelNumber(item)).toBe('B02');
    });

    it('should return 0 if no number found', () => {
      const item = { name: 'Unknown' };
      expect(extractKennelNumber(item)).toBe(0);
    });

    it('should handle numeric suiteNumber', () => {
      const item = { suiteNumber: 42 };
      expect(extractKennelNumber(item)).toBe(42);
    });

    it('should extract just numbers from name', () => {
      const item = { name: 'Room 123' };
      expect(extractKennelNumber(item)).toBe('123');
    });
  });
});
