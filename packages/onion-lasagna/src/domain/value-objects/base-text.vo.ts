/**
 * Base text value object with configurable length constraints.
 *
 * Provides a single text VO that can be configured for different length
 * requirements. Subclasses override static properties to define constraints.
 *
 * **Constraint Properties:**
 * - `defaultMinLength`: Minimum text length (undefined = no minimum)
 * - `defaultMaxLength`: Maximum text length (undefined = no maximum)
 * - `defaultPattern`: Regex pattern to match (undefined = no pattern)
 *
 * @example Subclass with constraints
 * ```typescript
 * class ProductNameVo extends BaseTextVo {
 *   static override defaultMinLength = 1;
 *   static override defaultMaxLength = 100;
 * }
 *
 * class SkuVo extends BaseTextVo {
 *   static override defaultMinLength = 3;
 *   static override defaultMaxLength = 20;
 *   static override defaultPattern = /^[A-Z0-9-]+$/;
 * }
 * ```
 */
import { BaseValueObject } from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

/**
 * Value object for text strings with configurable constraints.
 *
 * @extends BaseValueObject<string>
 */
export class BaseTextVo extends BaseValueObject<string> {
  /** Minimum length constraint. Override in subclass. */
  static defaultMinLength: number | undefined = undefined;

  /** Maximum length constraint. Override in subclass. */
  static defaultMaxLength: number | undefined = undefined;

  /** Regex pattern constraint. Override in subclass. */
  static defaultPattern: RegExp | undefined = undefined;

  /**
   * Creates a text value object.
   * @param value - The text string
   * @throws {InvariantViolationError} When constraints are violated
   */
  static create(value: BaseTextVo['value']): BaseTextVo {
    const minLength = this.defaultMinLength;
    const maxLength = this.defaultMaxLength;
    const pattern = this.defaultPattern;

    if (minLength !== undefined && value.length < minLength) {
      throw new InvariantViolationError({
        message: `Text must be at least ${minLength} characters`,
        code: 'TEXT_TOO_SHORT',
      });
    }

    if (maxLength !== undefined && value.length > maxLength) {
      throw new InvariantViolationError({
        message: `Text must be at most ${maxLength} characters`,
        code: 'TEXT_TOO_LONG',
      });
    }

    if (pattern !== undefined && !pattern.test(value)) {
      throw new InvariantViolationError({
        message: 'Text does not match required pattern',
        code: 'TEXT_INVALID_PATTERN',
      });
    }

    return new this(value);
  }
}

// =============================================================================
// Pre-configured Text VOs (for backwards compatibility)
// =============================================================================

/**
 * Short text value object (1-100 characters).
 *
 * Use for: names, titles, labels
 */
export class BaseShortTextVo extends BaseTextVo {
  static override defaultMinLength = 1;
  static override defaultMaxLength = 100;
}

/**
 * Medium text value object (1-500 characters).
 *
 * Use for: descriptions, summaries, comments
 */
export class BaseMediumTextVo extends BaseTextVo {
  static override defaultMinLength = 1;
  static override defaultMaxLength = 500;
}

/**
 * Long text value object (1-5000 characters).
 *
 * Use for: articles, content bodies, notes
 */
export class BaseLongTextVo extends BaseTextVo {
  static override defaultMinLength = 1;
  static override defaultMaxLength = 5000;
}
