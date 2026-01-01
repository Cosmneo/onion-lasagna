/**
 * @fileoverview OpenAPI module exports.
 *
 * This module provides OpenAPI specification generation from router definitions.
 *
 * @module unified/openapi
 *
 * @example Generate OpenAPI spec
 * ```typescript
 * import { generateOpenAPI } from '@cosmneo/onion-lasagna/unified/openapi';
 * import { api } from './routes';
 *
 * const spec = generateOpenAPI(api, {
 *   info: {
 *     title: 'My API',
 *     version: '1.0.0',
 *   },
 * });
 * ```
 */

export { generateOpenAPI } from './generate';
export type {
  OpenAPIConfig,
  OpenAPIInfo,
  OpenAPIServer,
  OpenAPISecurityScheme,
  OpenAPIOAuthFlows,
  OpenAPISecurityRequirement,
  OpenAPIExternalDocs,
  OpenAPITag,
  OpenAPISpec,
  OpenAPIPaths,
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIMediaType,
  OpenAPIExample,
  OpenAPIResponses,
  OpenAPIResponse,
  OpenAPIComponents,
} from './types';
