/**
 * Base shape for request data interfaces.
 * Matches the existing *RequestData interface pattern used in DTOs.
 *
 * @example
 * ```typescript
 * interface CreateProjectRequestData {
 *   body: {
 *     name: string;
 *     description?: string;
 *   };
 * }
 *
 * interface GetProjectRequestData {
 *   pathParams: {
 *     projectId: string;
 *   };
 * }
 *
 * interface ListProjectsRequestData {
 *   queryParams: {
 *     page?: string;
 *     pageSize?: string;
 *   };
 * }
 * ```
 */
export interface RequestDataShape {
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string | undefined>;
  body?: unknown;
}

/**
 * Empty request data for routes that don't require any input.
 */
export type EmptyRequestData = Record<string, never>;
