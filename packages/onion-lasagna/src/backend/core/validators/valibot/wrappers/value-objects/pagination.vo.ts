import {
  object,
  pipe,
  union,
  string,
  number,
  integer,
  minValue,
  maxValue,
  transform,
} from 'valibot';
import { BasePaginationVo } from '../../../../onion-layers/domain/value-objects/base-pagination.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createValibotValidator } from '../../bootstrap';

const coerceInt = pipe(
  union([string(), number()]),
  transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
);

const schema = (maxPageSize: number) =>
  object({
    page: pipe(coerceInt, integer(), minValue(1)),
    pageSize: pipe(coerceInt, integer(), minValue(1), maxValue(maxPageSize)),
  });

export class PaginationVo extends BasePaginationVo {
  private constructor(value: { page: number; pageSize: number }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static override create({
    page,
    pageSize,
    maxPageSize = 100,
  }: {
    page: number;
    pageSize: number;
    maxPageSize?: number;
  }): PaginationVo {
    const validated = createValibotValidator(schema(maxPageSize)).validate({
      page,
      pageSize,
    }) as { page: number; pageSize: number };
    return new PaginationVo(validated);
  }
}
