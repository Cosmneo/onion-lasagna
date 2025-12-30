import { z } from 'zod';
import type {
  CreateProjectRequestData,
  CreateProjectResponseData,
} from '../../../../presentation/http/projects/create-project/dtos';

export const createProjectRequestSchema: z.ZodType<CreateProjectRequestData> = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
});

export const createProjectResponseSchema: z.ZodType<CreateProjectResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    projectId: z.string(),
  }),
});
