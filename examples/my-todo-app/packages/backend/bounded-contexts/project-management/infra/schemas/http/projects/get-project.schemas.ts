import { z } from 'zod';
import type {
  GetProjectRequestData,
  GetProjectResponseData,
} from '../../../../presentation/http/projects/get-project/dtos';

export const getProjectRequestSchema: z.ZodType<GetProjectRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
  }),
});

const statusListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  isFinal: z.boolean(),
  order: z.number(),
});

const taskListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  statusId: z.string(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

export const getProjectResponseSchema: z.ZodType<GetProjectResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    createdAt: z.date(),
    statuses: z.array(statusListItemSchema),
    tasks: z.array(taskListItemSchema),
  }),
});
