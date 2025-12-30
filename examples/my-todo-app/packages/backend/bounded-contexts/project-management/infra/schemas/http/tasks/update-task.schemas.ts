import { z } from 'zod';
import type { UpdateTaskRequestData } from '../../../../presentation/http/projects/tasks/update-task/dtos';

export const updateTaskRequestSchema: z.ZodType<UpdateTaskRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
    taskId: z.string().min(1),
  }),
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});
