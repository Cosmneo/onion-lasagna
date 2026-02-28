/**
 * @fileoverview Route type exports.
 * @module unified/route/types
 */

export type { HttpMethod, HttpStatusCode, ContentType } from './http.type';

export type { ExtractPathParamNames, PathParams, HasPathParams } from './path-params.type';
export {
  pathToRegex,
  getPathParamNames,
  hasPathParams,
  buildPath,
  normalizePath,
} from './path-params.type';

export type {
  // Request types
  RequestBodyConfig,
  QueryParamsConfig,
  PathParamsConfig,
  HeadersConfig,
  ContextConfig,
  RequestConfig,
  // Response types
  ResponseConfig,
  ResponsesConfig,
  // Documentation types
  SecurityRequirement,
  ExternalDocs,
  RouteDocumentation,
  // Route definition types
  RouteDefinitionInput,
  RouteDefinition,
  // Inference helpers
  InferRouteBody,
  InferRouteQuery,
  InferRoutePathParams,
  InferRouteHeaders,
  InferRouteContext,
  InferRouteResponse,
  InferRouteSuccessResponse,
  InferRouteMethod,
  InferRoutePath,
} from './route-definition.type';

export type {
  RouterEntry,
  RouterConfig,
  RouterDefinition,
  FlattenRouter,
  RouterKeys,
  GetRoute,
  DeepMergeTwo,
  DeepMergeAll,
  PrettifyDeep,
} from './router-definition.type';
export { isRouteDefinition, isRouterDefinition, collectRoutes } from './router-definition.type';
