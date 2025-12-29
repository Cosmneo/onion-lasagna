/**
 * Base pagination value object.
 *
 * Represents pagination parameters for list queries. Validates that
 * page numbers and page sizes are positive integers within bounds.
 *
 * **Properties:**
 * - `page`: The current page number (1-indexed)
 * - `pageSize`: Number of items per page
 *
 * **Constraint Properties:**
 * - `maxPageSize`: Maximum allowed page size (default: 100)
 *
 * @example Subclass with custom max page size
 * ```typescript
 * class AdminPaginationVo extends BasePaginationVo {
 *   static override maxPageSize = 500;
 * }
 * ```
 *
 * @example Usage in a use case
 * ```typescript
 * class ListUsersUseCase {
 *   async execute(pagination: BasePaginationVo): Promise<User[]> {
 *     const offset = (pagination.page - 1) * pagination.pageSize;
 *     return this.userRepo.findAll({
 *       offset,
 *       limit: pagination.pageSize,
 *     });
 *   }
 * }
 * ```
 */
import { BaseValueObject } from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

/**
 * Value object for pagination parameters.
 *
 * @extends BaseValueObject<{ page: number; pageSize: number }>
 */
export class BasePaginationVo extends BaseValueObject<{ page: number; pageSize: number }> {
  /** Maximum allowed page size. Override in subclass. */
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  static get maxPageSize(): number {
    return 100;
  }

  /**
   * Creates a pagination value object.
   * @param value - The pagination parameters
   * @param value.page - Page number (must be >= 1)
   * @param value.pageSize - Items per page (must be >= 1 and <= maxPageSize)
   * @throws {InvariantViolationError} When constraints are violated
   */
  static create(value: BasePaginationVo['value']): BasePaginationVo {
    const { page, pageSize } = value;

    if (!Number.isInteger(page) || page < 1) {
      throw new InvariantViolationError({
        message: 'Page must be a positive integer',
        code: 'INVALID_PAGE',
      });
    }

    if (!Number.isInteger(pageSize) || pageSize < 1) {
      throw new InvariantViolationError({
        message: 'Page size must be a positive integer',
        code: 'INVALID_PAGE_SIZE',
      });
    }

    if (pageSize > this.maxPageSize) {
      throw new InvariantViolationError({
        message: `Page size must be at most ${this.maxPageSize}`,
        code: 'PAGE_SIZE_TOO_LARGE',
      });
    }

    return new this(value);
  }

  /** The current page number. */
  get page(): number {
    return this.value.page;
  }

  /** The number of items per page. */
  get pageSize(): number {
    return this.value.pageSize;
  }

  /** The offset for database queries. */
  get offset(): number {
    return (this.page - 1) * this.pageSize;
  }
}
