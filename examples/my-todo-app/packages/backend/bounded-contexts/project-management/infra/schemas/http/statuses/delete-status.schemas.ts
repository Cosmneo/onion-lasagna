import { z } from 'zod';
import type { DeleteStatusRequestData } from '../../../../presentation/http/projects/statuses/delete-status/dtos';

export const deleteStatusRequestSchema: z.ZodType<DeleteStatusRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
    statusId: z.string().min(1),
  }),
});
