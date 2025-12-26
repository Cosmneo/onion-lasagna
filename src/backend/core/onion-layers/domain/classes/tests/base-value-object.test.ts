import { describe, it, expect, vi } from 'vitest';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../base-value-object.class';
import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';

// Concrete implementation for testing
class TestValueObject extends BaseValueObject<string> {
  static create(value: string, validator: BoundValidator<string>): TestValueObject {
    return new TestValueObject(value, validator);
  }

  static fromRaw(value: string): TestValueObject {
    return new TestValueObject(value, SKIP_VALUE_OBJECT_VALIDATION);
  }
}

// Complex value object for testing deep equality
class ComplexValueObject extends BaseValueObject<{
  name: string;
  items: number[];
  nested: { value: boolean };
}> {
  static fromRaw(value: {
    name: string;
    items: number[];
    nested: { value: boolean };
  }): ComplexValueObject {
    return new ComplexValueObject(value, SKIP_VALUE_OBJECT_VALIDATION);
  }
}

describe('BaseValueObject', () => {
  describe('constructor', () => {
    it('should validate value using provided validator', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockReturnValue('validated'),
      };

      const vo = TestValueObject.create('test', mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('test');
      expect(vo.value).toBe('validated');
    });

    it('should skip validation with SKIP_VALUE_OBJECT_VALIDATION', () => {
      const vo = TestValueObject.fromRaw('raw value');

      expect(vo.value).toBe('raw value');
    });

    it('should throw when validator throws', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockImplementation(() => {
          throw new Error('Invalid value');
        }),
      };

      expect(() => TestValueObject.create('invalid', mockValidator)).toThrow('Invalid value');
    });
  });

  describe('value getter', () => {
    it('should return the wrapped value', () => {
      const vo = TestValueObject.fromRaw('test value');

      expect(vo.value).toBe('test value');
    });

    it('should return complex objects', () => {
      const complexValue = {
        name: 'test',
        items: [1, 2, 3],
        nested: { value: true },
      };
      const vo = ComplexValueObject.fromRaw(complexValue);

      expect(vo.value).toEqual(complexValue);
    });
  });

  describe('equals', () => {
    describe('primitive values', () => {
      it('should return true for same values', () => {
        const vo1 = TestValueObject.fromRaw('same');
        const vo2 = TestValueObject.fromRaw('same');

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for different values', () => {
        const vo1 = TestValueObject.fromRaw('first');
        const vo2 = TestValueObject.fromRaw('second');

        expect(vo1.equals(vo2)).toBe(false);
      });

      it('should return true for same reference', () => {
        const vo = TestValueObject.fromRaw('test');

        expect(vo.equals(vo)).toBe(true);
      });
    });

    describe('complex values (deep equality)', () => {
      it('should return true for deeply equal objects', () => {
        const vo1 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for different nested values', () => {
        const vo1 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: false },
        });

        expect(vo1.equals(vo2)).toBe(false);
      });

      it('should return false for different array lengths', () => {
        const vo1 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2],
          nested: { value: true },
        });

        expect(vo1.equals(vo2)).toBe(false);
      });

      it('should return false for different array values', () => {
        const vo1 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.fromRaw({
          name: 'test',
          items: [1, 2, 4],
          nested: { value: true },
        });

        expect(vo1.equals(vo2)).toBe(false);
      });
    });

    describe('Date handling', () => {
      class DateValueObject extends BaseValueObject<Date> {
        static fromRaw(value: Date): DateValueObject {
          return new DateValueObject(value, SKIP_VALUE_OBJECT_VALIDATION);
        }
      }

      it('should return true for same date values', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const vo1 = DateValueObject.fromRaw(new Date(date.getTime()));
        const vo2 = DateValueObject.fromRaw(new Date(date.getTime()));

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for different date values', () => {
        const vo1 = DateValueObject.fromRaw(new Date('2024-01-01'));
        const vo2 = DateValueObject.fromRaw(new Date('2024-01-02'));

        expect(vo1.equals(vo2)).toBe(false);
      });
    });

    describe('null and undefined handling', () => {
      class NullableValueObject extends BaseValueObject<string | null | undefined> {
        static fromRaw(value: string | null | undefined): NullableValueObject {
          return new NullableValueObject(value, SKIP_VALUE_OBJECT_VALIDATION);
        }
      }

      it('should return true for both null', () => {
        const vo1 = NullableValueObject.fromRaw(null);
        const vo2 = NullableValueObject.fromRaw(null);

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return true for both undefined', () => {
        const vo1 = NullableValueObject.fromRaw(undefined);
        const vo2 = NullableValueObject.fromRaw(undefined);

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for null vs undefined', () => {
        const vo1 = NullableValueObject.fromRaw(null);
        const vo2 = NullableValueObject.fromRaw(undefined);

        expect(vo1.equals(vo2)).toBe(false);
      });
    });
  });

  describe('SKIP_VALUE_OBJECT_VALIDATION', () => {
    it('should be a specific string constant', () => {
      expect(SKIP_VALUE_OBJECT_VALIDATION).toBe('skip value object validation');
    });
  });
});
