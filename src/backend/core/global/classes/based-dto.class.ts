import type { BoundValidator } from '../interfaces/ports/object-validator.port';

export const SKIP_DTO_VALIDATION = 'skip dto validation' as const;

export class BaseDto<T> {
  private readonly _data: T;

  constructor(data: T, validator: BoundValidator<T> | typeof SKIP_DTO_VALIDATION) {
    this._data = validator === SKIP_DTO_VALIDATION ? data : validator.validate(data);
  }

  public get data(): T {
    return this._data;
  }
}

// Example:
// const validator = objectValidator.withSchema(requestSchema);
// const dto = new BaseDto(requestPayload, validator);
// const payload = dto.data;
