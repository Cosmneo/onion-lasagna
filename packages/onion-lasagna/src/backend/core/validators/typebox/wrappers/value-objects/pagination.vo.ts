import { Type } from '@sinclair/typebox';
import { BasePaginationVo } from '../../../../onion-layers/domain/value-objects/base-pagination.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = (maxPageSize: number) =>
  Type.Object({
    page: Type.Integer({ minimum: 1 }),
    pageSize: Type.Integer({ minimum: 1, maximum: maxPageSize }),
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
    const validated = createTypeBoxValidator<{ page: number; pageSize: number }>(
      schema(maxPageSize),
    ).validate({
      page,
      pageSize,
    });
    return new PaginationVo(validated);
  }
}
