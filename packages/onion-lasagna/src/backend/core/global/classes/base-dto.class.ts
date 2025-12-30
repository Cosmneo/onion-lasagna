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
 * Type for DTO validation parameter.
 *
 * Accepts either a bound validator for the data type or the skip sentinel.
 * Use this type in mapper functions and factory methods.
 *
 * @typeParam T - The shape of the data being validated
 *
 * @example
 * ```typescript
 * function toUseCaseMapper(
 *   request: RequestDto,
 *   validator: DtoValidator<InputData> = SKIP_DTO_VALIDATION
 * ): InputDto {
 *   return new InputDto(request.data, validator);
 * }
 * ```
 */
export type DtoValidator<T> = BoundValidator<T> | typeof SKIP_DTO_VALIDATION;

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
  constructor(data: T, validator: DtoValidator<T>) {
    this._data = validator === SKIP_DTO_VALIDATION ? data : validator.validate(data);
  }

  static create<T>(data: T, validator: DtoValidator<T>): BaseDto<T> {
    return new BaseDto(data, validator);
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
