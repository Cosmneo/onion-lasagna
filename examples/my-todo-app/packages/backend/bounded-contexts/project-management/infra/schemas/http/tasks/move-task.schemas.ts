import { z } from 'zod';
import type { MoveTaskRequestData } from '../../../../presentation/http/projects/tasks/move-task/dtos';

export const moveTaskRequestSchema: z.ZodType<MoveTaskRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
    taskId: z.string().min(1),
  }),
  body: z.object({
    statusId: z.string().min(1),
  }),
});
