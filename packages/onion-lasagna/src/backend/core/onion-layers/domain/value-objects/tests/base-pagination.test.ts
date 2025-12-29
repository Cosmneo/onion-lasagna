import { describe, it, expect } from 'vitest';
import { BasePaginationVo } from '../base-pagination.vo';
import { BaseValueObject } from '../../classes/base-value-object.class';
import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

describe('BasePaginationVo', () => {
  describe('create', () => {
    it('should create with page and pageSize', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 10 });

      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(10);
    });

    it('should store values in value object', () => {
      const pagination = BasePaginationVo.create({ page: 5, pageSize: 25 });

      expect(pagination.value).toEqual({ page: 5, pageSize: 25 });
    });
  });

  describe('validation', () => {
    it('should throw for page less than 1', () => {
      expect(() => BasePaginationVo.create({ page: 0, pageSize: 10 })).toThrow(
        InvariantViolationError,
      );
      expect(() => BasePaginationVo.create({ page: -1, pageSize: 10 })).toThrow(
        'Page must be a positive integer',
      );
    });

    it('should throw for pageSize less than 1', () => {
      expect(() => BasePaginationVo.create({ page: 1, pageSize: 0 })).toThrow(
        InvariantViolationError,
      );
      expect(() => BasePaginationVo.create({ page: 1, pageSize: -1 })).toThrow(
        'Page size must be a positive integer',
      );
    });

    it('should throw for pageSize exceeding maxPageSize', () => {
      expect(() => BasePaginationVo.create({ page: 1, pageSize: 101 })).toThrow(
        InvariantViolationError,
      );
      expect(() => BasePaginationVo.create({ page: 1, pageSize: 101 })).toThrow(
        'Page size must be at most 100',
      );
    });

    it('should throw for non-integer page', () => {
      expect(() => BasePaginationVo.create({ page: 1.5, pageSize: 10 })).toThrow(
        InvariantViolationError,
      );
    });

    it('should throw for non-integer pageSize', () => {
      expect(() => BasePaginationVo.create({ page: 1, pageSize: 10.5 })).toThrow(
        InvariantViolationError,
      );
    });
  });

  describe('page getter', () => {
    it('should return the page number', () => {
      const pagination = BasePaginationVo.create({ page: 3, pageSize: 20 });

      expect(pagination.page).toBe(3);
    });

    it('should handle page 1', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 10 });

      expect(pagination.page).toBe(1);
    });

    it('should handle large page numbers', () => {
      const pagination = BasePaginationVo.create({ page: 1000, pageSize: 10 });

      expect(pagination.page).toBe(1000);
    });
  });

  describe('pageSize getter', () => {
    it('should return the page size', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 50 });

      expect(pagination.pageSize).toBe(50);
    });

    it('should handle small page sizes', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 1 });

      expect(pagination.pageSize).toBe(1);
    });

    it('should accept max page size', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 100 });

      expect(pagination.pageSize).toBe(100);
    });
  });

  describe('offset getter', () => {
    it('should calculate offset for page 1', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 10 });

      expect(pagination.offset).toBe(0);
    });

    it('should calculate offset for subsequent pages', () => {
      const pagination = BasePaginationVo.create({ page: 2, pageSize: 10 });

      expect(pagination.offset).toBe(10);
    });

    it('should calculate offset correctly', () => {
      const pagination = BasePaginationVo.create({ page: 5, pageSize: 20 });

      expect(pagination.offset).toBe(80); // (5-1) * 20
    });

    it('should handle different page sizes', () => {
      const pagination = BasePaginationVo.create({ page: 3, pageSize: 25 });

      expect(pagination.offset).toBe(50); // (3-1) * 25
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 10 });

      expect(pagination).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same page and pageSize', () => {
      const pagination1 = BasePaginationVo.create({ page: 2, pageSize: 10 });
      const pagination2 = BasePaginationVo.create({ page: 2, pageSize: 10 });

      expect(pagination1.equals(pagination2)).toBe(true);
    });

    it('should return false for different page', () => {
      const pagination1 = BasePaginationVo.create({ page: 1, pageSize: 10 });
      const pagination2 = BasePaginationVo.create({ page: 2, pageSize: 10 });

      expect(pagination1.equals(pagination2)).toBe(false);
    });

    it('should return false for different pageSize', () => {
      const pagination1 = BasePaginationVo.create({ page: 1, pageSize: 10 });
      const pagination2 = BasePaginationVo.create({ page: 1, pageSize: 20 });

      expect(pagination1.equals(pagination2)).toBe(false);
    });

    it('should return true for same reference', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 10 });

      expect(pagination.equals(pagination)).toBe(true);
    });
  });

  describe('common pagination scenarios', () => {
    it('should handle first page scenario', () => {
      const pagination = BasePaginationVo.create({ page: 1, pageSize: 10 });

      expect(pagination.page).toBe(1);
      expect(pagination.offset).toBe(0);
    });

    it('should handle last page of known set', () => {
      // Assuming 95 items with page size 10 = 10 pages
      const pagination = BasePaginationVo.create({ page: 10, pageSize: 10 });

      expect(pagination.page).toBe(10);
      expect(pagination.offset).toBe(90);
    });

    it('should support common page sizes', () => {
      const pageSizes = [10, 20, 25, 50, 100];

      pageSizes.forEach((size) => {
        const pagination = BasePaginationVo.create({ page: 1, pageSize: size });
        expect(pagination.pageSize).toBe(size);
      });
    });
  });

  describe('subclass with custom maxPageSize', () => {
    class AdminPaginationVo extends BasePaginationVo {
      static override get maxPageSize(): number {
        return 500;
      }
    }

    it('should allow larger page sizes in subclass', () => {
      const pagination = AdminPaginationVo.create({ page: 1, pageSize: 500 });

      expect(pagination.pageSize).toBe(500);
    });

    it('should still enforce subclass maxPageSize', () => {
      expect(() => AdminPaginationVo.create({ page: 1, pageSize: 501 })).toThrow(
        InvariantViolationError,
      );
      expect(() => AdminPaginationVo.create({ page: 1, pageSize: 501 })).toThrow(
        'Page size must be at most 500',
      );
    });
  });
});
