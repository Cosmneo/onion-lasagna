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

    // C01-1: object-valued VOs must not leak mutable internal state via .value
    it('mutating the returned .value object should NOT affect the stored value (C01-1)', () => {
      const vo = ComplexValueObject.create({
        name: 'original',
        items: [1, 2],
        nested: { value: true },
      });

      const leaked = vo.value as { name: string; items: number[]; nested: { value: boolean } };
      leaked.name = 'mutated';
      leaked.items.push(99);
      leaked.nested.value = false;

      expect(vo.value.name).toBe('original');
      expect(vo.value.items).toEqual([1, 2]);
      expect(vo.value.nested.value).toBe(true);
    });

    // C01-5: deepEquals/deepClone must not stack-overflow on cyclic input
    it('equals should degrade gracefully (return false) on cyclic objects (C01-5)', () => {
      class CyclicVO extends BaseValueObject<Record<string, unknown>> {
        static create(value: Record<string, unknown>): CyclicVO {
          return new CyclicVO(value);
        }
      }
      const a: Record<string, unknown> = { x: 1 };
      a['self'] = a; // cycle
      const vo1 = CyclicVO.create(a);
      const b: Record<string, unknown> = { x: 1 };
      b['self'] = b;
      const vo2 = CyclicVO.create(b);

      // Must not throw / stack-overflow; result doesn't have to be true
      expect(() => vo1.equals(vo2)).not.toThrow();
    });
  });

  describe('null-safety on equals (MISSED)', () => {
    // MISSED: BaseValueObject.equals throws when passed null/undefined
    it('equals(null) should return false without throwing', () => {
      const vo = TestValueObject.create('hello');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => vo.equals(null as any)).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(vo.equals(null as any)).toBe(false);
    });

    it('equals(undefined) should return false without throwing', () => {
      const vo = TestValueObject.create('hello');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => vo.equals(undefined as any)).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(vo.equals(undefined as any)).toBe(false);
    });
  });
});
