import { z } from 'zod';
import type {
  ListStatusesRequestData,
  ListStatusesResponseData,
} from '../../../../presentation/http/projects/statuses/list-statuses/dtos';

export const listStatusesRequestSchema: z.ZodType<ListStatusesRequestData> = z.object({
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

export const listStatusesResponseSchema: z.ZodType<ListStatusesResponseData> = z.object({
  statusCode: z.number(),
  body: z.object({
    statuses: z.array(statusListItemSchema),
  }),
});
