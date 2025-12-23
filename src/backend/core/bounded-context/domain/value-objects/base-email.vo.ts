/**
 * Base email value object.
 *
 * Represents a validated email address. Extend this class and provide
 * a validator that enforces email format rules.
 *
 * @example Extending with Zod validation
 * ```typescript
 * import { z } from 'zod';
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 *
 * const emailSchema = z.string().email();
 * const emailValidator = createZodValidator(emailSchema);
 *
 * class EmailVo extends BaseEmailVo {
 *   static create(value: string): EmailVo {
 *     return new EmailVo(value, emailValidator);
 *   }
 * }
 * ```
 *
 * @example Usage
 * ```typescript
 * const email = EmailVo.create('user@example.com');
 * console.log(email.value); // "user@example.com"
 * ```
 */
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';

/**
 * Value object for email addresses.
 *
 * @extends BaseValueObject<string>
 */
export class BaseEmailVo extends BaseValueObject<string> {
  /**
   * Creates a new BaseEmailVo instance.
   *
   * @param value - The email address string
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }
}
