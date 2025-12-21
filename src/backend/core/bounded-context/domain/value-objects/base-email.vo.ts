import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';

export class BaseEmailVo extends BaseValueObject<string> {
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }
}
