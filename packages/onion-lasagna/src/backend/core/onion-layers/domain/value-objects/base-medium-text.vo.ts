/**
 * Base medium text value object.
 *
 * Represents medium-length text fields like descriptions or summaries.
 * Typically validated with a maximum length constraint (e.g., 500 chars).
 *
 * **Suggested Length:** 1-500 characters
 *
 * **Use Cases:**
 * - Product descriptions
 * - User bios
 * - Short summaries
 * - Comments
 *
 * @example Extending with length validation
 * ```typescript
 * import { z } from 'zod';
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 *
 * const mediumTextSchema = z.string().min(1).max(500);
 * const mediumTextValidator = createZodValidator(mediumTextSchema);
 *
 * class DescriptionVo extends BaseMediumTextVo {
 *   static create(value: string): DescriptionVo {
 *     return new DescriptionVo(value, mediumTextValidator);
 *   }
 * }
 * ```
 */
import {
    BaseValueObject,
    type VoClass,
} from '../classes/base-value-object.class';

/** Static interface for BaseMediumTextVo factory. */
export type BaseMediumTextVoStatic = VoClass<BaseMediumTextVo>;

/**
 * Value object for medium-length text strings.
 *
 * @extends BaseValueObject<string>
 */
export class BaseMediumTextVo extends BaseValueObject<string> {
    static readonly defaultMaxLength = 500;

    /**
     * Creates a medium text value object. Must be implemented by subclass.
     * @param value - The text value
     * @param maxLength - Optional maximum length (default: 500)
     * @throws {Error} Always throws - subclasses must override this method
     */
    static create(_value: string, _maxLength?: number): BaseMediumTextVo {
        throw new Error('create must be implemented by subclass');
    }
}
