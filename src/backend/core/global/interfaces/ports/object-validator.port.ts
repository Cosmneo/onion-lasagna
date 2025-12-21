export type ValidateObject = <T>(schema: unknown, value: unknown) => T;

export interface BoundValidator {
  validate: <T>(value: unknown) => T;
}

export interface ObjectValidatorPort {
  validateObject: ValidateObject;
  withSchema: (schema: unknown) => BoundValidator;
}
