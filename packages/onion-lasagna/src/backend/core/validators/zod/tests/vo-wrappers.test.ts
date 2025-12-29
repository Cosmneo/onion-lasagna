import { describe, it, expect } from 'vitest';
import { EmailVo } from '../wrappers/value-objects/email.vo';
import { UuidV4Vo } from '../wrappers/value-objects/uuid-v4.vo';
import { UuidV7Vo } from '../wrappers/value-objects/uuid-v7.vo';
import { ShortTextVo } from '../wrappers/value-objects/short-text.vo';
import { MediumTextVo } from '../wrappers/value-objects/medium-text.vo';
import { LongTextVo } from '../wrappers/value-objects/long-text.vo';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('Zod Value Object Wrappers', () => {
  describe('EmailVo', () => {
    it('should create with valid email', () => {
      const email = EmailVo.create('test@example.com');

      expect(email.value).toBe('test@example.com');
    });

    it('should throw for invalid email format', () => {
      expect(() => EmailVo.create('invalid-email')).toThrow(ObjectValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => EmailVo.create('')).toThrow(ObjectValidationError);
    });

    it('should accept various valid email formats', () => {
      expect(EmailVo.create('user@domain.com').value).toBe('user@domain.com');
      expect(EmailVo.create('user.name@domain.com').value).toBe('user.name@domain.com');
      expect(EmailVo.create('user+tag@domain.co.uk').value).toBe('user+tag@domain.co.uk');
    });

    it('should support equals comparison', () => {
      const email1 = EmailVo.create('test@example.com');
      const email2 = EmailVo.create('test@example.com');
      const email3 = EmailVo.create('other@example.com');

      expect(email1.equals(email2)).toBe(true);
      expect(email1.equals(email3)).toBe(false);
    });
  });

  describe('UuidV4Vo', () => {
    it('should create with valid UUID v4', () => {
      const uuid = UuidV4Vo.create('550e8400-e29b-41d4-a716-446655440000');

      expect(uuid.value).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should throw for invalid UUID format', () => {
      expect(() => UuidV4Vo.create('invalid-uuid')).toThrow(ObjectValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => UuidV4Vo.create('')).toThrow(ObjectValidationError);
    });

    it('should generate valid UUID v4', () => {
      const uuid = UuidV4Vo.generate();

      // UUIDs have the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(uuid.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = UuidV4Vo.generate();
      const uuid2 = UuidV4Vo.generate();

      expect(uuid1.value).not.toBe(uuid2.value);
    });

    it('should support equals comparison', () => {
      const uuid1 = UuidV4Vo.create('550e8400-e29b-41d4-a716-446655440000');
      const uuid2 = UuidV4Vo.create('550e8400-e29b-41d4-a716-446655440000');
      const uuid3 = UuidV4Vo.create('550e8400-e29b-41d4-a716-446655440001');

      expect(uuid1.equals(uuid2)).toBe(true);
      expect(uuid1.equals(uuid3)).toBe(false);
    });
  });

  describe('UuidV7Vo', () => {
    it('should create with valid UUID v7', () => {
      // UUID v7 has specific format with timestamp
      const uuid = UuidV7Vo.create('01932c8e-7e8c-7000-8000-000000000000');

      expect(uuid.value).toBe('01932c8e-7e8c-7000-8000-000000000000');
    });

    it('should throw for invalid UUID format', () => {
      expect(() => UuidV7Vo.create('invalid-uuid')).toThrow(ObjectValidationError);
    });

    it('should generate valid UUID v7', () => {
      const uuid = UuidV7Vo.generate();

      // UUIDs have the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(uuid.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = UuidV7Vo.generate();
      const uuid2 = UuidV7Vo.generate();

      expect(uuid1.value).not.toBe(uuid2.value);
    });

    it('should support equals comparison', () => {
      const uuid1 = UuidV7Vo.create('01932c8e-7e8c-7000-8000-000000000000');
      const uuid2 = UuidV7Vo.create('01932c8e-7e8c-7000-8000-000000000000');
      const uuid3 = UuidV7Vo.create('01932c8e-7e8c-7000-8000-000000000001');

      expect(uuid1.equals(uuid2)).toBe(true);
      expect(uuid1.equals(uuid3)).toBe(false);
    });
  });

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

    it('should accept text one below max length', () => {
      const text = ShortTextVo.create('a'.repeat(99));

      expect(text.value).toHaveLength(99);
    });

    it('should accept single character (min boundary)', () => {
      const text = ShortTextVo.create('a');

      expect(text.value).toBe('a');
    });

    it('should support custom max length', () => {
      const text = ShortTextVo.create('a'.repeat(200), 200);
      expect(text.value).toHaveLength(200);
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

    it('should accept text one below max length', () => {
      const text = MediumTextVo.create('a'.repeat(499));

      expect(text.value).toHaveLength(499);
    });

    it('should accept single character (min boundary)', () => {
      const text = MediumTextVo.create('a');

      expect(text.value).toBe('a');
    });

    it('should throw for text exceeding max length', () => {
      // MediumText default max is 500 characters
      const longText = 'a'.repeat(501);

      expect(() => MediumTextVo.create(longText)).toThrow(ObjectValidationError);
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
      // LongText default max is 5000 characters
      const text = 'a'.repeat(5000);
      const longText = LongTextVo.create(text);

      expect(longText.value).toBe(text);
    });

    it('should accept text one below max length', () => {
      const text = LongTextVo.create('a'.repeat(4999));

      expect(text.value).toHaveLength(4999);
    });

    it('should accept single character (min boundary)', () => {
      const text = LongTextVo.create('a');

      expect(text.value).toBe('a');
    });

    it('should throw for text exceeding max length', () => {
      // LongText default max is 5000 characters
      const veryLongText = 'a'.repeat(5001);

      expect(() => LongTextVo.create(veryLongText)).toThrow(ObjectValidationError);
    });
  });
});
