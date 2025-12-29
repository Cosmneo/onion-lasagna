/**
 * Base short text value object.
 *
 * Represents short text fields like names, titles, or labels.
 * Typically validated with a maximum length constraint (e.g., 100 chars).
 *
 * **Suggested Length:** 1-100 characters
 *
 * **Use Cases:**
 * - User names
 * - Product titles
 * - Category names
 * - Short labels
 *
 * @example Extending with length validation
 * ```typescript
 * import { z } from 'zod';
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 *
 * const shortTextSchema = z.string().min(1).max(100);
 * const shortTextValidator = createZodValidator(shortTextSchema);
 *
 * class UserNameVo extends BaseShortTextVo {
 *   static create(value: string): UserNameVo {
 *     return new UserNameVo(value, shortTextValidator);
 *   }
 * }
 * ```
 */
import {
    BaseValueObject,
    type VoClass,
} from '../classes/base-value-object.class';

/** Static interface for BaseShortTextVo factory. */
export type BaseShortTextVoStatic = VoClass<BaseShortTextVo>;

/**
 * Value object for short text strings.
 *
 * @extends BaseValueObject<string>
 */
export class BaseShortTextVo extends BaseValueObject<string> {
    static readonly defaultMaxLength = 100;

    /**
     * Creates a short text value object. Must be implemented by subclass.
     * @param value - The text value
     * @param maxLength - Optional maximum length (default: 100)
     * @throws {Error} Always throws - subclasses must override this method
     */
    static create(_value: string, _maxLength?: number): BaseShortTextVo {
        throw new Error('create must be implemented by subclass');
    }
}
