import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { v4 } from 'uuid';

export class BaseUuidV4Vo extends BaseValueObject<string> {
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  static generate(): BaseUuidV4Vo {
    return new BaseUuidV4Vo(v4(), SKIP_VALUE_OBJECT_VALIDATION);
  }
}
