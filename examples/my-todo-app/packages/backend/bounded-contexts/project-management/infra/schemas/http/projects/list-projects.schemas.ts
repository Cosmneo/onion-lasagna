import { z } from 'zod';
import type {
  ListProjectsRequestData,
  ListProjectsResponseData,
} from '../../../../presentation/http/projects/list-projects/dtos';

export const listProjectsRequestSchema: z.ZodType<ListProjectsRequestData> = z.object({
  queryParams: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

const projectListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  createdAt: z.date(),
  taskCount: z.number(),
});

export const listProjectsResponseSchema: z.ZodType<ListProjectsResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    items: z.array(projectListItemSchema),
    total: z.number(),
  }),
});
