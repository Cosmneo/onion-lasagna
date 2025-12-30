import { z } from 'zod';
import type { DeleteTaskRequestData } from '../../../../presentation/http/projects/tasks/delete-task/dtos';

export const deleteTaskRequestSchema: z.ZodType<DeleteTaskRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
    taskId: z.string().min(1),
  }),
});
