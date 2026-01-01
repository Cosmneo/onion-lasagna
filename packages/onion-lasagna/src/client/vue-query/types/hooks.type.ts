/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  UseQueryReturnType,
  UseMutationReturnType,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/vue-query';
import type { RouteContract, RouterContractConfig, RequestDataShape, ResponseDataShape } from '../../../shared/contracts';
import type { ExtractResponseBody } from '../../types';

/**
 * Typed useQuery composable for GET routes.
 */
export type TypedUseQuery<
  TRequest extends RequestDataShape,
  TResponse extends ResponseDataShape,
> = (
  params: TRequest,
  options?: Omit<UseQueryOptions<ExtractResponseBody<TResponse>>, 'queryKey' | 'queryFn'>,
) => UseQueryReturnType<ExtractResponseBody<TResponse>, Error>;

/**
 * Typed useMutation composable for POST/PUT/PATCH/DELETE routes.
 */
export type TypedUseMutation<
  TRequest extends RequestDataShape,
  TResponse extends ResponseDataShape,
> = (
  options?: Omit<
    UseMutationOptions<ExtractResponseBody<TResponse>, Error, TRequest>,
    'mutationFn'
  >,
) => UseMutationReturnType<ExtractResponseBody<TResponse>, Error, TRequest, unknown>;

/**
 * Infer composable type from a route contract.
 * GET routes get useQuery, other methods get useMutation.
 */
export type InferRouteComposable<TRoute extends RouteContract> =
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
 * Infer composables structure from a router contract.
 */
export type InferTypedComposables<TRouter extends RouterContractConfig> = {
  [K in keyof TRouter]: TRouter[K] extends RouteContract
    ? InferRouteComposable<TRouter[K]>
    : TRouter[K] extends RouterContractConfig
      ? InferTypedComposables<TRouter[K]>
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
 * Combined composables and query keys for a router.
 */
export interface TypedComposablesResult<TRouter extends RouterContractConfig> {
  composables: InferTypedComposables<TRouter>;
  queryKeys: InferQueryKeys<TRouter>;
}
