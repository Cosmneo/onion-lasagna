import { describe, it, expect } from 'vitest';
import { fieldChanged } from '../field-changed.util';

describe('fieldChanged', () => {
  describe('partial update mode (default)', () => {
    it('should return false when newValue is undefined', () => {
      const result = fieldChanged({ value: 'John', newValue: undefined });

      expect(result).toBe(false);
    });

    it('should return true when values are different', () => {
      const result = fieldChanged({ value: 'John', newValue: 'Jane' });

      expect(result).toBe(true);
    });

    it('should return false when values are the same', () => {
      const result = fieldChanged({ value: 'John', newValue: 'John' });

      expect(result).toBe(false);
    });

    it('should handle null values correctly', () => {
      expect(fieldChanged({ value: null, newValue: undefined })).toBe(false);
      expect(fieldChanged({ value: null, newValue: null })).toBe(false);
      expect(fieldChanged({ value: null, newValue: 'value' })).toBe(true);
      expect(fieldChanged({ value: 'value', newValue: null })).toBe(true);
    });

    it('should handle empty string', () => {
      expect(fieldChanged({ value: '', newValue: undefined })).toBe(false);
      expect(fieldChanged({ value: '', newValue: '' })).toBe(false);
      expect(fieldChanged({ value: '', newValue: 'value' })).toBe(true);
      expect(fieldChanged({ value: 'value', newValue: '' })).toBe(true);
    });

    it('should handle numbers', () => {
      expect(fieldChanged({ value: 0, newValue: undefined })).toBe(false);
      expect(fieldChanged({ value: 0, newValue: 0 })).toBe(false);
      expect(fieldChanged({ value: 0, newValue: 1 })).toBe(true);
      expect(fieldChanged({ value: 42, newValue: 42 })).toBe(false);
    });

    it('should handle booleans', () => {
      expect(fieldChanged({ value: false, newValue: undefined })).toBe(false);
      expect(fieldChanged({ value: false, newValue: false })).toBe(false);
      expect(fieldChanged({ value: false, newValue: true })).toBe(true);
      expect(fieldChanged({ value: true, newValue: true })).toBe(false);
    });
  });

  describe('full update mode (partialUpdate = false)', () => {
    it('should return true when newValue is undefined and value is not', () => {
      const result = fieldChanged({
        value: 'John',
        newValue: undefined,
        partialUpdate: false,
      });

      expect(result).toBe(true);
    });

    it('should return false when both are undefined', () => {
      const result = fieldChanged({
        value: undefined,
        newValue: undefined,
        partialUpdate: false,
      });

      expect(result).toBe(false);
    });

    it('should return true when values are different', () => {
      const result = fieldChanged({
        value: 'John',
        newValue: 'Jane',
        partialUpdate: false,
      });

      expect(result).toBe(true);
    });

    it('should return false when values are the same', () => {
      const result = fieldChanged({
        value: 'John',
        newValue: 'John',
        partialUpdate: false,
      });

      expect(result).toBe(false);
    });

    it('should treat undefined as "set to undefined"', () => {
      // In full update mode, passing undefined means "clear this field"
      expect(
        fieldChanged({
          value: 'existing',
          newValue: undefined,
          partialUpdate: false,
        }),
      ).toBe(true);
    });
  });

  describe('reference equality (objects and arrays)', () => {
    it('should return true for different object references with same content', () => {
      const obj1 = { name: 'John' };
      const obj2 = { name: 'John' };

      const result = fieldChanged({ value: obj1, newValue: obj2 });

      // Uses reference equality, not deep equality
      expect(result).toBe(true);
    });

    it('should return false for same object reference', () => {
      const obj = { name: 'John' };

      const result = fieldChanged({ value: obj, newValue: obj });

      expect(result).toBe(false);
    });

    it('should return true for different array references with same content', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];

      const result = fieldChanged({ value: arr1, newValue: arr2 });

      // Uses reference equality, not deep equality
      expect(result).toBe(true);
    });

    it('should return false for same array reference', () => {
      const arr = [1, 2, 3];

      const result = fieldChanged({ value: arr, newValue: arr });

      expect(result).toBe(false);
    });
  });

  describe('type safety', () => {
    it('should work with typed values', () => {
      interface User {
        id: string;
        name: string;
      }

      const user1: User = { id: '1', name: 'John' };
      const user2: User = { id: '1', name: 'John' };

      expect(fieldChanged({ value: user1, newValue: user2 })).toBe(true);
      expect(fieldChanged({ value: user1, newValue: user1 })).toBe(false);
      expect(fieldChanged({ value: user1, newValue: undefined })).toBe(false);
    });

    it('should work with union types', () => {
      type Status = 'active' | 'inactive' | 'pending';

      const status: Status = 'active';

      expect(fieldChanged({ value: status, newValue: 'active' })).toBe(false);
      expect(fieldChanged({ value: status, newValue: 'inactive' })).toBe(true);
      expect(fieldChanged({ value: status, newValue: undefined })).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle NaN correctly', () => {
      // NaN !== NaN in JavaScript
      expect(fieldChanged({ value: NaN, newValue: NaN })).toBe(true);
    });

    it('should handle Infinity', () => {
      expect(fieldChanged({ value: Infinity, newValue: Infinity })).toBe(false);
      expect(fieldChanged({ value: Infinity, newValue: -Infinity })).toBe(true);
    });

    it('should handle Date objects by reference', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-01');

      expect(fieldChanged({ value: date1, newValue: date2 })).toBe(true);
      expect(fieldChanged({ value: date1, newValue: date1 })).toBe(false);
    });

    it('should default partialUpdate to true', () => {
      // When partialUpdate is not specified, it should default to true
      const result = fieldChanged({ value: 'test', newValue: undefined });

      expect(result).toBe(false);
    });
  });
});
