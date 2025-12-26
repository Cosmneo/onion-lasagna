import type { BoundValidator } from '../interfaces/ports/object-validator.port';

/**
 * Sentinel value to skip validation in DTO constructors.
 *
 * Use this when creating a DTO from already-validated data,
 * such as when mapping between layers or in tests.
 *
 * @example
 * ```typescript
 * // Skip validation for already-validated data
 * const dto = new CreateUserInputDto(validatedData, SKIP_DTO_VALIDATION);
 * ```
 */
export const SKIP_DTO_VALIDATION = 'skip dto validation' as const;

/**
 * Base class for Data Transfer Objects (DTOs).
 *
 * DTOs are validated data containers used to transfer data between layers.
 * Unlike Value Objects, DTOs are not domain concepts - they are purely
 * for data transfer and validation at system boundaries.
 *
 * Key differences from Value Objects:
 * - **DTOs**: Transfer data between layers (e.g., request/response payloads)
 * - **Value Objects**: Represent domain concepts with behavior (e.g., Email, Money)
 *
 * @typeParam T - The shape of the data being transferred
 *
 * @example
 * ```typescript
 * // Define a DTO with validation
 * class CreateUserInputDto extends BaseDto<{ name: string; email: string }> {
 *   private constructor(data: unknown, validator: BoundValidator<{ name: string; email: string }>) {
 *     super(data, validator);
 *   }
 *
 *   static create(data: unknown): CreateUserInputDto {
 *     return new CreateUserInputDto(data, createUserValidator);
 *   }
 * }
 *
 * // Usage in a controller
 * const dto = CreateUserInputDto.create(request.body);
 * console.log(dto.data.name); // Typed and validated
 * ```
 */
export class BaseDto<T> {
  private readonly _data: T;

  /**
   * Creates a new DTO instance.
   *
   * @param data - The raw data to validate and wrap
   * @param validator - A bound validator or SKIP_DTO_VALIDATION to bypass
   * @throws {ObjectValidationError} When validation fails
   */
  constructor(data: T, validator: BoundValidator<T> | typeof SKIP_DTO_VALIDATION) {
    this._data = validator === SKIP_DTO_VALIDATION ? data : validator.validate(data);
  }

  /**
   * The validated data payload.
   *
   * @returns The validated data of type T
   */
  public get data(): T {
    return this._data;
  }
}
