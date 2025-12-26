/**
 * Base pagination value object.
 *
 * Represents pagination parameters for list queries. Validates that
 * page numbers and page sizes are positive integers within bounds.
 *
 * **Properties:**
 * - `page`: The current page number (typically 1-indexed)
 * - `pageSize`: Number of items per page
 *
 * @example Extending with validation
 * ```typescript
 * import { z } from 'zod';
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 *
 * const paginationSchema = z.object({
 *   page: z.number().int().min(1),
 *   pageSize: z.number().int().min(1).max(100),
 * });
 * const paginationValidator = createZodValidator(paginationSchema);
 *
 * class PaginationVo extends BasePaginationVo {
 *   static create(page: number, pageSize: number): PaginationVo {
 *     return new PaginationVo({ page, pageSize }, paginationValidator);
 *   }
 * }
 * ```
 *
 * @example Usage in a use case
 * ```typescript
 * class ListUsersUseCase {
 *   async execute(pagination: PaginationVo): Promise<User[]> {
 *     const offset = (pagination.page - 1) * pagination.pageSize;
 *     return this.userRepo.findAll({
 *       offset,
 *       limit: pagination.pageSize,
 *     });
 *   }
 * }
 * ```
 */
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';

/**
 * Value object for pagination parameters.
 *
 * @extends BaseValueObject<{ page: number; pageSize: number }>
 */
export class BasePaginationVo extends BaseValueObject<{ page: number; pageSize: number }> {
  /**
   * Creates a new BasePaginationVo instance.
   *
   * @param value - The pagination parameters
   * @param value.page - The page number (typically 1-indexed)
   * @param value.pageSize - The number of items per page
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: { page: number; pageSize: number },
    validator:
      | BoundValidator<{ page: number; pageSize: number }>
      | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  /**
   * The current page number.
   */
  get page(): number {
    return this.value.page;
  }

  /**
   * The number of items per page.
   */
  get pageSize(): number {
    return this.value.pageSize;
  }
}
