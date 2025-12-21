import { z } from 'zod';
import type { HttpRequest } from '../../interfaces/types/http-request';

/**
 * Zod schema that validates the HttpRequest type.
 * The type is defined in presentation/interfaces/types - this schema just validates it.
 */
export const httpRequestSchema = z.object({
  body: z.unknown().optional(),
  headers: z.record(z.string(), z.unknown()).optional(),
  queryParams: z.record(z.string(), z.unknown()).optional(),
  pathParams: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<HttpRequest>;
