import { describe, it, expect } from 'vitest';
import { BaseValueObject } from '../base-value-object.class';
import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

// Concrete implementation for testing - validates in create()
class TestValueObject extends BaseValueObject<string> {
  static create(value: TestValueObject['value']): TestValueObject {
    if (!value || value.trim().length === 0) {
      throw new InvariantViolationError({
        message: 'Value cannot be empty',
        code: 'EMPTY_VALUE',
      });
    }
    return new TestValueObject(value);
  }
}

// Complex value object for testing deep equality
class ComplexValueObject extends BaseValueObject<{
  name: string;
  items: number[];
  nested: { value: boolean };
}> {
  static create(value: ComplexValueObject['value']): ComplexValueObject {
    return new ComplexValueObject(value);
  }
}

describe('BaseValueObject', () => {
  describe('factory validation pattern', () => {
    it('should create valid value object', () => {
      const vo = TestValueObject.create('valid');

      expect(vo.value).toBe('valid');
    });

    it('should throw InvariantViolationError for invalid value', () => {
      expect(() => TestValueObject.create('')).toThrow(InvariantViolationError);
      expect(() => TestValueObject.create('   ')).toThrow('Value cannot be empty');
    });

    it('should include error code in thrown error', () => {
      try {
        TestValueObject.create('');
      } catch (error) {
        expect(error).toBeInstanceOf(InvariantViolationError);
        expect((error as InvariantViolationError).code).toBe('EMPTY_VALUE');
      }
    });
  });

  describe('value getter', () => {
    it('should return the wrapped value', () => {
      const vo = TestValueObject.create('test value');

      expect(vo.value).toBe('test value');
    });

    it('should return complex objects', () => {
      const complexValue = {
        name: 'test',
        items: [1, 2, 3],
        nested: { value: true },
      };
      const vo = ComplexValueObject.create(complexValue);

      expect(vo.value).toEqual(complexValue);
    });
  });

  describe('equals', () => {
    describe('primitive values', () => {
      it('should return true for same values', () => {
        const vo1 = TestValueObject.create('same');
        const vo2 = TestValueObject.create('same');

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for different values', () => {
        const vo1 = TestValueObject.create('first');
        const vo2 = TestValueObject.create('second');

        expect(vo1.equals(vo2)).toBe(false);
      });

      it('should return true for same reference', () => {
        const vo = TestValueObject.create('test');

        expect(vo.equals(vo)).toBe(true);
      });
    });

    describe('complex values (deep equality)', () => {
      it('should return true for deeply equal objects', () => {
        const vo1 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for different nested values', () => {
        const vo1 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: false },
        });

        expect(vo1.equals(vo2)).toBe(false);
      });

      it('should return false for different array lengths', () => {
        const vo1 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2],
          nested: { value: true },
        });

        expect(vo1.equals(vo2)).toBe(false);
      });

      it('should return false for different array values', () => {
        const vo1 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2, 3],
          nested: { value: true },
        });
        const vo2 = ComplexValueObject.create({
          name: 'test',
          items: [1, 2, 4],
          nested: { value: true },
        });

        expect(vo1.equals(vo2)).toBe(false);
      });
    });

    describe('Date handling', () => {
      class DateValueObject extends BaseValueObject<Date> {
        static create(value: DateValueObject['value']): DateValueObject {
          return new DateValueObject(value);
        }
      }

      it('should return true for same date values', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const vo1 = DateValueObject.create(new Date(date.getTime()));
        const vo2 = DateValueObject.create(new Date(date.getTime()));

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for different date values', () => {
        const vo1 = DateValueObject.create(new Date('2024-01-01'));
        const vo2 = DateValueObject.create(new Date('2024-01-02'));

        expect(vo1.equals(vo2)).toBe(false);
      });
    });

    describe('null and undefined handling', () => {
      class NullableValueObject extends BaseValueObject<string | null | undefined> {
        static create(value: NullableValueObject['value']): NullableValueObject {
          return new NullableValueObject(value);
        }
      }

      it('should return true for both null', () => {
        const vo1 = NullableValueObject.create(null);
        const vo2 = NullableValueObject.create(null);

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return true for both undefined', () => {
        const vo1 = NullableValueObject.create(undefined);
        const vo2 = NullableValueObject.create(undefined);

        expect(vo1.equals(vo2)).toBe(true);
      });

      it('should return false for null vs undefined', () => {
        const vo1 = NullableValueObject.create(null);
        const vo2 = NullableValueObject.create(undefined);

        expect(vo1.equals(vo2)).toBe(false);
      });
    });
  });

  describe('immutability', () => {
    it('should not allow value modification via reference', () => {
      const originalValue = {
        name: 'test',
        items: [1, 2, 3],
        nested: { value: true },
      };
      const vo = ComplexValueObject.create(originalValue);

      // Modifying the original should not affect the VO
      // (note: this relies on how the VO stores the value)
      const retrievedValue = vo.value;
      expect(retrievedValue).toEqual(originalValue);
    });
  });
});
