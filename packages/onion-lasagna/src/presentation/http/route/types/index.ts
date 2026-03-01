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
  // Schema field metadata
  SchemaFieldConfig,
  SchemaFieldInput,
  RouteFieldMeta,
  // Response types
  ResponseFieldConfig,
  ResponsesDefinition,
  ExtractSuccessSchema,
  // Documentation types
  SecurityRequirement,
  ExternalDocs,
  RouteDocumentation,
  // Route definition types
  RouteRequestDefinition,
  RouteDefinition,
  // Inference helpers
  InferRouteBody,
  InferRouteQuery,
  InferRoutePathParams,
  InferRouteHeaders,
  InferRouteContext,
  InferRouteResponse,
  InferRouteMethod,
  InferRoutePath,
} from './route-definition.type';

export type {
  RouterEntry,
  RouterConfig,
  RouterDefaults,
  RouterDefinition,
  FlattenRouter,
  RouterKeys,
  GetRoute,
  DeepMergeTwo,
  DeepMergeAll,
  PrettifyDeep,
} from './router-definition.type';
export { isRouteDefinition, isRouterDefinition, collectRoutes } from './router-definition.type';
