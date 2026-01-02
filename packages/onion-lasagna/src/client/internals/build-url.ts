/**
 * Build a complete URL from base URL, path, path parameters, and query parameters.
 *
 * @param baseUrl - The base URL (e.g., 'http://localhost:3000')
 * @param path - The route path (e.g., '/api/v1/projects/{projectId}')
 * @param pathParams - Path parameter values (e.g., { projectId: '123' })
 * @param queryParams - Query parameter values (e.g., { page: '1', pageSize: '20' })
 * @returns The complete URL string
 *
 * @example
 * ```typescript
 * buildUrl(
 *   'http://localhost:3000',
 *   '/api/v1/projects/{projectId}',
 *   { projectId: '123' },
 *   { include: 'tasks' }
 * );
 * // Returns: 'http://localhost:3000/api/v1/projects/123?include=tasks'
 * ```
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  pathParams?: Record<string, string>,
  queryParams?: Record<string, string | number | undefined>,
): string {
  // Replace path parameters
  let resolvedPath = path;
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(value));
    }
  }

  // Build the base URL
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  let url = `${normalizedBaseUrl}${normalizedPath}`;

  // Append query parameters (converting numbers to strings)
  if (queryParams) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Extract path parameter names from a path template.
 *
 * @param path - The route path (e.g., '/api/v1/projects/{projectId}/tasks/{taskId}')
 * @returns Array of parameter names (e.g., ['projectId', 'taskId'])
 */
export function extractPathParamNames(path: string): string[] {
  const matches = path.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((match) => match.slice(1, -1));
}

/**
 * Check if a path has any path parameters.
 */
export function hasPathParams(path: string): boolean {
  return /\{[^}]+\}/.test(path);
}
