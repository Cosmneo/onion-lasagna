import { z } from 'zod';
import type {
  ListTasksRequestData,
  ListTasksResponseData,
} from '../../../../presentation/http/projects/tasks/list-tasks/dtos';

export const listTasksRequestSchema: z.ZodType<ListTasksRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
  }),
  queryParams: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

const taskListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  statusId: z.string(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

export const listTasksResponseSchema: z.ZodType<ListTasksResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    items: z.array(taskListItemSchema),
    total: z.number(),
  }),
});
