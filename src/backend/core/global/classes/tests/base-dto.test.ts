import { describe, it, expect, vi } from 'vitest';
import { BaseDto, SKIP_DTO_VALIDATION } from '../base-dto.class';
import type { BoundValidator } from '../../interfaces/ports/object-validator.port';

describe('BaseDto', () => {
  describe('constructor', () => {
    it('should validate data using the provided validator', () => {
      const mockValidator: BoundValidator<{ name: string }> = {
        validate: vi.fn().mockReturnValue({ name: 'validated' }),
      };

      const dto = new BaseDto({ name: 'test' }, mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith({ name: 'test' });
      expect(dto.data).toEqual({ name: 'validated' });
    });

    it('should skip validation when SKIP_DTO_VALIDATION is passed', () => {
      const data = { name: 'test', value: 42 };

      const dto = new BaseDto(data, SKIP_DTO_VALIDATION);

      expect(dto.data).toEqual(data);
    });

    it('should throw when validator throws', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockImplementation(() => {
          throw new Error('Validation failed');
        }),
      };

      expect(() => new BaseDto('invalid', mockValidator)).toThrow('Validation failed');
    });
  });

  describe('data getter', () => {
    it('should return the validated data', () => {
      const data = { id: '123', name: 'Test' };
      const dto = new BaseDto(data, SKIP_DTO_VALIDATION);

      expect(dto.data).toBe(data);
    });

    it('should return transformed data from validator', () => {
      const inputData = { name: '  trimmed  ' };
      const transformedData = { name: 'trimmed' };
      const mockValidator: BoundValidator<{ name: string }> = {
        validate: vi.fn().mockReturnValue(transformedData),
      };

      const dto = new BaseDto(inputData, mockValidator);

      expect(dto.data).toEqual(transformedData);
    });
  });

  describe('SKIP_DTO_VALIDATION', () => {
    it('should be a specific string constant', () => {
      expect(SKIP_DTO_VALIDATION).toBe('skip dto validation');
    });

    it('should allow creating DTO with any data type', () => {
      const stringDto = new BaseDto('test', SKIP_DTO_VALIDATION);
      const numberDto = new BaseDto(42, SKIP_DTO_VALIDATION);
      const objectDto = new BaseDto({ nested: { deep: true } }, SKIP_DTO_VALIDATION);
      const arrayDto = new BaseDto([1, 2, 3], SKIP_DTO_VALIDATION);

      expect(stringDto.data).toBe('test');
      expect(numberDto.data).toBe(42);
      expect(objectDto.data).toEqual({ nested: { deep: true } });
      expect(arrayDto.data).toEqual([1, 2, 3]);
    });
  });
});
