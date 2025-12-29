import { describe, it, expect, vi } from 'vitest';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
  assertStaticMethods,
} from '../base-value-object.class';
import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';
import type { VoClass } from '../base-value-object.class';

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

describe('assertStaticMethods', () => {
  // Test class with create method
  class ValidVoClass extends BaseValueObject<string> {
    static create(value: string): ValidVoClass {
      return new ValidVoClass(value, SKIP_VALUE_OBJECT_VALIDATION);
    }
  }

  // Test class with multiple static methods
  class ExtendedVoClass extends BaseValueObject<string> {
    static create(value: string): ExtendedVoClass {
      return new ExtendedVoClass(value, SKIP_VALUE_OBJECT_VALIDATION);
    }

    static generate(): ExtendedVoClass {
      return new ExtendedVoClass('generated', SKIP_VALUE_OBJECT_VALIDATION);
    }

    static fromString(value: string): ExtendedVoClass {
      return new ExtendedVoClass(value, SKIP_VALUE_OBJECT_VALIDATION);
    }
  }

  // Test class without create method
  class InvalidVoClass extends BaseValueObject<string> {
    static fromRaw(value: string): InvalidVoClass {
      return new InvalidVoClass(value, SKIP_VALUE_OBJECT_VALIDATION);
    }
  }

  describe('with valid classes', () => {
    it('should return class with default create method', () => {
      const result = assertStaticMethods<VoClass<ValidVoClass>>(ValidVoClass);

      expect(result).toBe(ValidVoClass);
    });

    it('should return class with custom methods', () => {
      const result = assertStaticMethods<VoClass<ExtendedVoClass>>(
        ExtendedVoClass,
        ['create', 'generate', 'fromString'],
      );

      expect(result).toBe(ExtendedVoClass);
    });

    it('should work with actual VO classes', () => {
      const result = assertStaticMethods<VoClass<TestValueObject>>(TestValueObject);

      expect(result).toBe(TestValueObject);
    });
  });

  describe('with invalid classes', () => {
    it('should throw for missing create method', () => {
      expect(() => assertStaticMethods(InvalidVoClass)).toThrow(
        'InvalidVoClass must implement static create()',
      );
    });

    it('should throw for missing custom method', () => {
      expect(() => assertStaticMethods(ValidVoClass, ['create', 'generate'])).toThrow(
        'ValidVoClass must implement static generate()',
      );
    });

    it('should include class name in error', () => {
      expect(() => assertStaticMethods(InvalidVoClass)).toThrow('InvalidVoClass');
    });

    it('should include method name in error', () => {
      expect(() => assertStaticMethods(ValidVoClass, ['nonexistent'])).toThrow('nonexistent');
    });

    it('should use Unknown for unnamed classes', () => {
      const anonymousClass = { someMethod: () => {} };

      expect(() => assertStaticMethods(anonymousClass)).toThrow(
        'Unknown must implement static create()',
      );
    });
  });

  describe('edge cases', () => {
    it('should pass any class with empty methods array', () => {
      const anyObject = { notACreateMethod: true };
      const result = assertStaticMethods(anyObject, []);

      expect(result).toBe(anyObject);
    });

    it('should throw for null input', () => {
      expect(() => assertStaticMethods(null)).toThrow();
    });

    it('should throw for undefined input', () => {
      expect(() => assertStaticMethods(undefined)).toThrow();
    });

    it('should work with plain objects that have methods', () => {
      const plainObject = {
        name: 'MyFactory',
        create: () => ({}),
        generate: () => ({}),
      };

      const result = assertStaticMethods(plainObject, ['create', 'generate']);

      expect(result).toBe(plainObject);
    });
  });
});
