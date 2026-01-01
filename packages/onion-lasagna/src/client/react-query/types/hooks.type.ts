/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  UseQueryResult,
  UseMutationResult,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import type { RouteContract, RouterContractConfig, RequestDataShape, ResponseDataShape } from '../../../shared/contracts';
import type { ExtractResponseBody } from '../../types';

/**
 * Typed useQuery hook for GET routes.
 */
export type TypedUseQuery<
  TRequest extends RequestDataShape,
  TResponse extends ResponseDataShape,
> = (
  params: TRequest,
  options?: Omit<UseQueryOptions<ExtractResponseBody<TResponse>>, 'queryKey' | 'queryFn'>,
) => UseQueryResult<ExtractResponseBody<TResponse>>;

/**
 * Typed useMutation hook for POST/PUT/PATCH/DELETE routes.
 */
export type TypedUseMutation<
  TRequest extends RequestDataShape,
  TResponse extends ResponseDataShape,
> = (
  options?: Omit<
    UseMutationOptions<ExtractResponseBody<TResponse>, Error, TRequest>,
    'mutationFn'
  >,
) => UseMutationResult<ExtractResponseBody<TResponse>, Error, TRequest>;

/**
 * Infer hook type from a route contract.
 * GET routes get useQuery, other methods get useMutation.
 */
export type InferRouteHook<TRoute extends RouteContract> =
  TRoute extends RouteContract<
    any,
    infer TMethod,
    infer TRequest extends RequestDataShape,
    infer TResponse extends ResponseDataShape
  >
    ? TMethod extends 'GET'
      ? { useQuery: TypedUseQuery<TRequest, TResponse> }
      : { useMutation: TypedUseMutation<TRequest, TResponse> }
    : never;

/**
 * Infer hooks structure from a router contract.
 */
export type InferTypedHooks<TRouter extends RouterContractConfig> = {
  [K in keyof TRouter]: TRouter[K] extends RouteContract
    ? InferRouteHook<TRouter[K]>
    : TRouter[K] extends RouterContractConfig
      ? InferTypedHooks<TRouter[K]>
      : never;
};

/**
 * Query key for a route.
 */
export type QueryKey = readonly unknown[];

/**
 * Query key factory for a single route.
 */
export type RouteQueryKeyFactory<TRequest extends RequestDataShape> = (
  params?: TRequest,
) => QueryKey;

/**
 * Infer query key factory from a route contract.
 */
export type InferRouteQueryKeyFactory<TRoute extends RouteContract> =
  TRoute extends RouteContract<any, any, infer TRequest extends RequestDataShape, any>
    ? RouteQueryKeyFactory<TRequest>
    : never;

/**
 * Infer query keys structure from a router contract.
 */
export type InferQueryKeys<TRouter extends RouterContractConfig> = {
  [K in keyof TRouter]: TRouter[K] extends RouteContract
    ? InferRouteQueryKeyFactory<TRouter[K]>
    : TRouter[K] extends RouterContractConfig
      ? InferQueryKeys<TRouter[K]>
      : never;
};

/**
 * Combined hooks and query keys for a router.
 */
export interface TypedHooksResult<TRouter extends RouterContractConfig> {
  hooks: InferTypedHooks<TRouter>;
  queryKeys: InferQueryKeys<TRouter>;
}
