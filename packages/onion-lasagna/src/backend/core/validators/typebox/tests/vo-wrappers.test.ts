import { describe, it, expect } from 'vitest';
import { ShortTextVo } from '../wrappers/value-objects/short-text.vo';
import { MediumTextVo } from '../wrappers/value-objects/medium-text.vo';
import { LongTextVo } from '../wrappers/value-objects/long-text.vo';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

/**
 * Note: TypeBox's format validation (email, uuid) requires FormatRegistry setup.
 * These tests focus on length-based validation which works out of the box.
 *
 * Email, UUID, and other format-based VOs would need FormatRegistry configuration
 * to work properly in a real application.
 */
describe('TypeBox Value Object Wrappers', () => {
  describe('ShortTextVo', () => {
    it('should create with valid short text', () => {
      const text = ShortTextVo.create('Hello');

      expect(text.value).toBe('Hello');
    });

    it('should throw for empty string', () => {
      expect(() => ShortTextVo.create('')).toThrow(ObjectValidationError);
    });

    it('should throw for text exceeding max length', () => {
      // ShortText default max is 100 characters
      const longText = 'a'.repeat(101);

      expect(() => ShortTextVo.create(longText)).toThrow(ObjectValidationError);
    });

    it('should accept text at max length boundary', () => {
      const maxText = 'a'.repeat(100);
      const text = ShortTextVo.create(maxText);

      expect(text.value).toBe(maxText);
    });

    it('should support custom max length', () => {
      const text = ShortTextVo.create('a'.repeat(200), 200);
      expect(text.value).toHaveLength(200);
    });

    it('should support equals comparison', () => {
      const text1 = ShortTextVo.create('hello');
      const text2 = ShortTextVo.create('hello');
      const text3 = ShortTextVo.create('world');

      expect(text1.equals(text2)).toBe(true);
      expect(text1.equals(text3)).toBe(false);
    });
  });

  describe('MediumTextVo', () => {
    it('should create with valid medium text', () => {
      const text = MediumTextVo.create('This is a medium length text.');

      expect(text.value).toBe('This is a medium length text.');
    });

    it('should throw for empty string', () => {
      expect(() => MediumTextVo.create('')).toThrow(ObjectValidationError);
    });

    it('should accept text at max length boundary', () => {
      // MediumText default max is 500 characters
      const text = 'a'.repeat(500);
      const mediumText = MediumTextVo.create(text);

      expect(mediumText.value).toBe(text);
    });

    it('should throw for text exceeding max length', () => {
      // MediumText default max is 500 characters
      const longText = 'a'.repeat(501);

      expect(() => MediumTextVo.create(longText)).toThrow(ObjectValidationError);
    });

    it('should support equals comparison', () => {
      const text1 = MediumTextVo.create('hello');
      const text2 = MediumTextVo.create('hello');
      const text3 = MediumTextVo.create('world');

      expect(text1.equals(text2)).toBe(true);
      expect(text1.equals(text3)).toBe(false);
    });
  });

  describe('LongTextVo', () => {
    it('should create with valid long text', () => {
      const text = LongTextVo.create('This is a long text that could be used for descriptions.');

      expect(text.value).toBe('This is a long text that could be used for descriptions.');
    });

    it('should throw for empty string', () => {
      expect(() => LongTextVo.create('')).toThrow(ObjectValidationError);
    });

    it('should accept text at max length boundary', () => {
      // LongText default max is 2000 characters
      const text = 'a'.repeat(2000);
      const longText = LongTextVo.create(text);

      expect(longText.value).toBe(text);
    });

    it('should throw for text exceeding max length', () => {
      // LongText default max is 2000 characters
      const veryLongText = 'a'.repeat(2001);

      expect(() => LongTextVo.create(veryLongText)).toThrow(ObjectValidationError);
    });

    it('should support equals comparison', () => {
      const text1 = LongTextVo.create('hello');
      const text2 = LongTextVo.create('hello');
      const text3 = LongTextVo.create('world');

      expect(text1.equals(text2)).toBe(true);
      expect(text1.equals(text3)).toBe(false);
    });
  });
});
