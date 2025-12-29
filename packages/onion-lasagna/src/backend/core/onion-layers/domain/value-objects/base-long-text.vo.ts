/**
 * Base long text value object.
 *
 * Represents long-form text fields like articles, content bodies, or notes.
 * Typically validated with a maximum length constraint (e.g., 5000+ chars).
 *
 * **Suggested Length:** 1-5000+ characters
 *
 * **Use Cases:**
 * - Article content
 * - Blog posts
 * - Detailed notes
 * - Rich text content
 *
 * @example Extending with length validation
 * ```typescript
 * import { z } from 'zod';
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 *
 * const longTextSchema = z.string().min(1).max(10000);
 * const longTextValidator = createZodValidator(longTextSchema);
 *
 * class ArticleContentVo extends BaseLongTextVo {
 *   static create(value: string): ArticleContentVo {
 *     return new ArticleContentVo(value, longTextValidator);
 *   }
 * }
 * ```
 */
import {
    BaseValueObject,
    type VoClass,
} from '../classes/base-value-object.class';

/** Static interface for BaseLongTextVo factory. */
export type BaseLongTextVoStatic = VoClass<BaseLongTextVo>;

/**
 * Value object for long-form text strings.
 *
 * @extends BaseValueObject<string>
 */
export class BaseLongTextVo extends BaseValueObject<string> {
    static readonly defaultMaxLength = 5000;

    /**
     * Creates a long text value object. Must be implemented by subclass.
     * @param value - The text value
     * @param maxLength - Optional maximum length (default: 5000)
     * @throws {Error} Always throws - subclasses must override this method
     */
    static create(_value: string, _maxLength?: number): BaseLongTextVo {
        throw new Error('create must be implemented by subclass');
    }
}
