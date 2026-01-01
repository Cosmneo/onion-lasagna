// Core types from shared contracts
export type {
  HttpMethod,
  BodyMethod,
  NoBodyMethod,
  RequestDataShape,
  EmptyRequestData,
  ResponseDataShape,
  ExtractResponseBody,
  RouteContract,
  RouterContractConfig,
} from '../../shared/contracts';
export { isRouteContract } from '../../shared/contracts';

// Client inference types
export type { InferClient, InferClientMethod, ConfigurableClient } from './infer-client.type';

// Client configuration
export type {
  ClientConfig,
  RetryConfig,
  CacheConfig,
  ResponseContext,
  RequestContext,
} from './client-config.type';

// Client error
export { ClientError } from './client-error.type';
