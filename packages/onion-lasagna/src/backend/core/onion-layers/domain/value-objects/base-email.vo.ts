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
import {
    BaseValueObject,
    type VoClass,
} from '../classes/base-value-object.class';

/** Static interface for BaseEmailVo factory. */
export type BaseEmailVoStatic = VoClass<BaseEmailVo>;

/**
 * Value object for email addresses.
 *
 * @extends BaseValueObject<string>
 */
export class BaseEmailVo extends BaseValueObject<string> {
    /**
     * Creates an email value object. Must be implemented by subclass.
     * @throws {Error} Always throws - subclasses must override this method
     */
    static create(_value: string): BaseEmailVo {
        throw new Error('create must be implemented by subclass');
    }
}
