import { z } from 'zod';
import type {
  AddTaskRequestData,
  AddTaskResponseData,
} from '../../../../presentation/http/projects/tasks/add-task/dtos';

export const addTaskRequestSchema: z.ZodType<AddTaskRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
  }),
  body: z.object({
    title: z.string().min(1),
    statusId: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const addTaskResponseSchema: z.ZodType<AddTaskResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    taskId: z.string(),
  }),
});
