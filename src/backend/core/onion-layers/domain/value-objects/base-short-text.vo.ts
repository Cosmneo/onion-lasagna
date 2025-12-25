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
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';

/**
 * Value object for short text strings.
 *
 * @extends BaseValueObject<string>
 */
export class BaseShortTextVo extends BaseValueObject<string> {
  /**
   * Creates a new BaseShortTextVo instance.
   *
   * @param value - The short text string
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }
}
