import type {
  RouteContract,
  RouterContractConfig,
  RequestDataShape,
  ResponseDataShape,
  ExtractResponseBody,
} from '../../shared/contracts';

/**
 * Infer the method signature from a route contract.
 * The method accepts the request data shape and returns a Promise of the response body.
 */
export type InferClientMethod<TRoute extends RouteContract> =
  TRoute extends RouteContract<
    infer _TPath,
    infer _TMethod,
    infer TRequest extends RequestDataShape,
    infer TResponse extends ResponseDataShape
  >
    ? IsEmptyObject<TRequest> extends true
      ? () => Promise<ExtractResponseBody<TResponse>>
      : (params: TRequest) => Promise<ExtractResponseBody<TResponse>>
    : never;

/**
 * Helper type to check if an object type is empty (has no required properties).
 */
type IsEmptyObject<T> = keyof T extends never ? true : false;

/**
 * Infer a nested client object from a router contract configuration.
 * Recursively maps routes to client methods and nested routers to nested client objects.
 */
export type InferClient<TRouter extends RouterContractConfig> = {
  [K in keyof TRouter]: TRouter[K] extends RouteContract
    ? InferClientMethod<TRouter[K]>
    : TRouter[K] extends RouterContractConfig
      ? InferClient<TRouter[K]>
      : never;
};

/**
 * Client with configuration method.
 */
export type ConfigurableClient<TRouter extends RouterContractConfig> = InferClient<TRouter> & {
  /**
   * Configure the client with new settings.
   * Settings are merged with existing configuration.
   */
  configure: (config: ClientConfigInput) => void;
};

/**
 * Partial client configuration for the configure method.
 */
interface ClientConfigInput {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: RequestCredentials;
}
