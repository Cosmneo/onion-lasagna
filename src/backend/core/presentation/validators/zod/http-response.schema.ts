import { z } from 'zod';
import type { HttpResponse } from '../../interfaces/types/http-response';

/**
 * Zod schema that validates the HttpResponse type.
 * The type is defined in presentation/interfaces/types - this schema just validates it.
 */
export const httpResponseSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  headers: z.record(z.string(), z.unknown()).optional(),
  body: z.unknown().optional(),
}) satisfies z.ZodType<HttpResponse>;
