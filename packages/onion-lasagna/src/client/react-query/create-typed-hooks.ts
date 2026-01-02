import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type {
  RouteContract,
  RouterContractConfig,
  RequestDataShape,
  ResponseDataShape,
} from '../../shared/contracts';
import { isRouteContract } from '../../shared/contracts';
import type { InferClient } from '../types';
import type { InferTypedHooks, InferQueryKeys, QueryKey } from './types';

/**
 * Creates typed React Query hooks from a client and router.
 *
 * @typeParam T - The router configuration type
 * @param client - The typed client created with createTypedClient
 * @param router - The typed router configuration
 * @returns Object containing typed hooks and query key factories
 *
 * @example
 * ```typescript
 * const client = createTypedClient(router, { baseUrl: 'http://localhost:3000' });
 * const { hooks, queryKeys } = createTypedHooks(client, router);
 *
 * // In a component:
 * function ProjectList() {
 *   const { data, isLoading } = hooks.projects.list.useQuery({
 *     queryParams: { page: '1' },
 *   });
 *
 *   const createMutation = hooks.projects.create.useMutation({
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
 *     },
 *   });
 * }
 * ```
 */
export function createTypedHooks<T extends RouterContractConfig>(
  client: InferClient<T>,
  router: T,
): { hooks: InferTypedHooks<T>; queryKeys: InferQueryKeys<T> } {
  const hooks = buildHooks(client, router, []);
  const queryKeys = buildQueryKeys(router, []);

  return {
    hooks: hooks as InferTypedHooks<T>,
    queryKeys: queryKeys as InferQueryKeys<T>,
  };
}

/**
 * Recursively build hooks object from router configuration.
 */
function buildHooks(
  client: Record<string, unknown>,
  routerConfig: RouterContractConfig,
  path: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routerConfig)) {
    const clientMethod = client[key];

    if (isRouteContract(value)) {
      // It's a route - create hook(s)
      const route = value as RouteContract;
      const fullPath = [...path, key];

      if (route.method === 'GET') {
        result[key] = {
          useQuery: createUseQueryHook(
            clientMethod as (params: RequestDataShape) => Promise<unknown>,
            fullPath,
          ),
        };
      } else {
        result[key] = {
          useMutation: createUseMutationHook(
            clientMethod as (params: RequestDataShape) => Promise<unknown>,
          ),
        };
      }
    } else {
      // It's a nested router - recurse
      result[key] = buildHooks(
        clientMethod as Record<string, unknown>,
        value as RouterContractConfig,
        [...path, key],
      );
    }
  }

  return result;
}

/**
 * Create a typed useQuery hook for a route.
 */
function createUseQueryHook<TRequest extends RequestDataShape, TResponse extends ResponseDataShape>(
  clientMethod: (params: TRequest) => Promise<TResponse['body']>,
  path: string[],
) {
  return (
    params: TRequest,
    options?: Omit<UseQueryOptions<TResponse['body']>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: buildQueryKey(path, params),
      queryFn: () => clientMethod(params),
      ...options,
    });
  };
}

/**
 * Create a typed useMutation hook for a route.
 */
function createUseMutationHook<
  TRequest extends RequestDataShape,
  TResponse extends ResponseDataShape,
>(clientMethod: (params: TRequest) => Promise<TResponse['body']>) {
  return (options?: Omit<UseMutationOptions<TResponse['body'], Error, TRequest>, 'mutationFn'>) => {
    return useMutation({
      mutationFn: clientMethod,
      ...options,
    });
  };
}

/**
 * Recursively build query key factories from router configuration.
 */
function buildQueryKeys(
  routerConfig: RouterContractConfig,
  path: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routerConfig)) {
    if (isRouteContract(value)) {
      // It's a route - create query key factory
      const fullPath = [...path, key];
      result[key] = (params?: RequestDataShape) => buildQueryKey(fullPath, params);
    } else {
      // It's a nested router - recurse
      result[key] = buildQueryKeys(value as RouterContractConfig, [...path, key]);
    }
  }

  return result;
}

/**
 * Build a query key from path and params.
 */
function buildQueryKey(path: string[], params?: RequestDataShape): QueryKey {
  if (!params) {
    return path;
  }

  // Include params in query key for proper cache invalidation
  const paramKey: Record<string, unknown> = {};

  if (params.pathParams) {
    paramKey['pathParams'] = params.pathParams;
  }
  if (params.queryParams) {
    paramKey['queryParams'] = params.queryParams;
  }
  if (params.body) {
    paramKey['body'] = params.body;
  }

  return [...path, paramKey];
}
