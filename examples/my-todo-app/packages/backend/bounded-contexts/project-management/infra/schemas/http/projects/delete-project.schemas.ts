import { z } from 'zod';
import type { DeleteProjectRequestData } from '../../../../presentation/http/projects/delete-project/dtos';

export const deleteProjectRequestSchema: z.ZodType<DeleteProjectRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
  }),
});
