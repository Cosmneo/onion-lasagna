/**
 * Base email value object.
 *
 * Represents a validated email address. Validates email format
 * in the factory method before construction.
 *
 * @example
 * ```typescript
 * const email = BaseEmailVo.create('user@example.com');
 * console.log(email.value); // "user@example.com"
 * ```
 */
import { BaseValueObject } from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

/**
 * Value object for email addresses.
 *
 * @extends BaseValueObject<string>
 */
export class BaseEmailVo extends BaseValueObject<string> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Creates an email value object.
   * @param value - The email address string
   * @throws {InvariantViolationError} When email format is invalid
   */
  static create(value: BaseEmailVo['value']): BaseEmailVo {
    if (!BaseEmailVo.EMAIL_REGEX.test(value)) {
      throw new InvariantViolationError({
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }
    return new BaseEmailVo(value);
  }
}
