import { z } from 'zod';
import type {
  ListTasksByStatusRequestData,
  ListTasksByStatusResponseData,
} from '../../../../presentation/http/projects/tasks/list-tasks-by-status/dtos';

export const listTasksByStatusRequestSchema: z.ZodType<ListTasksByStatusRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
    statusId: z.string().min(1),
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

export const listTasksByStatusResponseSchema: z.ZodType<ListTasksByStatusResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    items: z.array(taskListItemSchema),
    total: z.number(),
  }),
});
