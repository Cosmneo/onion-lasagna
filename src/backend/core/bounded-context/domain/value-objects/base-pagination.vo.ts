import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';

export class BasePaginationVo extends BaseValueObject<{ page: number; pageSize: number }> {
  protected constructor(
    value: { page: number; pageSize: number },
    validator:
      | BoundValidator<{ page: number; pageSize: number }>
      | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  get page(): number {
    return this.value.page;
  }

  get pageSize(): number {
    return this.value.pageSize;
  }
}
