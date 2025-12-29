import { describe, it, expect } from 'vitest';
import {
  BaseTextVo,
  BaseShortTextVo,
  BaseMediumTextVo,
  BaseLongTextVo,
} from '../base-text.vo';
import { BaseValueObject } from '../../classes/base-value-object.class';
import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

describe('BaseTextVo', () => {
  describe('create', () => {
    it('should create with string value (no constraints by default)', () => {
      const text = BaseTextVo.create('Hello World');

      expect(text.value).toBe('Hello World');
    });

    it('should accept empty string when no min constraint', () => {
      const text = BaseTextVo.create('');

      expect(text.value).toBe('');
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const text = BaseTextVo.create('Test');

      expect(text).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const text1 = BaseTextVo.create('Same Value');
      const text2 = BaseTextVo.create('Same Value');

      expect(text1.equals(text2)).toBe(true);
    });

    it('should return false for different values', () => {
      const text1 = BaseTextVo.create('Value 1');
      const text2 = BaseTextVo.create('Value 2');

      expect(text1.equals(text2)).toBe(false);
    });

    it('should be case sensitive', () => {
      const text1 = BaseTextVo.create('Hello');
      const text2 = BaseTextVo.create('hello');

      expect(text1.equals(text2)).toBe(false);
    });
  });

  describe('subclass with constraints', () => {
    class SkuVo extends BaseTextVo {
      static override defaultMinLength = 3;
      static override defaultMaxLength = 20;
      static override defaultPattern = /^[A-Z0-9-]+$/;
    }

    it('should validate min length', () => {
      expect(() => SkuVo.create('AB')).toThrow(InvariantViolationError);
      expect(() => SkuVo.create('AB')).toThrow('Text must be at least 3 characters');
    });

    it('should validate max length', () => {
      expect(() => SkuVo.create('A'.repeat(21))).toThrow(InvariantViolationError);
      expect(() => SkuVo.create('A'.repeat(21))).toThrow('Text must be at most 20 characters');
    });

    it('should validate pattern', () => {
      expect(() => SkuVo.create('abc')).toThrow(InvariantViolationError);
      expect(() => SkuVo.create('abc')).toThrow('Text does not match required pattern');
    });

    it('should accept valid values', () => {
      const sku = SkuVo.create('SKU-123-ABC');
      expect(sku.value).toBe('SKU-123-ABC');
    });
  });
});

describe('BaseShortTextVo', () => {
  describe('create', () => {
    it('should create with string value', () => {
      const text = BaseShortTextVo.create('Hello World');

      expect(text.value).toBe('Hello World');
    });

    it('should throw for empty string (min length 1)', () => {
      expect(() => BaseShortTextVo.create('')).toThrow(InvariantViolationError);
      expect(() => BaseShortTextVo.create('')).toThrow('Text must be at least 1 characters');
    });

    it('should throw for text over 100 characters', () => {
      expect(() => BaseShortTextVo.create('A'.repeat(101))).toThrow(InvariantViolationError);
      expect(() => BaseShortTextVo.create('A'.repeat(101))).toThrow(
        'Text must be at most 100 characters',
      );
    });

    it('should accept text at max length', () => {
      const text = BaseShortTextVo.create('A'.repeat(100));

      expect(text.value.length).toBe(100);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseTextVo', () => {
      const text = BaseShortTextVo.create('Test');

      expect(text).toBeInstanceOf(BaseTextVo);
      expect(text).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const text1 = BaseShortTextVo.create('Same Value');
      const text2 = BaseShortTextVo.create('Same Value');

      expect(text1.equals(text2)).toBe(true);
    });

    it('should return false for different values', () => {
      const text1 = BaseShortTextVo.create('Value 1');
      const text2 = BaseShortTextVo.create('Value 2');

      expect(text1.equals(text2)).toBe(false);
    });
  });
});

describe('BaseMediumTextVo', () => {
  describe('create', () => {
    it('should create with string value', () => {
      const description = 'This is a product description that explains the features.';
      const text = BaseMediumTextVo.create(description);

      expect(text.value).toBe(description);
    });

    it('should throw for empty string (min length 1)', () => {
      expect(() => BaseMediumTextVo.create('')).toThrow(InvariantViolationError);
    });

    it('should throw for text over 500 characters', () => {
      expect(() => BaseMediumTextVo.create('A'.repeat(501))).toThrow(InvariantViolationError);
      expect(() => BaseMediumTextVo.create('A'.repeat(501))).toThrow(
        'Text must be at most 500 characters',
      );
    });

    it('should accept text at max length', () => {
      const text = BaseMediumTextVo.create('A'.repeat(500));

      expect(text.value.length).toBe(500);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseTextVo', () => {
      const text = BaseMediumTextVo.create('Description');

      expect(text).toBeInstanceOf(BaseTextVo);
      expect(text).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const text1 = BaseMediumTextVo.create('Same description');
      const text2 = BaseMediumTextVo.create('Same description');

      expect(text1.equals(text2)).toBe(true);
    });

    it('should return false for different values', () => {
      const text1 = BaseMediumTextVo.create('Description 1');
      const text2 = BaseMediumTextVo.create('Description 2');

      expect(text1.equals(text2)).toBe(false);
    });
  });
});

describe('BaseLongTextVo', () => {
  describe('create', () => {
    it('should create with string value', () => {
      const article = 'This is a long article content...'.repeat(100);
      const text = BaseLongTextVo.create(article);

      expect(text.value).toBe(article);
    });

    it('should throw for empty string (min length 1)', () => {
      expect(() => BaseLongTextVo.create('')).toThrow(InvariantViolationError);
    });

    it('should throw for text over 5000 characters', () => {
      expect(() => BaseLongTextVo.create('A'.repeat(5001))).toThrow(InvariantViolationError);
      expect(() => BaseLongTextVo.create('A'.repeat(5001))).toThrow(
        'Text must be at most 5000 characters',
      );
    });

    it('should accept text at max length', () => {
      const text = BaseLongTextVo.create('A'.repeat(5000));

      expect(text.value.length).toBe(5000);
    });

    it('should handle multiline content', () => {
      const multiline = 'Line 1\nLine 2\nLine 3\n\nParagraph 2';
      const text = BaseLongTextVo.create(multiline);

      expect(text.value).toBe(multiline);
      expect(text.value).toContain('\n');
    });
  });

  describe('inheritance', () => {
    it('should extend BaseTextVo', () => {
      const text = BaseLongTextVo.create('Article content');

      expect(text).toBeInstanceOf(BaseTextVo);
      expect(text).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const content = 'Long article content here...';
      const text1 = BaseLongTextVo.create(content);
      const text2 = BaseLongTextVo.create(content);

      expect(text1.equals(text2)).toBe(true);
    });

    it('should return false for different values', () => {
      const text1 = BaseLongTextVo.create('Article 1 content');
      const text2 = BaseLongTextVo.create('Article 2 content');

      expect(text1.equals(text2)).toBe(false);
    });
  });
});

describe('text value objects comparison', () => {
  it('should be different types despite similar content', () => {
    const shortText = BaseShortTextVo.create('Hello');
    const mediumText = BaseMediumTextVo.create('Hello');
    const longText = BaseLongTextVo.create('Hello');

    expect(shortText).toBeInstanceOf(BaseShortTextVo);
    expect(mediumText).toBeInstanceOf(BaseMediumTextVo);
    expect(longText).toBeInstanceOf(BaseLongTextVo);
  });

  it('should all extend BaseTextVo and BaseValueObject', () => {
    const shortText = BaseShortTextVo.create('Short');
    const mediumText = BaseMediumTextVo.create('Medium');
    const longText = BaseLongTextVo.create('Long');

    expect(shortText).toBeInstanceOf(BaseTextVo);
    expect(mediumText).toBeInstanceOf(BaseTextVo);
    expect(longText).toBeInstanceOf(BaseTextVo);

    expect(shortText).toBeInstanceOf(BaseValueObject);
    expect(mediumText).toBeInstanceOf(BaseValueObject);
    expect(longText).toBeInstanceOf(BaseValueObject);
  });
});
