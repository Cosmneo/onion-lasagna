import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { v7 } from 'uuid';

export class BaseUuidV7Vo extends BaseValueObject<string> {
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  static generate(): BaseUuidV7Vo {
    return new BaseUuidV7Vo(v7(), SKIP_VALUE_OBJECT_VALIDATION);
  }
}
