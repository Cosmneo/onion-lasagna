import { z } from 'zod';
import type { UpdateStatusRequestData } from '../../../../presentation/http/projects/statuses/update-status/dtos';

export const updateStatusRequestSchema: z.ZodType<UpdateStatusRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
    statusId: z.string().min(1),
  }),
  body: z.object({
    name: z.string().optional(),
    isFinal: z.boolean().optional(),
    order: z.number().optional(),
  }),
});
