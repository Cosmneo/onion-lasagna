export type ValidateObject<TSchema> = <T>(schema: TSchema, value: unknown) => T;

export interface BoundValidator<T> {
  validate: (value: unknown) => T;
}

export interface ObjectValidatorPort<TSchema> {
  validateObject: ValidateObject<TSchema>;
  withSchema: <T>(schema: TSchema) => BoundValidator<T>;
}
