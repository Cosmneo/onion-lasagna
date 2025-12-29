import { z } from 'zod';
import { BasePaginationVo } from '../../../../onion-layers/domain/value-objects/base-pagination.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createZodValidator } from '../../bootstrap';

const schema = (maxPageSize: number) =>
  z.object({
    page: z.coerce.number().int().min(1),
    pageSize: z.coerce.number().int().min(1).max(maxPageSize),
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
    const validated = createZodValidator(schema(maxPageSize)).validate({
      page,
      pageSize,
    });
    return new PaginationVo(validated);
  }
}
