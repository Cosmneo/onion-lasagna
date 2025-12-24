import type { ExecutableController, ResolvedRoute, RouteDefinition, RouteInput } from './types';

/** Matches path placeholders like {id} or {userId} */
const PLACEHOLDER_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** Matches a single placeholder segment like {id} */
const SINGLE_PLACEHOLDER_PATTERN = /^\{([A-Za-z_][A-Za-z0-9_]*)\}$/;

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes an incoming request path to improve route matching robustness.
 *
 * - Ensures the path starts with '/'
 * - Strips query/hash suffixes (defensive)
 * - Removes trailing slash (except for '/')
 *
 * @example
 * normalizeRequestPath('/users/123/') // => '/users/123'
 * normalizeRequestPath('users/123')   // => '/users/123'
 */
function normalizeRequestPath(path: string): string {
  const withoutQueryOrHash = path.split('?')[0]?.split('#')[0] ?? path;
  let normalized = withoutQueryOrHash.trim();

  if (normalized.length === 0) {
    return '/';
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Extracts placeholder names from a service path.
 * @example getPlaceholderNames('/users/{id}/orders/{orderId}') → ['id', 'orderId']
 */
function getPlaceholderNames(servicePath: string): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state for fresh matching
  PLACEHOLDER_PATTERN.lastIndex = 0;

  while ((match = PLACEHOLDER_PATTERN.exec(servicePath)) !== null) {
    const name = match[1];
    if (name) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Compares two routes for sorting by specificity.
 * More specific routes should come first to match before generic ones.
 *
 * Priority order:
 * 1. Fewer placeholders (static routes before dynamic)
 * 2. More path segments (deeper paths are more specific)
 * 3. Longer path string (tiebreaker)
 */
function compareBySpecificity(a: RouteDefinition, b: RouteDefinition): number {
  // 1. Fewer placeholders = more specific
  const placeholderDiff = a.paramNames.length - b.paramNames.length;
  if (placeholderDiff !== 0) return placeholderDiff;

  // 2. More segments = more specific
  const aSegmentCount = a.metadata.servicePath.split('/').filter(Boolean).length;
  const bSegmentCount = b.metadata.servicePath.split('/').filter(Boolean).length;
  const segmentDiff = bSegmentCount - aSegmentCount;
  if (segmentDiff !== 0) return segmentDiff;

  // 3. Longer path = more specific (tiebreaker)
  return b.metadata.servicePath.length - a.metadata.servicePath.length;
}

/**
 * Converts a path segment to its regex equivalent.
 * Static segments are escaped, placeholders become named capture groups.
 */
function segmentToPattern(segment: string): string {
  const placeholderMatch = segment.match(SINGLE_PLACEHOLDER_PATTERN);

  if (placeholderMatch?.[1]) {
    const paramName = placeholderMatch[1];
    return `(?<${paramName}>[^/]+)`;
  }

  return escapeRegex(segment);
}

/**
 * Converts a service path with placeholders to a regex pattern.
 *
 * @example
 * createRoutePattern('/users/{id}')
 * // → /^\/users\/(?<id>[^/]+)$/
 *
 * createRoutePattern('/users/{userId}/orders/{orderId}')
 * // → /^\/users\/(?<userId>[^/]+)\/orders\/(?<orderId>[^/]+)$/
 */
export function createRoutePattern(servicePath: string): RegExp {
  const segments = servicePath.split('/').filter(Boolean);
  const patternParts = segments.map(segmentToPattern);

  return new RegExp(`^/${patternParts.join('/')}$`);
}

/**
 * Extracts path parameters from a URL using a matched route's pattern.
 *
 * @example
 * const route = { pattern: /^\/users\/(?<id>[^/]+)$/, paramNames: ['id'], ... };
 * extractPathParams(route, '/users/123') → { id: '123' }
 */
export function extractPathParams<TController extends ExecutableController>(
  route: RouteDefinition<TController>,
  path: string,
): Record<string, string> {
  const match = route.pattern.exec(path);

  if (!match) {
    return {};
  }

  // Modern Node.js: use named capture groups directly
  if (match.groups && Object.keys(match.groups).length > 0) {
    const entries = Object.entries(match.groups).filter(
      ([, value]) => typeof value === 'string' && value.length > 0,
    );
    return Object.fromEntries(entries) as Record<string, string>;
  }

  // Fallback: map positional captures to param names
  if (route.paramNames.length === 0) {
    return {};
  }

  const capturedValues = match.slice(1);
  const entries = route.paramNames
    .map((name, index) => [name, capturedValues[index]] as const)
    .filter(([, value]) => typeof value === 'string');

  return Object.fromEntries(entries) as Record<string, string>;
}

/**
 * Compiles route inputs into RouteDefinitions with regex patterns.
 * Routes are automatically sorted by specificity.
 *
 * @example
 * const routes = createRoutes([
 *   { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *   { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
 * ]);
 */
export function createRoutes<TController extends ExecutableController>(
  inputs: RouteInput<TController>[],
): RouteDefinition<TController>[] {
  const compiledRoutes = inputs.map((input) => ({
    ...input,
    paramNames: getPlaceholderNames(input.metadata.servicePath),
    pattern: createRoutePattern(input.metadata.servicePath),
  }));

  return compiledRoutes.sort(compareBySpecificity);
}

/**
 * Creates a resolver that finds the matching route and extracts path parameters.
 * This is the most flexible resolver - returns full route info.
 *
 * @example
 * const resolve = createRouteMatchResolver(routes);
 * const result = resolve('/users/123', 'GET');
 * if (result) {
 *   console.log(result.route.metadata.servicePath); // '/users/{id}'
 *   console.log(result.pathParams); // { id: '123' }
 * }
 */
export function createRouteMatchResolver<TController extends ExecutableController>(
  routes: RouteDefinition<TController>[],
): (path: string, method: string) => ResolvedRoute<TController> | undefined {
  // Pre-index routes by HTTP method for O(1) method lookup
  const routesByMethod = new Map<string, RouteDefinition<TController>[]>();

  for (const route of routes) {
    const methodKey = route.metadata.method.toUpperCase();
    const existingRoutes = routesByMethod.get(methodKey) ?? [];
    existingRoutes.push(route);
    routesByMethod.set(methodKey, existingRoutes);
  }

  // Ensure each method bucket maintains specificity order
  for (const [methodKey, methodRoutes] of routesByMethod) {
    routesByMethod.set(methodKey, [...methodRoutes].sort(compareBySpecificity));
  }

  // Return the resolver function
  return (path: string, method: string): ResolvedRoute<TController> | undefined => {
    const normalizedPath = normalizeRequestPath(path);
    const candidates = routesByMethod.get(method.toUpperCase()) ?? [];
    const matchedRoute = candidates.find((route) => route.pattern.test(normalizedPath));

    if (!matchedRoute) {
      return undefined;
    }

    return {
      route: matchedRoute,
      pathParams: extractPathParams(matchedRoute, normalizedPath),
    };
  };
}

/**
 * Creates a simple resolver that returns only the controller (no path params).
 * Use when you only need the controller and don't need extracted parameters.
 *
 * @example
 * const resolveController = createRouteResolver(routes);
 * const controller = resolveController('/users/123', 'GET');
 */
export function createRouteResolver<TController extends ExecutableController>(
  routes: RouteDefinition<TController>[],
): (path: string, method: string) => TController | undefined {
  const resolveRoute = createRouteMatchResolver(routes);

  return (path: string, method: string): TController | undefined => {
    return resolveRoute(path, method)?.route.controller;
  };
}

/**
 * Creates routes and resolvers in one call - the recommended entry point.
 *
 * Supports path parameters like {id} and automatically sorts routes by specificity
 * to ensure correct matching (e.g., /users/me matches before /users/{id}).
 *
 * @example
 * ```typescript
 * // 1. Define your routes
 * const { routes, resolveRoute } = createRoutingMap([
 *   { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *   { metadata: { servicePath: '/users/me', method: 'GET' }, controller: getCurrentUserController },
 *   { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserByIdController },
 * ]);
 *
 * // 2. Resolve incoming request
 * const resolved = resolveRoute('/users/123', 'GET');
 * if (resolved) {
 *   console.log(resolved.pathParams); // { id: '123' }
 *   await resolved.route.controller.execute(request);
 * }
 * ```
 */
export function createRoutingMap<TController extends ExecutableController>(
  inputs: RouteInput<TController>[],
): {
  routes: RouteDefinition<TController>[];
  resolveRoute: (path: string, method: string) => ResolvedRoute<TController> | undefined;
  resolveController: (path: string, method: string) => TController | undefined;
} {
  const routes = createRoutes(inputs);
  const resolveRoute = createRouteMatchResolver(routes);
  const resolveController = createRouteResolver(routes);

  return { routes, resolveRoute, resolveController };
}
