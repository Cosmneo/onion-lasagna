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
import {
    BaseValueObject,
    type VoClass,
} from '../classes/base-value-object.class';

/** Static interface for BasePaginationVo factory. */
export type BasePaginationVoStatic = VoClass<BasePaginationVo>;

/**
 * Value object for pagination parameters.
 *
 * @extends BaseValueObject<{ page: number; pageSize: number }>
 */
export class BasePaginationVo extends BaseValueObject<{ page: number; pageSize: number }> {
    /**
     * Creates a pagination value object. Must be implemented by subclass.
     * @throws {Error} Always throws - subclasses must override this method
     */
    static create(_value: { page: number; pageSize: number; maxPageSize?: number }): BasePaginationVo {
        throw new Error('create must be implemented by subclass');
    }
}
