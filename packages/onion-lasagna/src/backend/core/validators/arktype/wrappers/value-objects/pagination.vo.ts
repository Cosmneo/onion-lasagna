import { type } from 'arktype';
import { BasePaginationVo } from '../../../../onion-layers/domain/value-objects/base-pagination.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createArkTypeValidator } from '../../bootstrap';

const coerceToInt = (v: string | number): number => (typeof v === 'string' ? parseInt(v, 10) : v);

const schema = (maxPageSize: number) =>
  type({
    page: type('string | number').pipe(coerceToInt, type('number.integer >= 1')),
    pageSize: type('string | number').pipe(
      coerceToInt,
      type(`1 <= number.integer <= ${maxPageSize}`),
    ),
  });

export class PaginationVo extends BasePaginationVo {
  private constructor(value: { page: number; pageSize: number }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create({
    page,
    pageSize,
    maxPageSize = 100,
  }: {
    page: number;
    pageSize: number;
    maxPageSize?: number;
  }): PaginationVo {
    const validated = createArkTypeValidator(schema(maxPageSize)).validate({
      page,
      pageSize,
    }) as unknown as { page: number; pageSize: number };
    return new PaginationVo(validated);
  }
}
