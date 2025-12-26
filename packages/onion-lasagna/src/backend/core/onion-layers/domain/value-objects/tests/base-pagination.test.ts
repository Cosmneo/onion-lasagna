import { describe, it, expect, vi } from 'vitest';
import { BasePaginationVo } from '../base-pagination.vo';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '../../classes/base-value-object.class';
import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';

// Concrete implementation for testing
class Pagination extends BasePaginationVo {
  static create(page: number, pageSize: number): Pagination {
    return new Pagination({ page, pageSize }, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static createWithValidator(
    page: number,
    pageSize: number,
    validator: BoundValidator<{ page: number; pageSize: number }>,
  ): Pagination {
    return new Pagination({ page, pageSize }, validator);
  }

  get offset(): number {
    return (this.page - 1) * this.pageSize;
  }
}

describe('BasePaginationVo', () => {
  describe('create', () => {
    it('should create with page and pageSize', () => {
      const pagination = Pagination.create(1, 10);

      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(10);
    });

    it('should store values in value object', () => {
      const pagination = Pagination.create(5, 25);

      expect(pagination.value).toEqual({ page: 5, pageSize: 25 });
    });
  });

  describe('page getter', () => {
    it('should return the page number', () => {
      const pagination = Pagination.create(3, 20);

      expect(pagination.page).toBe(3);
    });

    it('should handle page 1', () => {
      const pagination = Pagination.create(1, 10);

      expect(pagination.page).toBe(1);
    });

    it('should handle large page numbers', () => {
      const pagination = Pagination.create(1000, 10);

      expect(pagination.page).toBe(1000);
    });
  });

  describe('pageSize getter', () => {
    it('should return the page size', () => {
      const pagination = Pagination.create(1, 50);

      expect(pagination.pageSize).toBe(50);
    });

    it('should handle small page sizes', () => {
      const pagination = Pagination.create(1, 1);

      expect(pagination.pageSize).toBe(1);
    });

    it('should handle large page sizes', () => {
      const pagination = Pagination.create(1, 100);

      expect(pagination.pageSize).toBe(100);
    });
  });

  describe('offset calculation (subclass)', () => {
    it('should calculate offset for page 1', () => {
      const pagination = Pagination.create(1, 10);

      expect(pagination.offset).toBe(0);
    });

    it('should calculate offset for subsequent pages', () => {
      const pagination = Pagination.create(2, 10);

      expect(pagination.offset).toBe(10);
    });

    it('should calculate offset correctly', () => {
      const pagination = Pagination.create(5, 20);

      expect(pagination.offset).toBe(80); // (5-1) * 20
    });

    it('should handle different page sizes', () => {
      const pagination = Pagination.create(3, 25);

      expect(pagination.offset).toBe(50); // (3-1) * 25
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const pagination = Pagination.create(1, 10);

      expect(pagination).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('with validator', () => {
    it('should validate using provided validator', () => {
      const mockValidator: BoundValidator<{ page: number; pageSize: number }> = {
        validate: vi.fn().mockReturnValue({ page: 1, pageSize: 20 }),
      };

      const pagination = Pagination.createWithValidator(1, 20, mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(20);
    });

    it('should throw when validation fails', () => {
      const mockValidator: BoundValidator<{ page: number; pageSize: number }> = {
        validate: vi.fn().mockImplementation(() => {
          throw new Error('Page must be positive');
        }),
      };

      expect(() => Pagination.createWithValidator(0, 10, mockValidator)).toThrow(
        'Page must be positive',
      );
    });

    it('should allow validator to transform values', () => {
      const mockValidator: BoundValidator<{ page: number; pageSize: number }> = {
        validate: vi.fn().mockImplementation(({ page, pageSize }) => ({
          page: Math.max(1, page),
          pageSize: Math.min(100, Math.max(1, pageSize)),
        })),
      };

      const pagination = Pagination.createWithValidator(-5, 200, mockValidator);

      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(100);
    });
  });

  describe('equals', () => {
    it('should return true for same page and pageSize', () => {
      const pagination1 = Pagination.create(2, 10);
      const pagination2 = Pagination.create(2, 10);

      expect(pagination1.equals(pagination2)).toBe(true);
    });

    it('should return false for different page', () => {
      const pagination1 = Pagination.create(1, 10);
      const pagination2 = Pagination.create(2, 10);

      expect(pagination1.equals(pagination2)).toBe(false);
    });

    it('should return false for different pageSize', () => {
      const pagination1 = Pagination.create(1, 10);
      const pagination2 = Pagination.create(1, 20);

      expect(pagination1.equals(pagination2)).toBe(false);
    });

    it('should return true for same reference', () => {
      const pagination = Pagination.create(1, 10);

      expect(pagination.equals(pagination)).toBe(true);
    });
  });

  describe('common pagination scenarios', () => {
    it('should handle first page scenario', () => {
      const pagination = Pagination.create(1, 10);

      expect(pagination.page).toBe(1);
      expect(pagination.offset).toBe(0);
    });

    it('should handle last page of known set', () => {
      // Assuming 95 items with page size 10 = 10 pages
      const pagination = Pagination.create(10, 10);

      expect(pagination.page).toBe(10);
      expect(pagination.offset).toBe(90);
    });

    it('should support common page sizes', () => {
      const pageSizes = [10, 20, 25, 50, 100];

      pageSizes.forEach((size) => {
        const pagination = Pagination.create(1, size);
        expect(pagination.pageSize).toBe(size);
      });
    });
  });
});
