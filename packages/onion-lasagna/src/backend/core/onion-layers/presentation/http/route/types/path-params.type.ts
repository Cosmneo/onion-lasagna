/**
 * @fileoverview Path parameter extraction types.
 *
 * These types enable TypeScript to extract path parameter names from
 * URL path templates at compile time, providing full type safety for
 * path parameters in routes.
 *
 * @module unified/route/types/path-params
 */

/**
 * Extracts parameter names from a path template string.
 *
 * Supports both `:param` and `{param}` syntaxes for maximum compatibility
 * with different routing conventions.
 *
 * @example Colon syntax (Express-style)
 * ```typescript
 * type Params = ExtractPathParamNames<'/users/:userId/posts/:postId'>;
 * // 'userId' | 'postId'
 * ```
 *
 * @example Brace syntax (OpenAPI-style)
 * ```typescript
 * type Params = ExtractPathParamNames<'/users/{userId}/posts/{postId}'>;
 * // 'userId' | 'postId'
 * ```
 *
 * @example No parameters
 * ```typescript
 * type Params = ExtractPathParamNames<'/users'>;
 * // never
 * ```
 */
export type ExtractPathParamNames<T extends string> =
  // Match :param followed by more path
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractPathParamNames<`/${Rest}`>
    : // Match :param at end
      T extends `${string}:${infer Param}`
      ? Param
      : // Match {param} followed by more path
        T extends `${string}{${infer Param}}/${infer Rest}`
        ? Param | ExtractPathParamNames<`/${Rest}`>
        : // Match {param} at end
          T extends `${string}{${infer Param}}`
          ? Param
          : never;

/**
 * Creates an object type with all path parameters as string properties.
 *
 * @example
 * ```typescript
 * type Params = PathParams<'/projects/:projectId/tasks/:taskId'>;
 * // { projectId: string; taskId: string }
 *
 * type NoParams = PathParams<'/projects'>;
 * // Record<string, never> (empty object type)
 * ```
 */
export type PathParams<T extends string> =
  ExtractPathParamNames<T> extends never
    ? Record<string, never>
    : Record<ExtractPathParamNames<T>, string>;

/**
 * Checks if a path has any parameters.
 *
 * @example
 * ```typescript
 * type HasParams = HasPathParams<'/users/:id'>; // true
 * type NoParams = HasPathParams<'/users'>; // false
 * ```
 */
export type HasPathParams<T extends string> = ExtractPathParamNames<T> extends never ? false : true;

/**
 * Converts a path template with parameters to a regex pattern.
 * This is used internally for route matching.
 *
 * @example
 * ```typescript
 * pathToRegex('/users/:id/posts/:postId')
 * // /^\/users\/([^\/]+)\/posts\/([^\/]+)\/?$/
 * ```
 */
export function pathToRegex(path: string): RegExp {
  const pattern = path
    // Escape special regex characters except : and {}
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Replace :param with capture group
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)')
    // Replace {param} with capture group
    .replace(/\\\{([a-zA-Z_][a-zA-Z0-9_]*)\\\}/g, '([^/]+)');

  return new RegExp(`^${pattern}/?$`);
}

/**
 * Extracts parameter names from a path string at runtime.
 *
 * @example
 * ```typescript
 * getPathParamNames('/users/:userId/posts/:postId')
 * // ['userId', 'postId']
 * ```
 */
export function getPathParamNames(path: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- regex capture group always exists
  const colonParams = [...path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- regex capture group always exists
  const braceParams = [...path.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map((m) => m[1]!);
  return [...colonParams, ...braceParams];
}

/**
 * Checks if a path has any parameters at runtime.
 */
export function hasPathParams(path: string): boolean {
  return /:([a-zA-Z_][a-zA-Z0-9_]*)/.test(path) || /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/.test(path);
}

/**
 * Replaces path parameters with actual values.
 *
 * @example
 * ```typescript
 * buildPath('/users/:userId/posts/:postId', { userId: '123', postId: '456' })
 * // '/users/123/posts/456'
 *
 * buildPath('/users/{userId}', { userId: '123' })
 * // '/users/123'
 * ```
 */
export function buildPath(template: string, params: Record<string, string>): string {
  let result = template;

  // Replace :param syntax
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(value));
    result = result.replace(`{${key}}`, encodeURIComponent(value));
  }

  return result;
}

/**
 * Normalizes a path template to use consistent :param syntax.
 *
 * @example
 * ```typescript
 * normalizePath('/users/{userId}')
 * // '/users/:userId'
 * ```
 */
export function normalizePath(path: string): string {
  return path.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, ':$1');
}
