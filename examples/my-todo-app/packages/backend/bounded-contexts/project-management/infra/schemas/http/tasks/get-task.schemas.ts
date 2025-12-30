import { z } from 'zod';
import type {
  GetTaskRequestData,
  GetTaskResponseData,
} from '../../../../presentation/http/projects/tasks/get-task/dtos';

export const getTaskRequestSchema: z.ZodType<GetTaskRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
    taskId: z.string().min(1),
  }),
});

export const getTaskResponseSchema: z.ZodType<GetTaskResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    statusId: z.string(),
    createdAt: z.date(),
    completedAt: z.date().nullable(),
  }),
});
