import { z } from 'zod';
import type {
  AddStatusRequestData,
  AddStatusResponseData,
} from '../../../../presentation/http/projects/statuses/add-status/dtos';

export const addStatusRequestSchema: z.ZodType<AddStatusRequestData> = z.object({
  pathParams: z.object({
    projectId: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(1),
    isFinal: z.boolean(),
    order: z.number(),
  }),
});

export const addStatusResponseSchema: z.ZodType<AddStatusResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    statusId: z.string(),
  }),
});
