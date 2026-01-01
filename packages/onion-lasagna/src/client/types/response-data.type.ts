/**
 * Base shape for response data interfaces.
 * Matches the existing *ResponseData interface pattern used in DTOs.
 *
 * @example
 * ```typescript
 * interface CreateProjectResponseData extends HttpResponse {
 *   body: {
 *     projectId: string;
 *   };
 * }
 * ```
 */
export interface ResponseDataShape {
  statusCode: number;
  body: unknown;
}

/**
 * Extract just the body type from a response data interface.
 * The client returns only the body, not statusCode.
 */
export type ExtractResponseBody<T extends ResponseDataShape> = T['body'];
