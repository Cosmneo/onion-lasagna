import { describe, it, expect } from 'vitest';
import { BaseEmailVo } from '../base-email.vo';
import { BaseValueObject } from '../../classes/base-value-object.class';
import { InvariantViolationError } from '../../exceptions/invariant-violation.error';

describe('BaseEmailVo', () => {
  describe('create', () => {
    it('should create with valid email value', () => {
      const email = BaseEmailVo.create('user@example.com');

      expect(email.value).toBe('user@example.com');
    });

    it('should preserve email format', () => {
      const email = BaseEmailVo.create('John.Doe+tag@Sub.Domain.Example.COM');

      expect(email.value).toBe('John.Doe+tag@Sub.Domain.Example.COM');
    });

    it('should throw InvariantViolationError for invalid email format', () => {
      expect(() => BaseEmailVo.create('not-an-email')).toThrow(InvariantViolationError);
      expect(() => BaseEmailVo.create('missing@domain')).toThrow('Invalid email format');
    });

    it('should throw for empty string', () => {
      expect(() => BaseEmailVo.create('')).toThrow(InvariantViolationError);
    });

    it('should throw for email without @ symbol', () => {
      expect(() => BaseEmailVo.create('userexample.com')).toThrow(InvariantViolationError);
    });

    it('should throw for email without domain', () => {
      expect(() => BaseEmailVo.create('user@')).toThrow(InvariantViolationError);
    });

    it('should throw for email without local part', () => {
      expect(() => BaseEmailVo.create('@example.com')).toThrow(InvariantViolationError);
    });
  });

  describe('inheritance', () => {
    it('should extend BaseValueObject', () => {
      const email = BaseEmailVo.create('test@example.com');

      expect(email).toBeInstanceOf(BaseValueObject);
    });
  });

  describe('equals', () => {
    it('should return true for same email values', () => {
      const email1 = BaseEmailVo.create('user@example.com');
      const email2 = BaseEmailVo.create('user@example.com');

      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different email values', () => {
      const email1 = BaseEmailVo.create('user1@example.com');
      const email2 = BaseEmailVo.create('user2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });

    it('should be case sensitive by default', () => {
      const email1 = BaseEmailVo.create('User@Example.com');
      const email2 = BaseEmailVo.create('user@example.com');

      expect(email1.equals(email2)).toBe(false);
    });

    it('should return true for same reference', () => {
      const email = BaseEmailVo.create('user@example.com');

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
      const email = BaseEmailVo.create(emailValue);

      expect(email.value).toBe(emailValue);
    });
  });

  describe('value getter', () => {
    it('should return the email string', () => {
      const emailValue = 'test@example.com';
      const email = BaseEmailVo.create(emailValue);

      expect(email.value).toBe(emailValue);
    });

    it('should return consistent value on multiple accesses', () => {
      const email = BaseEmailVo.create('consistent@example.com');

      expect(email.value).toBe('consistent@example.com');
      expect(email.value).toBe('consistent@example.com');
      expect(email.value).toBe(email.value);
    });
  });
});
