import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';

export const SKIP_VALUE_OBJECT_VALIDATION = 'skip value object validation' as const;

export class BaseValueObject<T> {
  private readonly _value: T;

  protected constructor(
    value: T,
    validator: BoundValidator<T> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    this._value = validator === SKIP_VALUE_OBJECT_VALIDATION ? value : validator.validate(value);
  }

  public equals(other: BaseValueObject<T>): boolean {
    return this.value === other.value;
  }

  public get value(): T {
    return this._value;
  }
}
