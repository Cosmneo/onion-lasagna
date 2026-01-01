import type { ClientConfig, ConfigurableClient, RequestDataShape } from './types';
import type { RouteContract, RouterContractConfig } from '../shared/contracts';
import { isRouteContract } from '../shared/contracts';
import { buildUrl } from './internals/build-url';
import { executeRequest } from './internals/execute-request';

/**
 * Internal state for the client.
 */
interface ClientState {
  config: ClientConfig;
}

/**
 * Creates a typed HTTP client from a router configuration.
 * The client provides type-safe methods that match the router structure.
 *
 * @typeParam T - The router configuration type
 * @param router - The router contract configuration
 * @param defaultConfig - Default configuration (baseUrl can be set later via configure())
 * @returns A typed client with methods matching the router structure
 *
 * @example
 * ```typescript
 * const router = defineRouterContract({
 *   projects: defineRouterContract({
 *     create: createProjectRoute,
 *     list: listProjectsRoute,
 *   }),
 * });
 *
 * const client = createTypedClient(router, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // Fully typed!
 * const project = await client.projects.create({
 *   body: { name: 'My Project' },
 * });
 * ```
 */
export function createTypedClient<T extends RouterContractConfig>(
  router: T,
  defaultConfig?: Partial<ClientConfig>,
): ConfigurableClient<T> {
  // Internal state
  const state: ClientState = {
    config: {
      baseUrl: '',
      ...defaultConfig,
    },
  };

  /**
   * Configure the client with new settings.
   * Settings are merged with existing configuration.
   */
  const configure = (newConfig: Partial<ClientConfig>): void => {
    state.config = {
      ...state.config,
      ...newConfig,
      // Deep merge headers
      headers: {
        ...state.config.headers,
        ...newConfig.headers,
      },
    };
  };

  /**
   * Create a method handler for a single route.
   */
  const createMethodHandler = (route: RouteContract) => {
    return async (params?: RequestDataShape): Promise<unknown> => {
      if (!state.config.baseUrl) {
        throw new Error(
          'Client not configured. Call client.configure({ baseUrl: "..." }) before making requests.',
        );
      }

      const { path, method } = route;
      const pathParams = params?.pathParams;
      const queryParams = params?.queryParams;
      const body = params?.body;

      const url = buildUrl(state.config.baseUrl, path, pathParams, queryParams);

      return executeRequest(url, method, body, state.config);
    };
  };

  /**
   * Recursively build the client object from the router configuration.
   */
  const buildClientObject = (routerConfig: RouterContractConfig): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(routerConfig)) {
      if (isRouteContract(value)) {
        // It's a route - create a method handler
        result[key] = createMethodHandler(value);
      } else {
        // It's a nested router - recurse
        result[key] = buildClientObject(value as RouterContractConfig);
      }
    }

    return result;
  };

  // Build the client object
  const clientObject = buildClientObject(router);

  // Add configure method
  (clientObject as Record<string, unknown>)['configure'] = configure;

  return clientObject as ConfigurableClient<T>;
}
