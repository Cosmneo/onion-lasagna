import { z } from 'zod';
import type { UpdateProjectRequestData } from '../../../../presentation/http/projects/update-project/dtos';

export const updateProjectRequestSchema: z.ZodType<UpdateProjectRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
  }),
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }),
});
