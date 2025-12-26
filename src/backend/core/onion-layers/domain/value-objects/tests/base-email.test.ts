import { describe, it, expect, vi } from 'vitest';
import { BaseEmailVo } from '../base-email.vo';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '../../classes/base-value-object.class';
import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';

// Concrete implementation for testing
class Email extends BaseEmailVo {
  static create(value: string): Email {
    return new Email(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static createWithValidator(value: string, validator: BoundValidator<string>): Email {
    return new Email(value, validator);
  }
}

describe('BaseEmailVo', () => {
  describe('create', () => {
    it('should create with email value', () => {
      const email = Email.create('user@example.com');

      expect(email.value).toBe('user@example.com');
    });

    it('should accept any string without base validation', () => {
      const email = Email.create('not-an-email');

      expect(email.value).toBe('not-an-email');
    });

    it('should preserve email format', () => {
      const email = Email.create('John.Doe+tag@Sub.Domain.Example.COM');

      expect(email.value).toBe('John.Doe+tag@Sub.Domain.Example.COM');
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const email = Email.create('test@example.com');

      expect(email).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('with validator', () => {
    it('should validate using provided validator', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockReturnValue('normalized@example.com'),
      };

      const email = Email.createWithValidator('INPUT@EXAMPLE.COM', mockValidator);

      expect(mockValidator.validate).toHaveBeenCalledWith('INPUT@EXAMPLE.COM');
      expect(email.value).toBe('normalized@example.com');
    });

    it('should throw when validation fails', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockImplementation(() => {
          throw new Error('Invalid email format');
        }),
      };

      expect(() => Email.createWithValidator('invalid-email', mockValidator)).toThrow(
        'Invalid email format',
      );
    });

    it('should allow empty string validation to throw', () => {
      const mockValidator: BoundValidator<string> = {
        validate: vi.fn().mockImplementation((value) => {
          if (!value || value.trim() === '') {
            throw new Error('Email is required');
          }
          return value;
        }),
      };

      expect(() => Email.createWithValidator('', mockValidator)).toThrow('Email is required');
    });
  });

  describe('equals', () => {
    it('should return true for same email values', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different email values', () => {
      const email1 = Email.create('user1@example.com');
      const email2 = Email.create('user2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });

    it('should be case sensitive by default', () => {
      const email1 = Email.create('User@Example.com');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(false);
    });

    it('should return true for same reference', () => {
      const email = Email.create('user@example.com');

      expect(email.equals(email)).toBe(true);
    });
  });

  describe('common email formats', () => {
    const validEmailFormats = [
      'simple@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user@subdomain.example.com',
      'user@123.456.789.com',
      'user123@example.com',
      'user-name@example.com',
      'user_name@example.com',
    ];

    it.each(validEmailFormats)('should accept email format: %s', (emailValue) => {
      const email = Email.create(emailValue);

      expect(email.value).toBe(emailValue);
    });
  });

  describe('value getter', () => {
    it('should return the email string', () => {
      const emailValue = 'test@example.com';
      const email = Email.create(emailValue);

      expect(email.value).toBe(emailValue);
    });

    it('should return consistent value on multiple accesses', () => {
      const email = Email.create('consistent@example.com');

      expect(email.value).toBe('consistent@example.com');
      expect(email.value).toBe('consistent@example.com');
      expect(email.value).toBe(email.value);
    });
  });
});
