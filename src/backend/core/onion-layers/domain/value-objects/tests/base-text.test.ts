import { describe, it, expect, vi } from 'vitest';
import { BaseShortTextVo } from '../base-short-text.vo';
import { BaseMediumTextVo } from '../base-medium-text.vo';
import { BaseLongTextVo } from '../base-long-text.vo';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../../classes/base-value-object.class';
import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';

// Concrete implementations for testing
class ShortText extends BaseShortTextVo {
  static create(value: string): ShortText {
    return new ShortText(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static createWithValidator(value: string, validator: BoundValidator<string>): ShortText {
    return new ShortText(value, validator);
  }
}

class MediumText extends BaseMediumTextVo {
  static create(value: string): MediumText {
    return new MediumText(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static createWithValidator(value: string, validator: BoundValidator<string>): MediumText {
    return new MediumText(value, validator);
  }
}

class LongText extends BaseLongTextVo {
  static create(value: string): LongText {
    return new LongText(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static createWithValidator(value: string, validator: BoundValidator<string>): LongText {
    return new LongText(value, validator);
  }
}

describe('BaseShortTextVo', () => {
  describe('create', () => {
    it('should create with string value', () => {
      const text = ShortText.create('Hello World');

      expect(text.value).toBe('Hello World');
    });

    it('should accept empty string', () => {
      const text = ShortText.create('');

      expect(text.value).toBe('');
    });

    it('should handle short text content', () => {
      const value = 'Product Name';
      const text = ShortText.create(value);

      expect(text.value).toBe(value);
      expect(text.value.length).toBeLessThanOrEqual(100);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const text = ShortText.create('Test');

      expect(text).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('with validator', () => {
    it('should validate using provided validator', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockReturnValue('trimmed value'),
      };

      const text = ShortText.createWithValidator('  input  ', mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('  input  ');
      expect(text.value).toBe('trimmed value');
    });

    it('should throw when validation fails', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockImplementation(() => {
          throw new Error('Text too long');
        }),
      };

      expect(() => ShortText.createWithValidator('x'.repeat(200), mockValidator)).toThrow(
        'Text too long',
      );
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const text1 = ShortText.create('Same Value');
      const text2 = ShortText.create('Same Value');

      expect(text1.equals(text2)).toBe(true);
    });

    it('should return false for different values', () => {
      const text1 = ShortText.create('Value 1');
      const text2 = ShortText.create('Value 2');

      expect(text1.equals(text2)).toBe(false);
    });

    it('should be case sensitive', () => {
      const text1 = ShortText.create('Hello');
      const text2 = ShortText.create('hello');

      expect(text1.equals(text2)).toBe(false);
    });
  });
});

describe('BaseMediumTextVo', () => {
  describe('create', () => {
    it('should create with string value', () => {
      const description = 'This is a product description that explains the features.';
      const text = MediumText.create(description);

      expect(text.value).toBe(description);
    });

    it('should handle medium-length content', () => {
      const value = 'A'.repeat(500);
      const text = MediumText.create(value);

      expect(text.value).toBe(value);
      expect(text.value.length).toBe(500);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const text = MediumText.create('Description');

      expect(text).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('with validator', () => {
    it('should validate using provided validator', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockReturnValue('processed description'),
      };

      const text = MediumText.createWithValidator('input', mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('input');
      expect(text.value).toBe('processed description');
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const text1 = MediumText.create('Same description');
      const text2 = MediumText.create('Same description');

      expect(text1.equals(text2)).toBe(true);
    });

    it('should return false for different values', () => {
      const text1 = MediumText.create('Description 1');
      const text2 = MediumText.create('Description 2');

      expect(text1.equals(text2)).toBe(false);
    });
  });
});

describe('BaseLongTextVo', () => {
  describe('create', () => {
    it('should create with string value', () => {
      const article = 'This is a long article content...'.repeat(100);
      const text = LongText.create(article);

      expect(text.value).toBe(article);
    });

    it('should handle long-form content', () => {
      const value = 'A'.repeat(5000);
      const text = LongText.create(value);

      expect(text.value).toBe(value);
      expect(text.value.length).toBe(5000);
    });

    it('should handle multiline content', () => {
      const multiline = 'Line 1\nLine 2\nLine 3\n\nParagraph 2';
      const text = LongText.create(multiline);

      expect(text.value).toBe(multiline);
      expect(text.value).toContain('\n');
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const text = LongText.create('Article content');

      expect(text).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('with validator', () => {
    it('should validate using provided validator', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockReturnValue('sanitized content'),
      };

      const text = LongText.createWithValidator('<script>alert(1)</script>content', mockValidator);

      expect(mockValidator.validate).toHaveBeenCalled();
      expect(text.value).toBe('sanitized content');
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      const content = 'Long article content here...';
      const text1 = LongText.create(content);
      const text2 = LongText.create(content);

      expect(text1.equals(text2)).toBe(true);
    });

    it('should return false for different values', () => {
      const text1 = LongText.create('Article 1 content');
      const text2 = LongText.create('Article 2 content');

      expect(text1.equals(text2)).toBe(false);
    });
  });
});

describe('text value objects comparison', () => {
  it('should be different types despite similar content', () => {
    const shortText = ShortText.create('Hello');
    const mediumText = MediumText.create('Hello');
    const longText = LongText.create('Hello');

    expect(shortText).toBeInstanceOf(BaseShortTextVo);
    expect(mediumText).toBeInstanceOf(BaseMediumTextVo);
    expect(longText).toBeInstanceOf(BaseLongTextVo);

    // Each is its own type
    expect(shortText).not.toBeInstanceOf(BaseMediumTextVo);
    expect(mediumText).not.toBeInstanceOf(BaseLongTextVo);
    expect(longText).not.toBeInstanceOf(BaseShortTextVo);
  });

  it('should all extend BaseValueObject', () => {
    const shortText = ShortText.create('Short');
    const mediumText = MediumText.create('Medium');
    const longText = LongText.create('Long');

    expect(shortText).toBeInstanceOf(BaseValueObject);
    expect(mediumText).toBeInstanceOf(BaseValueObject);
    expect(longText).toBeInstanceOf(BaseValueObject);
  });
});
