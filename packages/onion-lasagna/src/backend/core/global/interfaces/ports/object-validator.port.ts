/**
 * Function signature for validating an object against a schema.
 *
 * @typeParam TSchema - The schema type (e.g., z.ZodType, Type from ArkType)
 */
export type ValidateObject<TSchema> = <T>(schema: TSchema, value: unknown) => T;

/**
 * A validator bound to a specific schema.
 *
 * Created by {@link ObjectValidatorPort.withSchema} and used by
 * {@link BaseDto} and {@link BaseValueObject} for validation.
 *
 * @typeParam T - The validated output type
 *
 * @example
 * ```typescript
 * const validator: BoundValidator<User> = createZodValidator(userSchema);
 * const user = validator.validate(unknownInput); // Returns User or throws
 * ```
 */
export interface BoundValidator<T> {
  /**
   * Validates unknown input against the bound schema.
   *
   * @param value - The unknown value to validate
   * @returns The validated and typed value
   * @throws {ObjectValidationError} When validation fails
   */
  validate: (value: unknown) => T;
}

/**
 * Port interface for object validation (Strategy pattern).
 *
 * This abstraction allows swapping between validation libraries
 * (Zod, ArkType, TypeBox, Valibot) without changing application code.
 *
 * Implementations:
 * - `ZodObjectValidator` - Zod schema validation
 * - `ArkTypeObjectValidator` - ArkType validation
 * - `TypeBoxObjectValidator` - TypeBox validation
 * - `ValibotObjectValidator` - Valibot validation
 *
 * @typeParam TSchema - The schema type for the validation library
 *
 * @example
 * ```typescript
 * // Using Zod
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 * import { z } from 'zod';
 *
 * const schema = z.object({ name: z.string(), age: z.number() });
 * const validator = createZodValidator(schema);
 * const data = validator.validate({ name: 'John', age: 30 });
 *
 * // Using ArkType
 * import { createArkTypeValidator } from '@cosmneo/onion-lasagna/backend/core/validators/arktype';
 * import { type } from 'arktype';
 *
 * const schema = type({ name: 'string', age: 'number' });
 * const validator = createArkTypeValidator(schema);
 * ```
 */
export interface ObjectValidatorPort<TSchema> {
  /**
   * Validates a value directly against a schema.
   *
   * @param schema - The validation schema
   * @param value - The unknown value to validate
   * @returns The validated and typed value
   * @throws {ObjectValidationError} When validation fails
   */
  validateObject: ValidateObject<TSchema>;

  /**
   * Creates a reusable validator bound to a specific schema.
   *
   * Use this to create validators for DTOs and Value Objects.
   *
   * @param schema - The validation schema to bind
   * @returns A BoundValidator that can validate values against the schema
   */
  withSchema: <T>(schema: TSchema) => BoundValidator<T>;
}
