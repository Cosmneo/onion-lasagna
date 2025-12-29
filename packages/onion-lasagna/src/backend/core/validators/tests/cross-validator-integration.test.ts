import { describe, it, expect } from 'vitest';

// Import VOs from all validators
import { ShortTextVo as ZodShortText } from '../zod/wrappers/value-objects/short-text.vo';
import { ShortTextVo as ArkShortText } from '../arktype/wrappers/value-objects/short-text.vo';
import { ShortTextVo as ValibotShortText } from '../valibot/wrappers/value-objects/short-text.vo';
import { ShortTextVo as TypeBoxShortText } from '../typebox/wrappers/value-objects/short-text.vo';

import { EmailVo as ZodEmail } from '../zod/wrappers/value-objects/email.vo';
import { EmailVo as ArkEmail } from '../arktype/wrappers/value-objects/email.vo';
import { EmailVo as ValibotEmail } from '../valibot/wrappers/value-objects/email.vo';

import { UuidV4Vo as ZodUuidV4 } from '../zod/wrappers/value-objects/uuid-v4.vo';
import { UuidV4Vo as ArkUuidV4 } from '../arktype/wrappers/value-objects/uuid-v4.vo';
import { UuidV4Vo as ValibotUuidV4 } from '../valibot/wrappers/value-objects/uuid-v4.vo';

import { BaseShortTextVo } from '../../onion-layers/domain/value-objects/base-short-text.vo';
import { BaseEmailVo } from '../../onion-layers/domain/value-objects/base-email.vo';
import { BaseUuidV4Vo } from '../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { BaseValueObject } from '../../onion-layers/domain/classes/base-value-object.class';

/**
 * Cross-validator integration tests prove that VOs from different validators
 * are interchangeable - they extend the same base classes and implement
 * the same interfaces, allowing users to swap validators without changing
 * their domain code.
 */
describe('Cross-Validator Integration', () => {
  describe('ShortTextVo compatibility', () => {
    const testValue = 'Hello World';

    it('all validators should produce VOs extending BaseShortTextVo', () => {
      const zodVo = ZodShortText.create(testValue);
      const arkVo = ArkShortText.create(testValue);
      const valibotVo = ValibotShortText.create(testValue);
      const typeboxVo = TypeBoxShortText.create(testValue);

      expect(zodVo).toBeInstanceOf(BaseShortTextVo);
      expect(arkVo).toBeInstanceOf(BaseShortTextVo);
      expect(valibotVo).toBeInstanceOf(BaseShortTextVo);
      expect(typeboxVo).toBeInstanceOf(BaseShortTextVo);
    });

    it('all validators should produce VOs extending BaseValueObject', () => {
      const zodVo = ZodShortText.create(testValue);
      const arkVo = ArkShortText.create(testValue);
      const valibotVo = ValibotShortText.create(testValue);
      const typeboxVo = TypeBoxShortText.create(testValue);

      expect(zodVo).toBeInstanceOf(BaseValueObject);
      expect(arkVo).toBeInstanceOf(BaseValueObject);
      expect(valibotVo).toBeInstanceOf(BaseValueObject);
      expect(typeboxVo).toBeInstanceOf(BaseValueObject);
    });

    it('all validators should store the same value', () => {
      const zodVo = ZodShortText.create(testValue);
      const arkVo = ArkShortText.create(testValue);
      const valibotVo = ValibotShortText.create(testValue);
      const typeboxVo = TypeBoxShortText.create(testValue);

      expect(zodVo.value).toBe(testValue);
      expect(arkVo.value).toBe(testValue);
      expect(valibotVo.value).toBe(testValue);
      expect(typeboxVo.value).toBe(testValue);
    });

    it('VOs from different validators should be comparable via equals()', () => {
      const zodVo = ZodShortText.create(testValue);
      const arkVo = ArkShortText.create(testValue);

      // Cross-validator equality works because equals() compares values
      expect(zodVo.equals(arkVo)).toBe(true);
      expect(arkVo.equals(zodVo)).toBe(true);
    });
  });

  describe('EmailVo compatibility', () => {
    const testEmail = 'test@example.com';

    it('all validators should produce VOs extending BaseEmailVo', () => {
      const zodVo = ZodEmail.create(testEmail);
      const arkVo = ArkEmail.create(testEmail);
      const valibotVo = ValibotEmail.create(testEmail);

      expect(zodVo).toBeInstanceOf(BaseEmailVo);
      expect(arkVo).toBeInstanceOf(BaseEmailVo);
      expect(valibotVo).toBeInstanceOf(BaseEmailVo);
    });

    it('all validators should store the same value', () => {
      const zodVo = ZodEmail.create(testEmail);
      const arkVo = ArkEmail.create(testEmail);
      const valibotVo = ValibotEmail.create(testEmail);

      expect(zodVo.value).toBe(testEmail);
      expect(arkVo.value).toBe(testEmail);
      expect(valibotVo.value).toBe(testEmail);
    });

    it('VOs from different validators should be comparable via equals()', () => {
      const zodVo = ZodEmail.create(testEmail);
      const valibotVo = ValibotEmail.create(testEmail);

      expect(zodVo.equals(valibotVo)).toBe(true);
    });
  });

  describe('UuidV4Vo compatibility', () => {
    const testUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('all validators should produce VOs extending BaseUuidV4Vo', () => {
      const zodVo = ZodUuidV4.create(testUuid);
      const arkVo = ArkUuidV4.create(testUuid);
      const valibotVo = ValibotUuidV4.create(testUuid);

      expect(zodVo).toBeInstanceOf(BaseUuidV4Vo);
      expect(arkVo).toBeInstanceOf(BaseUuidV4Vo);
      expect(valibotVo).toBeInstanceOf(BaseUuidV4Vo);
    });

    it('all validators should store the same value', () => {
      const zodVo = ZodUuidV4.create(testUuid);
      const arkVo = ArkUuidV4.create(testUuid);
      const valibotVo = ValibotUuidV4.create(testUuid);

      expect(zodVo.value).toBe(testUuid);
      expect(arkVo.value).toBe(testUuid);
      expect(valibotVo.value).toBe(testUuid);
    });

    it('generated UUIDs from all validators should be valid', () => {
      const zodUuid = ZodUuidV4.generate();
      const arkUuid = ArkUuidV4.generate();
      const valibotUuid = ValibotUuidV4.generate();

      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(zodUuid.value).toMatch(uuidV4Regex);
      expect(arkUuid.value).toMatch(uuidV4Regex);
      expect(valibotUuid.value).toMatch(uuidV4Regex);
    });
  });

  describe('validation behavior consistency', () => {
    it('all validators should reject empty ShortText', () => {
      expect(() => ZodShortText.create('')).toThrow();
      expect(() => ArkShortText.create('')).toThrow();
      expect(() => ValibotShortText.create('')).toThrow();
      expect(() => TypeBoxShortText.create('')).toThrow();
    });

    it('all validators should reject text exceeding max length', () => {
      const tooLong = 'a'.repeat(101);

      expect(() => ZodShortText.create(tooLong)).toThrow();
      expect(() => ArkShortText.create(tooLong)).toThrow();
      expect(() => ValibotShortText.create(tooLong)).toThrow();
      expect(() => TypeBoxShortText.create(tooLong)).toThrow();
    });

    it('all validators should reject invalid email format', () => {
      const invalidEmail = 'not-an-email';

      expect(() => ZodEmail.create(invalidEmail)).toThrow();
      expect(() => ArkEmail.create(invalidEmail)).toThrow();
      expect(() => ValibotEmail.create(invalidEmail)).toThrow();
    });

    it('all validators should reject invalid UUID format', () => {
      const invalidUuid = 'not-a-uuid';

      expect(() => ZodUuidV4.create(invalidUuid)).toThrow();
      expect(() => ArkUuidV4.create(invalidUuid)).toThrow();
      expect(() => ValibotUuidV4.create(invalidUuid)).toThrow();
    });
  });

  describe('polymorphic usage', () => {
    // Simulates a use case that accepts any ShortTextVo implementation
    function processShortText(vo: BaseShortTextVo): string {
      return vo.value.toUpperCase();
    }

    it('should accept VOs from any validator in polymorphic function', () => {
      const zodVo = ZodShortText.create('hello');
      const arkVo = ArkShortText.create('world');
      const valibotVo = ValibotShortText.create('test');
      const typeboxVo = TypeBoxShortText.create('value');

      expect(processShortText(zodVo)).toBe('HELLO');
      expect(processShortText(arkVo)).toBe('WORLD');
      expect(processShortText(valibotVo)).toBe('TEST');
      expect(processShortText(typeboxVo)).toBe('VALUE');
    });

    // Simulates a repository that could use any validator
    function processEmail(vo: BaseEmailVo): string {
      return vo.value.toLowerCase();
    }

    it('should accept EmailVos from any validator', () => {
      const zodVo = ZodEmail.create('User@Example.COM');
      const arkVo = ArkEmail.create('Admin@Test.ORG');
      const valibotVo = ValibotEmail.create('Support@Help.NET');

      expect(processEmail(zodVo)).toBe('user@example.com');
      expect(processEmail(arkVo)).toBe('admin@test.org');
      expect(processEmail(valibotVo)).toBe('support@help.net');
    });
  });
});
