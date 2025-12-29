import { describe, it, expect, vi } from 'vitest';
import { v4, v7 } from 'uuid';
import { BaseUuidV4Vo } from '../base-uuid-v4.vo';
import { BaseUuidV7Vo } from '../base-uuid-v7.vo';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '../../classes/base-value-object.class';
import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';

// Concrete test implementations (base classes only have protected constructor)
class TestUuidV4 extends BaseUuidV4Vo {
  static create(value: string): TestUuidV4 {
    return new TestUuidV4(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static generate(): TestUuidV4 {
    return new TestUuidV4(v4(), SKIP_VALUE_OBJECT_VALIDATION);
  }

  static createWithValidator(value: string, validator: BoundValidator<string>): TestUuidV4 {
    return new TestUuidV4(value, validator);
  }
}

class TestUuidV7 extends BaseUuidV7Vo {
  static create(value: string): TestUuidV7 {
    return new TestUuidV7(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static generate(): TestUuidV7 {
    return new TestUuidV7(v7(), SKIP_VALUE_OBJECT_VALIDATION);
  }

  static createWithValidator(value: string, validator: BoundValidator<string>): TestUuidV7 {
    return new TestUuidV7(value, validator);
  }
}

describe('BaseUuidV4Vo', () => {
  describe('generate', () => {
    it('should create a new UUID v4', () => {
      const uuid = TestUuidV4.generate();

      expect(uuid.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = TestUuidV4.generate();
      const uuid2 = TestUuidV4.generate();
      const uuid3 = TestUuidV4.generate();

      expect(uuid1.value).not.toBe(uuid2.value);
      expect(uuid2.value).not.toBe(uuid3.value);
      expect(uuid1.value).not.toBe(uuid3.value);
    });
  });

  describe('create', () => {
    it('should create from existing string value', () => {
      const value = '550e8400-e29b-41d4-a716-446655440000';
      const uuid = TestUuidV4.create(value);

      expect(uuid.value).toBe(value);
    });

    it('should accept any string (base implementation skips validation)', () => {
      const uuid = TestUuidV4.create('not-a-valid-uuid');

      expect(uuid.value).toBe('not-a-valid-uuid');
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const uuid = TestUuidV4.generate();

      expect(uuid).toBeInstanceOf(BaseValueObject);
    });

    it('should work with subclass generate', () => {
      const uuid = TestUuidV4.generate();

      expect(uuid).toBeInstanceOf(TestUuidV4);
      expect(uuid).toBeInstanceOf(BaseUuidV4Vo);
    });

    it('should work with subclass create', () => {
      const uuid = TestUuidV4.create('test-id');

      expect(uuid).toBeInstanceOf(TestUuidV4);
      expect(uuid.value).toBe('test-id');
    });
  });

  describe('with validator', () => {
    it('should validate using provided validator', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockReturnValue('validated-uuid'),
      };

      const uuid = TestUuidV4.createWithValidator('input', mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('input');
      expect(uuid.value).toBe('validated-uuid');
    });

    it('should throw when validator throws', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockImplementation(() => {
          throw new Error('Invalid UUID format');
        }),
      };

      expect(() => TestUuidV4.createWithValidator('invalid', mockValidator)).toThrow(
        'Invalid UUID format',
      );
    });
  });

  describe('equals', () => {
    it('should return true for same UUID values', () => {
      const value = '550e8400-e29b-41d4-a716-446655440000';
      const uuid1 = TestUuidV4.create(value);
      const uuid2 = TestUuidV4.create(value);

      expect(uuid1.equals(uuid2)).toBe(true);
    });

    it('should return false for different UUID values', () => {
      const uuid1 = TestUuidV4.generate();
      const uuid2 = TestUuidV4.generate();

      expect(uuid1.equals(uuid2)).toBe(false);
    });
  });
});

describe('BaseUuidV7Vo', () => {
  describe('generate', () => {
    it('should create a new UUID v7', () => {
      const uuid = TestUuidV7.generate();

      // UUID v7 has version 7 in position 14
      expect(uuid.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = TestUuidV7.generate();
      const uuid2 = TestUuidV7.generate();

      expect(uuid1.value).not.toBe(uuid2.value);
    });

    it('should generate time-sortable UUIDs', async () => {
      const uuid1 = TestUuidV7.generate();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const uuid2 = TestUuidV7.generate();

      // UUID v7 encodes timestamp in first bits, so lexicographic sort = time sort
      expect(uuid1.value < uuid2.value).toBe(true);
    });
  });

  describe('create', () => {
    it('should create from existing string value', () => {
      const value = '018f3b1c-5e7d-7000-8000-000000000001';
      const uuid = TestUuidV7.create(value);

      expect(uuid.value).toBe(value);
    });

    it('should accept any string (base implementation skips validation)', () => {
      const uuid = TestUuidV7.create('not-a-valid-uuid');

      expect(uuid.value).toBe('not-a-valid-uuid');
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const uuid = TestUuidV7.generate();

      expect(uuid).toBeInstanceOf(BaseValueObject);
    });

    it('should work with subclass generate', () => {
      const uuid = TestUuidV7.generate();

      expect(uuid).toBeInstanceOf(TestUuidV7);
      expect(uuid).toBeInstanceOf(BaseUuidV7Vo);
    });
  });

  describe('with validator', () => {
    it('should validate using provided validator', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockReturnValue('validated-uuid'),
      };

      const uuid = TestUuidV7.createWithValidator('input', mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('input');
      expect(uuid.value).toBe('validated-uuid');
    });
  });

  describe('equals', () => {
    it('should return true for same UUID values', () => {
      const value = '018f3b1c-5e7d-7000-8000-000000000001';
      const uuid1 = TestUuidV7.create(value);
      const uuid2 = TestUuidV7.create(value);

      expect(uuid1.equals(uuid2)).toBe(true);
    });

    it('should return false for different UUID values', () => {
      const uuid1 = TestUuidV7.generate();
      const uuid2 = TestUuidV7.generate();

      expect(uuid1.equals(uuid2)).toBe(false);
    });
  });
});

describe('UUID v4 vs v7', () => {
  it('should be distinguishable by version digit', () => {
    const v4Uuid = TestUuidV4.generate();
    const v7Uuid = TestUuidV7.generate();

    // Position 14 (0-indexed) contains version
    expect(v4Uuid.value.charAt(14)).toBe('4');
    expect(v7Uuid.value.charAt(14)).toBe('7');
  });

  it('should both be valid UUIDs', () => {
    const v4Uuid = TestUuidV4.generate();
    const v7Uuid = TestUuidV7.generate();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(v4Uuid.value).toMatch(uuidRegex);
    expect(v7Uuid.value).toMatch(uuidRegex);
  });
});
