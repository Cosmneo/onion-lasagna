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
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '../classes/base-value-object.class';

/**
 * Value object for long-form text strings.
 *
 * @extends BaseValueObject<string>
 */
export class BaseLongTextVo extends BaseValueObject<string> {
  /**
   * Creates a new BaseLongTextVo instance.
   *
   * @param value - The long text string
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

}
