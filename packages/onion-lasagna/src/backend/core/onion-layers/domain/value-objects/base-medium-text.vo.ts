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
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import {
  BaseValueObject,
  SKIP_VALUE_OBJECT_VALIDATION,
} from '../classes/base-value-object.class';

/**
 * Value object for medium-length text strings.
 *
 * @extends BaseValueObject<string>
 */
export class BaseMediumTextVo extends BaseValueObject<string> {
  /**
   * Creates a new BaseMediumTextVo instance.
   *
   * @param value - The medium text string
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

}
